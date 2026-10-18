from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from redis.exceptions import RedisError

from app.payment.domain.models import Payment, PaymentStatus, TuitionFee, Wallet
from app.payment.infrastructure.coordination import distributed_locks
from app.payment.presentation import routes
from app.payment.presentation.schemas import ConfirmPaymentRequest, CreatePaymentRequest


@pytest.fixture
def records():
    now = datetime.now(UTC)
    fee = TuitionFee(
        id=uuid4(),
        mssv="SV001",
        full_name="Student",
        name="Semester 1",
        amount=Decimal("100.00"),
        status="unpaid",
    )
    payment = Payment(
        id=uuid4(),
        payer_id=uuid4(),
        tuition_fee_id=fee.id,
        amount=fee.amount,
        status=PaymentStatus.SUCCEEDED,
        balance_before=Decimal("150.00"),
        idempotency_key="retry-key",
        terms_accepted_at=now,
        created_at=now,
        completed_at=now,
        otp_expires_at=now + timedelta(minutes=5),
    )
    return fee, payment


@pytest.mark.asyncio
async def test_successful_confirmation_replay_does_not_consume_otp(
    records, monkeypatch
):
    fee, payment = records
    session = AsyncMock()
    session.get.side_effect = [payment, fee]
    claim = AsyncMock()
    monkeypatch.setattr(routes, "claim_otp", claim)
    result = await routes.confirm_payment(
        payment.id,
        ConfirmPaymentRequest(otp="123456"),
        MagicMock(),
        (payment.payer_id, MagicMock()),
        MagicMock(),
        session,
    )
    assert result.id == payment.id
    assert result.balance_before == Decimal("150.00")
    claim.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_other_payer_cannot_consume_otp_attempts(records, monkeypatch):
    _, payment = records
    session = AsyncMock()
    session.get.return_value = payment
    claim = AsyncMock()
    monkeypatch.setattr(routes, "claim_otp", claim)
    with pytest.raises(HTTPException) as error:
        await routes.confirm_payment(
            payment.id,
            ConfirmPaymentRequest(otp="123456"),
            MagicMock(),
            (uuid4(), MagicMock()),
            MagicMock(),
            session,
        )
    assert error.value.status_code == 404
    claim.assert_not_awaited()


@pytest.mark.asyncio
async def test_lookup_exposes_all_semesters_and_legacy_fields(records):
    fee, _ = records
    other = TuitionFee(
        id=uuid4(),
        mssv=fee.mssv,
        full_name=fee.full_name,
        name="Semester 2",
        amount=Decimal("200.00"),
        status="paid",
    )
    session = AsyncMock()
    session.scalars.return_value = MagicMock(all=lambda: [fee, other])
    result = await routes.fee_lookup_response(session, "SV001")
    assert result.student_id == "SV001"
    assert result.amount == fee.amount
    assert [item.name for item in result.fees] == ["Semester 1", "Semester 2"]


@pytest.mark.asyncio
async def test_ambiguous_fee_requires_explicit_id(records):
    fee, _ = records
    session = AsyncMock()
    session.scalars.return_value = MagicMock(all=lambda: [fee, fee])
    with pytest.raises(HTTPException) as error:
        await routes.get_fee(session, "SV001")
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_idempotent_create_reuses_payment_without_email(records, monkeypatch):
    fee, payment = records
    session = AsyncMock()
    session.scalar.side_effect = [
        Wallet(user_id=payment.payer_id, available_balance=0),
        payment,
    ]

    @asynccontextmanager
    async def begin():
        yield

    @asynccontextmanager
    async def locks(*args):
        yield

    session.begin = begin
    monkeypatch.setattr(routes, "get_fee", AsyncMock(return_value=fee))
    monkeypatch.setattr(routes, "distributed_locks", locks)
    email = AsyncMock()
    monkeypatch.setattr(routes, "send_otp_email", email)
    # Replays work even if SMTP is no longer configured or balance is now zero.
    monkeypatch.setattr(routes.settings, "smtp_host", "")
    body = CreatePaymentRequest(
        studentId="SV001", agreeTerms=True, idempotencyKey="retry-key"
    )
    result = await routes.create_payment(
        body, MagicMock(), (payment.payer_id, MagicMock()), MagicMock(), session
    )
    assert result.id == payment.id
    email.assert_not_awaited()
    session.add.assert_not_called()
    assert "completed_at=payments.otp_expires_at" in str(
        session.execute.call_args.args[0]
    )


