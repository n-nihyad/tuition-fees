import asyncio
import logging
import secrets
import uuid
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated

import aiosmtplib
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    status,
)
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.payment.domain.models import Payment, PaymentStatus, TuitionFee, Wallet
from app.payment.infrastructure.audit import write_audit_event
from app.payment.infrastructure.auth import PayerContext, get_payer_profile
from app.payment.infrastructure.coordination import distributed_locks
from app.payment.infrastructure.otp import (
    claim_otp,
    clear_otp,
    create_otp,
    release_claim,
    send_confirmation_email,
    send_otp_email,
)
from app.payment.presentation.schemas import (
    ConfirmPaymentRequest,
    CreatePaymentRequest,
    FeeResponse,
    FeeItem,
    PaymentHistoryResponse,
    PaymentResponse,
    WalletResponse,
)
from app.shared.config.settings import settings
from app.shared.database.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter()


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def get_payment_response(payment: Payment, fee: TuitionFee) -> PaymentResponse:
    return PaymentResponse(
        tuition_fee_id=fee.id,
        fee_name=fee.name,
        balance_before=payment.balance_before,
        idempotency_key=payment.idempotency_key,
        terms_accepted_at=payment.terms_accepted_at,
        completed_at=payment.completed_at,
        id=payment.id,
        student_id=fee.student_id,
        student_name=fee.student_name,
        amount=payment.amount,
        status=payment.status.value,
        otp_expires_at=payment.otp_expires_at
        if payment.status == PaymentStatus.PENDING_OTP
        else None,
        created_at=payment.created_at,
    )


async def get_fee(
    session: AsyncSession,
    student_id: str,
    *,
    lock: bool = False,
    fee_id: uuid.UUID | None = None,
) -> TuitionFee:
    query = select(TuitionFee).where(TuitionFee.student_id == student_id)
    if fee_id is not None:
        query = query.where(TuitionFee.id == fee_id)
    if lock:
        query = query.with_for_update()
    fees = list((await session.scalars(query)).all())
    if fee_id is None and len(fees) > 1:
        raise HTTPException(409, detail="Multiple fees; supply tuitionFeeId.")
    fee = fees[0] if fees else None
    if fee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khoản học phí của MSSV này.",
        )
    return fee


async def fail_payment_attempt(session: AsyncSession, payment_id: uuid.UUID) -> None:
    async with session.begin():
        await session.execute(
            update(Payment)
            .where(
                Payment.id == payment_id, Payment.status == PaymentStatus.PENDING_OTP
            )
            .values(status=PaymentStatus.FAILED, completed_at=datetime.now(UTC))
        )


async def fee_lookup_response(session: AsyncSession, student_id: str) -> FeeResponse:
    fees = list(
        (
            await session.scalars(
                select(TuitionFee)
                .where(TuitionFee.mssv == student_id)
                .order_by(TuitionFee.status.desc(), TuitionFee.id)
            )
        ).all()
    )
    if not fees:
        raise HTTPException(404, detail="Tuition fee not found.")
    fee = fees[0]
    return FeeResponse(
        student_id=fee.mssv,
        student_name=fee.full_name,
        amount=fee.amount,
        is_paid=fee.is_paid,
        tuition_fee_id=fee.id,
        name=fee.name,
        fees=[
            FeeItem(id=f.id, name=f.name, amount=f.amount, status=f.status)
            for f in fees
        ],
    )


@router.get("/api/tuition/fees/{student_id}", response_model=FeeResponse)
async def lookup_tuition_fee(
    student_id: str,
    _: PayerContext = Depends(get_payer_profile),
    session: AsyncSession = Depends(get_session),
) -> FeeResponse:
    return await fee_lookup_response(session, student_id)


@router.get("/api/wallet", response_model=WalletResponse)
async def wallet_balance(
    payer: PayerContext = Depends(get_payer_profile),
    session: AsyncSession = Depends(get_session),
) -> WalletResponse:
    wallet = await session.scalar(select(Wallet).where(Wallet.user_id == payer[0]))
    if wallet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản chưa được khởi tạo ví thanh toán.",
        )
    return WalletResponse(available_balance=wallet.available_balance)


