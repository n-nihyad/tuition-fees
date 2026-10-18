import asyncio
import os
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
import pytest
from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.payment.domain.models import Base, Payment, PaymentStatus, TuitionFee, Wallet
from app.payment.infrastructure.auth import get_payer_profile, oauth2_scheme
from app.payment.infrastructure.otp import otp_digest
from app.payment.infrastructure.user_service import ProfileResponse
from app.payment.presentation.routes import get_redis, router
from app.shared.database.session import get_session

TEST_DATABASE_URL = os.getenv("PAYMENT_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="Set PAYMENT_TEST_DATABASE_URL to an isolated PostgreSQL test database.",
)


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.guard = asyncio.Lock()

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def incr(self, key: str) -> int:
        async with self.guard:
            self.values[key] = str(int(self.values.get(key, "0")) + 1)
            return int(self.values[key])

    async def expire(self, key: str, _: int) -> None:
        if key not in self.values:
            raise AssertionError(f"Cannot set TTL on missing Redis key {key}")

    async def set(
        self,
        key: str,
        value: str,
        *,
        nx: bool,
        ex: int,
    ) -> bool:
        async with self.guard:
            if nx and key in self.values:
                return False
            self.values[key] = value
            return True

    async def eval(self, script: str, numkeys: int, *values: str) -> int:
        keys = values[:numkeys]
        args = values[numkeys:]
        async with self.guard:
            if "active_payment" in script:
                active_payment = self.values.get(keys[0])
                if active_payment != args[0] or self.values.get(keys[1]) != args[1]:
                    return 0
                if keys[2] in self.values:
                    return -1
                self.values[keys[2]] = args[2]
                return 1
            if "NX" in script:
                if keys[0] in self.values:
                    return 0
                self.values[keys[0]] = args[0]
                self.values[keys[1]] = args[1]
                return 1
            if self.values.get(keys[0]) == args[0]:
                del self.values[keys[0]]
                return 1
            return 0

    async def delete(self, *keys: str) -> int:
        async with self.guard:
            count = 0
            for key in keys:
                if self.values.pop(key, None) is not None:
                    count += 1
            return count


class FakeAuditEvents:
    async def insert_one(self, _: dict[str, object]) -> None:
        return None