@pytest.mark.asyncio
async def test_idempotency_key_cannot_change_fee(records, monkeypatch):
    fee, payment = records
    payment.tuition_fee_id = uuid4()
    session = AsyncMock()
    session.scalar.side_effect = [
        Wallet(user_id=payment.payer_id, available_balance=1000),
        payment,
    ]

    @asynccontextmanager
    async def begin():
        yield

    @asynccontextmanager
    async def locks(*args):
        yield

    session.begin = begin
    monkeypatch.setattr(routes, "get_fee", AsyncMock(return_value=fee))
    monkeypatch.setattr(routes, "distributed_locks", locks)
    with pytest.raises(HTTPException) as error:
        await routes.create_payment(
            CreatePaymentRequest(
                studentId="SV001", agreeTerms=True, idempotencyKey="retry-key"
            ),
            MagicMock(),
            (payment.payer_id, MagicMock()),
            MagicMock(),
            session,
        )
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_redis_unlock_failure_does_not_mask_commit():
    redis = AsyncMock()
    redis.set.return_value = True
    redis.eval.side_effect = RedisError("connection lost")
    async with distributed_locks(redis, ["fee:one"]):
        pass
    redis.eval.assert_awaited_once()


@pytest.mark.asyncio
async def test_expired_confirmation_commits_terminal_state_before_rejecting(
    records, monkeypatch
):
    fee, payment = records
    payment.status = PaymentStatus.PENDING_OTP
    payment.completed_at = None
    payment.otp_expires_at = datetime.now(UTC) - timedelta(seconds=1)
    session = AsyncMock()
    session.get.return_value = payment
    session.scalar.return_value = payment.id
    committed = []

    @asynccontextmanager
    async def begin():
        yield
        committed.append(True)

    session.begin = begin
    claim = AsyncMock()
    monkeypatch.setattr(routes, "claim_otp", claim)
    with pytest.raises(HTTPException) as error:
        await routes.confirm_payment(
            payment.id,
            ConfirmPaymentRequest(otp="123456"),
            MagicMock(),
            (payment.payer_id, MagicMock()),
            MagicMock(),
            session,
        )
    assert error.value.status_code == 409
    assert committed == [True]
    statement = session.scalar.call_args.args[0]
    assert "payments.status =" in str(statement)
    assert "payments.otp_expires_at <=" in str(statement)
    assert "completed_at=payments.otp_expires_at" in str(statement)
    claim.assert_not_awaited()


@pytest.mark.asyncio
async def test_expiry_while_waiting_for_locks_uses_original_deadline(
    records, monkeypatch
):
    fee, payment = records
    payment.status = PaymentStatus.PENDING_OTP
    payment.completed_at = None
    deadline = datetime.now(UTC) - timedelta(seconds=10)
    payment.otp_expires_at = deadline
    wallet = Wallet(user_id=payment.payer_id, available_balance=Decimal("1000.00"))
    session = AsyncMock()
    session.get.return_value = payment
    # Initial expiry check misses the deadline; it passes while acquiring locks.
    session.scalar.side_effect = [None, fee, wallet, payment]

    @asynccontextmanager
    async def begin():
        yield

    @asynccontextmanager
    async def locks(*args):
        yield

    session.begin = begin
    monkeypatch.setattr(routes, "distributed_locks", locks)
    monkeypatch.setattr(routes, "claim_otp", AsyncMock(return_value=True))
    monkeypatch.setattr(routes, "clear_otp", AsyncMock())
    with pytest.raises(HTTPException) as error:
        await routes.confirm_payment(
            payment.id,
            ConfirmPaymentRequest(otp="123456"),
            MagicMock(),
            (payment.payer_id, MagicMock()),
            MagicMock(),
            session,
        )
    assert error.value.status_code == 409
    assert payment.status == PaymentStatus.EXPIRED
    assert payment.completed_at == deadline
    assert wallet.available_balance == Decimal("1000.00")