@router.post(
    "/api/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payment(
    body: CreatePaymentRequest,
    request: Request,
    payer: PayerContext = Depends(get_payer_profile),
    redis: Redis = Depends(get_redis),
    session: AsyncSession = Depends(get_session),
) -> PaymentResponse:
    if not body.agree_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn cần đồng ý với điều khoản thanh toán.",
        )
    payer_id, profile = payer
    fee = await get_fee(session, body.student_id, fee_id=body.tuition_fee_id)
    fee_id = fee.id
    await session.rollback()
    payment_id = uuid.uuid4()
    idempotency_key = body.idempotency_key or str(payment_id)

    async with distributed_locks(
        redis,
        [f"wallet:{payer_id}", f"fee:{fee_id}"],
    ):
        async with session.begin():
            fee = await get_fee(session, body.student_id, lock=True, fee_id=fee_id)
            wallet = await session.scalar(
                select(Wallet).where(Wallet.user_id == payer_id).with_for_update()
            )
            if wallet is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tài khoản chưa được khởi tạo ví thanh toán.",
                )
            await session.execute(
                update(Payment)
                .where(
                    Payment.tuition_fee_id == fee.id,
                    Payment.status == PaymentStatus.PENDING_OTP,
                    Payment.otp_expires_at <= datetime.now(UTC),
                )
                .values(
                    status=PaymentStatus.EXPIRED, completed_at=Payment.otp_expires_at
                )
            )
            existing = await session.scalar(
                select(Payment).where(
                    Payment.payer_id == payer_id,
                    Payment.idempotency_key == idempotency_key,
                )
            )
            if existing is not None:
                if existing.tuition_fee_id != fee.id:
                    raise HTTPException(
                        409, detail="Idempotency key already used for another fee."
                    )
                return get_payment_response(existing, fee)
            if fee.is_paid:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Khoản học phí này đã được thanh toán.",
                )
            if wallet.available_balance < fee.amount:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Số dư khả dụng không đủ để thanh toán toàn bộ học phí.",
                )
            pending = await session.scalar(
                select(Payment).where(
                    Payment.tuition_fee_id == fee.id,
                    Payment.status == PaymentStatus.PENDING_OTP,
                    Payment.otp_expires_at > datetime.now(UTC),
                )
            )
            if pending is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Khoản học phí đang có giao dịch chờ xác thực OTP.",
                )
            if not settings.smtp_host or not settings.smtp_from:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Chưa cấu hình SMTP để gửi OTP.",
                )
            created_at = datetime.now(UTC)
            expires_at = created_at + timedelta(seconds=settings.otp_ttl_seconds)
            payment = Payment(
                id=payment_id,
                idempotency_key=idempotency_key,
                terms_accepted_at=created_at,
                created_at=created_at,
                payer_id=payer_id,
                tuition_fee_id=fee.id,
                amount=fee.amount,
                status=PaymentStatus.PENDING_OTP,
                otp_expires_at=expires_at,
            )
            session.add(payment)
            await session.flush()
            await write_audit_event(
                request,
                event_type="payment_otp_requested",
                payer_id=payer_id,
                payment_id=payment_id,
                details={"studentId": fee.student_id, "amount": str(fee.amount)},
            )

    otp: str | None = None
    try:
        otp = await create_otp(redis, payment_id)
        await send_otp_email(profile.email, otp, payment_id)
    except (aiosmtplib.SMTPException, OSError, asyncio.TimeoutError) as exc:
        if otp is not None:
            try:
                await clear_otp(redis, payment_id, otp, "")
            except RedisError:
                logger.exception("Could not clear OTP after email delivery failure")
        await fail_payment_attempt(session, payment_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OTP email delivery failed.",
        ) from exc
    except HTTPException:
        if otp is not None:
            try:
                await clear_otp(redis, payment_id, otp, "")
            except RedisError:
                logger.exception("Could not clear OTP after request failure")
        await fail_payment_attempt(session, payment_id)
        raise
    except RedisError as exc:
        if otp is not None:
            try:
                await clear_otp(redis, payment_id, otp, "")
            except RedisError:
                logger.exception("Could not clear OTP after Redis failure")
        await fail_payment_attempt(session, payment_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ OTP tạm thời không khả dụng.",
        ) from exc

    return get_payment_response(payment, fee)