@pytest.mark.asyncio
@pytest.mark.parametrize("conflict", ["same_wallet"])
async def test_concurrent_confirmations_commit_once(
    monkeypatch: pytest.MonkeyPatch,
    conflict: str,
) -> None:
    assert TEST_DATABASE_URL is not None
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    payer_ids = [
        uuid.UUID("11111111-1111-4111-8111-111111111111"),
        uuid.UUID("33333333-3333-4333-8333-333333333333"),
    ]
    fee_ids = [
        uuid.UUID("22222222-2222-4222-8222-222222222222"),
        uuid.UUID("44444444-4444-4444-8444-444444444444"),
    ]
    payment_ids = [
        uuid.UUID("55555555-5555-4555-8555-555555555555"),
        uuid.UUID("66666666-6666-4666-8666-666666666666"),
    ]
    codes = ["123456", "654321"]
    redis = FakeRedis()
    for index, payment_id in enumerate(payment_ids):
        redis.values[f"otp:active:{codes[index]}"] = str(payment_id)
        redis.values[f"otp:payment:{payment_id}"] = otp_digest(
            payment_id,
            codes[index],
        )

    async with session_factory.begin() as session:
        active_payers = payer_ids if conflict == "same_fee" else payer_ids[:1]
        session.add_all(
            [
                Wallet(user_id=payer_id, available_balance=Decimal("850000.00"))
                for payer_id in active_payers
            ]
        )
        session.add_all(
            [
                TuitionFee(
                    id=fee_id,
                    student_id=f"SV{index + 1:03d}",
                    student_name=f"Student {index + 1}",
                    amount=Decimal("850000.00"),
                )
                for index, fee_id in enumerate(fee_ids)
            ]
        )
        await session.flush()
        session.add_all(
            [
                Payment(
                    id=payment_id,
                    idempotency_key=str(payment_id),
                    terms_accepted_at=datetime.now(UTC),
                    created_at=datetime.now(UTC),
                    payer_id=(
                        payer_ids[index] if conflict == "same_fee" else payer_ids[0]
                    ),
                    tuition_fee_id=(
                        fee_ids[0] if conflict == "same_fee" else fee_ids[index]
                    ),
                    amount=Decimal("850000.00"),
                    status=PaymentStatus.PENDING_OTP,
                    otp_expires_at=datetime.now(UTC) + timedelta(minutes=4),
                )
                for index, payment_id in enumerate(payment_ids)
            ]
        )

    async def provide_session():
        async with session_factory() as session:
            yield session

    async def provide_redis() -> FakeRedis:
        return redis

    async def provide_profile(token: str = Depends(oauth2_scheme)):
        payer_id = (
            payer_ids[0]
            if conflict == "same_wallet" or token == "payer-one"
            else payer_ids[1]
        )
        return payer_id, ProfileResponse(
            fullName="Test Payer",
            phone="0900000000",
            email="payer@example.test",
            role="student",
        )

    app = FastAPI()
    app.include_router(router)
    app.state.audit_events = FakeAuditEvents()
    app.dependency_overrides[get_session] = provide_session
    app.dependency_overrides[get_redis] = provide_redis
    app.dependency_overrides[get_payer_profile] = provide_profile

    async def send_confirmation_email(*_: object) -> None:
        return None

    monkeypatch.setattr(
        "app.payment.presentation.routes.send_confirmation_email",
        send_confirmation_email,
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        responses = await asyncio.gather(
            *[
                client.post(
                    f"/api/payments/{payment_id}/confirm",
                    headers={
                        "Authorization": (
                            "Bearer payer-one" if index == 0 else "Bearer payer-two"
                        )
                    },
                    json={"otp": codes[index]},
                )
                for index, payment_id in enumerate(payment_ids)
            ]
        )

    assert sorted(response.status_code for response in responses) == [200, 409]
    async with session_factory() as session:
        wallets = list((await session.scalars(select(Wallet))).all())
        fees = list((await session.scalars(select(TuitionFee))).all())
        payments = list((await session.scalars(select(Payment))).all())
    assert sum(
        (wallet.available_balance for wallet in wallets), Decimal("0")
    ) == Decimal("850000.00" if conflict == "same_fee" else "0.00")
    assert sum(fee.is_paid for fee in fees) == 1
    assert sum(payment.status == PaymentStatus.SUCCEEDED for payment in payments) == 1

    await engine.dispose()


@pytest.mark.asyncio
async def test_create_confirm_wallet_fee_and_history_are_integrated(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert TEST_DATABASE_URL is not None
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    payer_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    fee_id = uuid.UUID("22222222-2222-4222-8222-222222222222")
    async with session_factory.begin() as session:
        session.add(Wallet(user_id=payer_id, available_balance=Decimal("1000000.00")))
        session.add(
            TuitionFee(
                id=fee_id,
                student_id="SV001",
                student_name="Tran Thi B",
                amount=Decimal("850000.00"),
            )
        )
        await session.flush()

    redis = FakeRedis()
    app = FastAPI()
    app.include_router(router)
    app.state.audit_events = FakeAuditEvents()

    async def provide_session():
        async with session_factory() as session:
            yield session

    async def provide_redis() -> FakeRedis:
        return redis

    async def provide_profile():
        return payer_id, ProfileResponse(
            fullName="Nguyen Van A",
            phone="0900000000",
            email="payer@example.test",
            role="student",
        )

    delivered: dict[str, str] = {}
    monkeypatch.setattr(
        "app.payment.presentation.routes.settings.smtp_host",
        "smtp.example.test",
    )
    monkeypatch.setattr(
        "app.payment.presentation.routes.settings.smtp_from",
        "noreply@example.test",
    )

    async def send_otp_email(recipient: str, code: str, _: uuid.UUID) -> None:
        delivered.update(email=recipient, otp=code)

    async def send_confirmation_email(*_: object) -> None:
        return None

    app.dependency_overrides[get_session] = provide_session
    app.dependency_overrides[get_redis] = provide_redis
    app.dependency_overrides[get_payer_profile] = provide_profile
    monkeypatch.setattr(
        "app.payment.presentation.routes.send_otp_email",
        send_otp_email,
    )
    monkeypatch.setattr(
        "app.payment.presentation.routes.send_confirmation_email",
        send_confirmation_email,
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        create_response = await client.post(
            "/api/payments",
            json={"studentId": "SV001", "agreeTerms": True},
        )
        payment_id = create_response.json()["id"]
        wrong_code = "000000" if delivered["otp"] != "000000" else "111111"
        invalid_response = await client.post(
            f"/api/payments/{payment_id}/confirm", json={"otp": wrong_code}
        )
        assert invalid_response.status_code == 400
        assert invalid_response.headers["X-OTP-Attempts-Remaining"] == "4"
        confirm_response = await client.post(
            f"/api/payments/{payment_id}/confirm",
            json={"otp": delivered["otp"]},
        )
        replay_response = await client.post(
            f"/api/payments/{payment_id}/confirm",
            json={"otp": delivered["otp"]},
        )
        wallet_response = await client.get("/api/wallet")
        fee_response = await client.get("/api/tuition/fees/SV001")
        history_response = await client.get("/api/payments")

    assert create_response.status_code == 201
    assert create_response.json()["status"] == "pending_otp"
    assert delivered["email"] == "payer@example.test"
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "succeeded"
    assert replay_response.status_code == 200
    assert replay_response.json()["id"] == payment_id
    assert confirm_response.json()["balanceBefore"] == "1000000.00"
    assert wallet_response.json()["availableBalance"] == "150000.00"
    assert fee_response.json()["isPaid"] is True
    assert history_response.json()["total"] == 1
    await engine.dispose()


@pytest.mark.asyncio
async def test_database_rejects_duplicate_open_payment_and_invalid_balance():
    from sqlalchemy.exc import IntegrityError

    engine = create_async_engine(TEST_DATABASE_URL)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    payer_id, fee_id = uuid.uuid4(), uuid.uuid4()
    now = datetime.now(UTC)

    def attempt(**changes):
        values = dict(
            id=uuid.uuid4(),
            payer_id=payer_id,
            tuition_fee_id=fee_id,
            amount=Decimal("100.00"),
            status=PaymentStatus.PENDING_OTP,
            created_at=now,
            otp_expires_at=now + timedelta(minutes=5),
            terms_accepted_at=now,
            idempotency_key=str(uuid.uuid4()),
        )
        values.update(changes)
        return Payment(**values)

    try:
        async with factory.begin() as session:
            session.add(Wallet(user_id=payer_id, available_balance=Decimal("200.00")))
            session.add(
                TuitionFee(
                    id=fee_id,
                    mssv="SV001",
                    full_name="Student",
                    name="Semester 1",
                    amount=100,
                )
            )
            # Nonunique MSSV is intentional.
            session.add(
                TuitionFee(
                    mssv="SV001", full_name="Student", name="Semester 2", amount=200
                )
            )
            await session.flush()
            session.add(attempt(idempotency_key="first"))
        with pytest.raises(IntegrityError):
            async with factory.begin() as session:
                session.add(attempt())
        async with factory.begin() as session:
            payment = await session.scalar(select(Payment))
            payment.status = PaymentStatus.EXPIRED
            payment.completed_at = now + timedelta(minutes=5)
        with pytest.raises(IntegrityError):
            async with factory.begin() as session:
                session.add(attempt(idempotency_key="first"))
        with pytest.raises(IntegrityError):
            async with factory.begin() as session:
                session.add(
                    attempt(
                        status=PaymentStatus.SUCCEEDED,
                        completed_at=now,
                        balance_before=Decimal("99.00"),
                    )
                )
        with pytest.raises(IntegrityError):
            async with factory.begin() as session:
                session.add(attempt(otp_expires_at=now + timedelta(minutes=6)))
        async with factory.begin() as session:
            session.add(
                attempt(
                    status=PaymentStatus.SUCCEEDED,
                    completed_at=now,
                    balance_before=Decimal("200.00"),
                )
            )
        with pytest.raises(IntegrityError):
            async with factory.begin() as session:
                session.add(
                    attempt(
                        status=PaymentStatus.SUCCEEDED,
                        completed_at=now,
                        balance_before=Decimal("200.00"),
                    )
                )
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_history_persists_expiry_at_deadline_before_pagination():
    engine = create_async_engine(TEST_DATABASE_URL)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    payer_id, other_id = uuid.uuid4(), uuid.uuid4()
    now = datetime.now(UTC)
    cases = [
        ("overdue", payer_id, PaymentStatus.PENDING_OTP, now - timedelta(minutes=10)),
        ("active", payer_id, PaymentStatus.PENDING_OTP, now - timedelta(minutes=1)),
        ("success", payer_id, PaymentStatus.SUCCEEDED, now - timedelta(minutes=10)),
        ("failed", payer_id, PaymentStatus.FAILED, now - timedelta(minutes=10)),
        ("expired", payer_id, PaymentStatus.EXPIRED, now - timedelta(minutes=10)),
        ("other", other_id, PaymentStatus.PENDING_OTP, now - timedelta(minutes=10)),
    ]
    ids = {}
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)
        async with factory.begin() as session:
            session.add_all(
                [
                    Wallet(user_id=value, available_balance=1000)
                    for value in (payer_id, other_id)
                ]
            )
            for name, payer, status, created in cases:
                fee_id, payment_id = uuid.uuid4(), uuid.uuid4()
                ids[name] = payment_id
                session.add(
                    TuitionFee(
                        id=fee_id,
                        mssv=name,
                        full_name="Student",
                        name=name,
                        amount=100,
                        status="paid"
                        if status == PaymentStatus.SUCCEEDED
                        else "unpaid",
                    )
                )
                await session.flush()
                session.add(
                    Payment(
                        id=payment_id,
                        payer_id=payer,
                        tuition_fee_id=fee_id,
                        amount=100,
                        status=status,
                        created_at=created,
                        terms_accepted_at=created,
                        otp_expires_at=created + timedelta(minutes=5),
                        completed_at=None
                        if status == PaymentStatus.PENDING_OTP
                        else now,
                        balance_before=1000
                        if status == PaymentStatus.SUCCEEDED
                        else None,
                        idempotency_key=name,
                    )
                )
        app = FastAPI()
        app.include_router(router)

        async def provide_session():
            async with factory() as session:
                yield session

        app.dependency_overrides[get_session] = provide_session
        app.dependency_overrides[get_payer_profile] = lambda: (payer_id, None)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            first = await client.get("/api/payments", params={"limit": 1, "offset": 0})
            assert first.status_code == 200
            assert first.json()["total"] == 5
            assert first.json()["statusCounts"] == {
                "pending_otp": 1,
                "succeeded": 1,
                "failed": 1,
                "expired": 2,
            }
            assert first.json()["items"][0]["id"] == str(ids["active"])
            restored = await client.get("/api/payments", params={"paymentId": str(ids["active"]), "limit": 1})
            assert restored.json()["total"] == 1
            assert restored.json()["items"][0]["id"] == str(ids["active"])
            foreign = await client.get("/api/payments", params={"paymentId": str(ids["other"])})
            assert foreign.json()["total"] == 0
            assert foreign.json()["items"] == []
            assert (await client.get("/api/payments", params={"paymentId": "invalid"})).status_code == 422
            # Expire all own overdue attempts, even outside the requested page.
            async with factory() as session:
                overdue = await session.get(Payment, ids["overdue"])
                assert overdue.status == PaymentStatus.EXPIRED
                assert (
                    overdue.completed_at
                    == overdue.otp_expires_at
                    == now - timedelta(minutes=5)
                )
            second = await client.get("/api/payments", params={"limit": 100})
            assert second.status_code == 200
            returned = {item["id"]: item for item in second.json()["items"]}
            assert returned[str(ids["overdue"])]["status"] == "expired"
            assert datetime.fromisoformat(
                returned[str(ids["overdue"])]["completedAt"]
            ) == now - timedelta(minutes=5)
            assert returned[str(ids["success"])]["status"] == "succeeded"
            filtered = await client.get(
                "/api/payments", params={"status": "expired", "limit": 1}
            )
            assert filtered.status_code == 200
            assert filtered.json()["total"] == 2
            assert len(filtered.json()["items"]) == 1
            assert filtered.json()["items"][0]["status"] == "expired"
            assert filtered.json()["statusCounts"]["pending_otp"] == 1
            searched = await client.get("/api/payments", params={"search": "ACTIVE"})
            assert searched.json()["total"] == 1
            assert searched.json()["items"][0]["id"] == str(ids["active"])
            # Literal wildcard characters must not match every row.
            assert (await client.get("/api/payments", params={"search": "%"})).json()[
                "total"
            ] == 0
            assert (
                await client.get("/api/payments", params={"search": "other"})
            ).json()["total"] == 0
            invalid = await client.get(
                "/api/payments",
                params={"dateFrom": "2026-10-20", "dateTo": "2026-10-01"},
            )
            assert invalid.status_code == 422
            future = (now + timedelta(days=1)).date().isoformat()
            assert (
                await client.get("/api/payments", params={"dateFrom": future})
            ).json()["total"] == 0
        async with factory() as session:
            payments = {
                item.id: item for item in (await session.scalars(select(Payment))).all()
            }
            assert payments[ids["overdue"]].completed_at == now - timedelta(minutes=5)
            assert payments[ids["active"]].status == PaymentStatus.PENDING_OTP
            assert payments[ids["other"]].status == PaymentStatus.PENDING_OTP
            assert payments[ids["success"]].completed_at == now
            assert payments[ids["failed"]].status == PaymentStatus.FAILED
            assert payments[ids["expired"]].completed_at == now
            assert all(
                wallet.available_balance == Decimal("1000.00")
                for wallet in (await session.scalars(select(Wallet))).all()
            )
    finally:
        await engine.dispose()