@router.post("/api/payments/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(
    payment_id: uuid.UUID,
    body: ConfirmPaymentRequest,
    request: Request,
    payer: PayerContext = Depends(get_payer_profile),
    redis: Redis = Depends(get_redis),
    session: AsyncSession = Depends(get_session),
) -> PaymentResponse:
    payer_id, profile = payer
    payment = await session.get(Payment, payment_id)
    if payment is None or payment.payer_id != payer_id:
        raise HTTPException(404, detail="Payment not found.")
    if payment.status == PaymentStatus.SUCCEEDED:
        fee = await session.get(TuitionFee, payment.tuition_fee_id)
        return get_payment_response(payment, fee)
    await session.rollback()
    async with session.begin():
        expired = await session.scalar(
            update(Payment)
            .where(
                Payment.id == payment_id,
                Payment.status == PaymentStatus.PENDING_OTP,
                Payment.otp_expires_at <= datetime.now(UTC),
            )
            .values(status=PaymentStatus.EXPIRED, completed_at=Payment.otp_expires_at)
            .returning(Payment.id)
        )
    if expired is not None:
        raise HTTPException(409, detail="OTP expired.")
    claim_token = secrets.token_urlsafe(24)
    try:
        claimed = await claim_otp(redis, payment_id, body.otp, claim_token)
        attempts_remaining = (
            max(0, 5 - int(await redis.get(f"otp:attempts:{payment_id}") or 0))
            if not claimed
            else None
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ xác thực OTP tạm thời không khả dụng.",
        ) from exc
    if not claimed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP không hợp lệ hoặc đã hết hạn.",
            headers={"X-OTP-Attempts-Remaining": str(attempts_remaining)},
        )

    committed = False
    failure_detail: str | None = None
    try:
        payment = await session.get(Payment, payment_id)
        if payment is None or payment.payer_id != payer_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy giao dịch.",
            )
        fee_id = payment.tuition_fee_id
        await session.rollback()
        async with distributed_locks(
            redis,
            [f"wallet:{payer_id}", f"fee:{fee_id}"],
        ):
            async with session.begin():
                await session.scalar(
                    select(TuitionFee).where(TuitionFee.id == fee_id).with_for_update()
                )
                await session.scalar(
                    select(Wallet).where(Wallet.user_id == payer_id).with_for_update()
                )
                payment = await session.scalar(
                    select(Payment).where(Payment.id == payment_id).with_for_update()
                )
                if payment is None or payment.payer_id != payer_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy giao dịch.",
                    )
                if payment.status != PaymentStatus.PENDING_OTP:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Giao dịch không còn ở trạng thái chờ xác thực.",
                    )
                now = datetime.now(UTC)
                if payment.otp_expires_at <= now:
                    payment.status = PaymentStatus.EXPIRED
                    payment.completed_at = payment.otp_expires_at
                    failure_detail = "Mã OTP đã hết hạn."
                else:
                    fee = await session.scalar(
                        select(TuitionFee)
                        .where(TuitionFee.id == payment.tuition_fee_id)
                        .with_for_update()
                    )
                    wallet = await session.scalar(
                        select(Wallet)
                        .where(Wallet.user_id == payer_id)
                        .with_for_update()
                    )
                    if fee is None or fee.is_paid:
                        payment.status = PaymentStatus.FAILED
                        failure_detail = "Khoản học phí đã được thanh toán."
                    elif payment.amount != fee.amount:
                        payment.status = PaymentStatus.FAILED
                        failure_detail = (
                            "Số tiền học phí đã thay đổi; vui lòng tạo giao dịch mới."
                        )
                    elif wallet is None or wallet.available_balance < fee.amount:
                        payment.status = PaymentStatus.FAILED
                        failure_detail = "Số dư khả dụng không còn đủ để thanh toán."
                    else:
                        payment.balance_before = wallet.available_balance
                        wallet.available_balance -= fee.amount
                        fee.is_paid = True
                        payment.status = PaymentStatus.SUCCEEDED
                        payment.completed_at = now
                    payment.completed_at = now
                    await session.flush()
                    await write_audit_event(
                        request,
                        event_type=(
                            "payment_succeeded"
                            if failure_detail is None
                            else "payment_failed"
                        ),
                        payer_id=payer_id,
                        payment_id=payment_id,
                        details={
                            "amount": str(payment.amount),
                            "reason": failure_detail,
                        },
                    )
            committed = True
        try:
            await clear_otp(redis, payment_id, body.otp, claim_token)
        except RedisError:
            logger.exception("Payment committed; OTP cleanup failed")
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ xác thực OTP tạm thời không khả dụng.",
        ) from exc
    finally:
        if not committed:
            try:
                await release_claim(redis, payment_id, claim_token)
            except RedisError:
                logger.exception(
                    "OTP claim cleanup failed; Redis TTL will release the claim"
                )

    if failure_detail is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=failure_detail,
        )
    fee = await session.get(TuitionFee, payment.tuition_fee_id)
    if fee is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không tìm thấy khoản học phí của giao dịch đã hoàn tất.",
        )
    try:
        await send_confirmation_email(
            profile.email,
            payment.id,
            f"{payment.amount:.2f}",
        )
    except (aiosmtplib.SMTPException, OSError, asyncio.TimeoutError, HTTPException):
        logger.exception("Payment succeeded but confirmation email could not be sent")
    return get_payment_response(payment, fee)


@router.get("/api/payments", response_model=PaymentHistoryResponse)
async def payment_history(
    payer: PayerContext = Depends(get_payer_profile),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    payment_status: Annotated[PaymentStatus | None, Query(alias="status")] = None,
    payment_id: Annotated[uuid.UUID | None, Query(alias="paymentId")] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    date_from: Annotated[date | None, Query(alias="dateFrom")] = None,
    date_to: Annotated[date | None, Query(alias="dateTo")] = None,
) -> PaymentHistoryResponse:
    payer_id = payer[0]
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, detail="Ngày bắt đầu phải trước ngày kết thúc.")
    # Expire only this payer's still-open attempts. Conditional UPDATE rechecks
    # status after waiting for a concurrent confirmation's row lock.
    async with session.begin():
        await session.execute(
            update(Payment)
            .where(
                Payment.payer_id == payer_id,
                Payment.status == PaymentStatus.PENDING_OTP,
                Payment.completed_at.is_(None),
                Payment.otp_expires_at <= func.now(),
            )
            .values(
                status=PaymentStatus.EXPIRED,
                completed_at=Payment.otp_expires_at,
            )
        )
    counts = dict(
        (
            await session.execute(
                select(Payment.status, func.count())
                .where(Payment.payer_id == payer_id)
                .group_by(Payment.status)
            )
        ).all()
    )
    conditions = [Payment.payer_id == payer_id]
    if payment_id is not None:
        conditions.append(Payment.id == payment_id)
    if payment_status is not None:
        conditions.append(Payment.status == payment_status)
    if search and search.strip():
        term = search.strip()
        conditions.append(
            or_(
                TuitionFee.student_id.icontains(term, autoescape=True),
                TuitionFee.name.icontains(term, autoescape=True),
                TuitionFee.student_name.icontains(term, autoescape=True),
            )
        )
    if date_from:
        conditions.append(
            Payment.created_at >= datetime.combine(date_from, time.min, UTC)
        )
    if date_to:
        conditions.append(
            Payment.created_at <= datetime.combine(date_to, time.max, UTC)
        )
    total = await session.scalar(
        select(func.count())
        .select_from(Payment)
        .join(TuitionFee, TuitionFee.id == Payment.tuition_fee_id)
        .where(*conditions)
    )
    rows = (
        await session.execute(
            select(Payment, TuitionFee)
            .join(TuitionFee, TuitionFee.id == Payment.tuition_fee_id)
            .where(*conditions)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return PaymentHistoryResponse(
        items=[get_payment_response(payment, fee) for payment, fee in rows],
        total=total or 0,
        status_counts={state.value: counts.get(state, 0) for state in PaymentStatus},
    )


@router.get(
    "/internal/tuition/fees/{student_id}",
    response_model=FeeResponse,
    include_in_schema=False,
)
async def internal_lookup_tuition_fee(
    student_id: str,
    session: AsyncSession = Depends(get_session),
    internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
) -> FeeResponse:
    supplied = internal_api_key or ""
    expected = settings.internal_api_key.get_secret_value()
    if not secrets.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Service authentication failed.",
        )
    return await fee_lookup_response(session, student_id)
