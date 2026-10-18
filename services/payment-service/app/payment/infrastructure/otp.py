import hashlib
import hmac
import secrets
import uuid
from email.message import EmailMessage

import aiosmtplib
from fastapi import HTTPException, status
from redis.asyncio import Redis

from app.shared.config.settings import settings

_STORE_OTP_SCRIPT = """
if redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3], 'NX') then
  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
  return 1
end
return 0
"""

_CLAIM_OTP_SCRIPT = """
local active_payment = redis.call('GET', KEYS[1])
if not active_payment then return 0 end
if active_payment ~= ARGV[1] then return 0 end
local stored_hash = redis.call('GET', KEYS[2])
if not stored_hash or stored_hash ~= ARGV[2] then return 0 end
if redis.call('SET', KEYS[3], ARGV[3], 'EX', ARGV[4], 'NX') then
  return 1
end
return -1
"""

_RELEASE_CLAIM_SCRIPT = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
"""


def otp_digest(payment_id: uuid.UUID, otp: str) -> str:
    key = settings.jwt_secret_key.get_secret_value().encode()
    message = f"{payment_id}:{otp}".encode()
    return hmac.new(key, message, hashlib.sha256).hexdigest()


async def create_otp(redis: Redis, payment_id: uuid.UUID) -> str:
    for _ in range(10):
        otp = f"{secrets.randbelow(1_000_000):06d}"
        result = await redis.eval(
            _STORE_OTP_SCRIPT,
            2,
            f"otp:active:{otp}",
            f"otp:payment:{payment_id}",
            str(payment_id),
            otp_digest(payment_id, otp),
            settings.otp_ttl_seconds,
        )
        if result == 1:
            return otp
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Không thể cấp mã OTP duy nhất. Vui lòng thử lại.",
    )


async def claim_otp(
    redis: Redis,
    payment_id: uuid.UUID,
    otp: str,
    claim_token: str,
) -> bool:
    attempts_key = f"otp:attempts:{payment_id}"
    attempts = await redis.incr(attempts_key)
    if attempts == 1:
        await redis.expire(attempts_key, settings.otp_ttl_seconds)
    if attempts > 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Đã vượt quá số lần nhập OTP cho giao dịch này.",
        )

    result = await redis.eval(
        _CLAIM_OTP_SCRIPT,
        3,
        f"otp:active:{otp}",
        f"otp:payment:{payment_id}",
        f"otp:claim:{payment_id}",
        str(payment_id),
        otp_digest(payment_id, otp),
        claim_token,
        30,
    )
    if result == -1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Giao dịch đang được xác thực.",
        )
    return result == 1


async def clear_otp(
    redis: Redis,
    payment_id: uuid.UUID,
    otp: str,
    claim_token: str,
) -> None:
    otp_key = f"otp:payment:{payment_id}"
    await redis.delete(
        otp_key,
        f"otp:active:{otp}",
        f"otp:attempts:{payment_id}",
    )
    await redis.eval(
        _RELEASE_CLAIM_SCRIPT,
        1,
        f"otp:claim:{payment_id}",
        claim_token,
    )


async def release_claim(
    redis: Redis,
    payment_id: uuid.UUID,
    claim_token: str,
) -> None:
    await redis.eval(
        _RELEASE_CLAIM_SCRIPT,
        1,
        f"otp:claim:{payment_id}",
        claim_token,
    )


async def send_otp_email(recipient: str, otp: str, payment_id: uuid.UUID) -> None:
    if not settings.smtp_host or not settings.smtp_from:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chưa cấu hình SMTP để gửi OTP.",
        )
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = recipient
    message["Subject"] = "Mã OTP thanh toán học phí"
    message.set_content(
        f"Mã OTP cho giao dịch {payment_id} là {otp}. "
        "Mã có hiệu lực tối đa 5 phút "
        "và chỉ sử dụng được một lần."
    )
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=(
            settings.smtp_password.get_secret_value()
            if settings.smtp_user
            else None
        ),
        start_tls=settings.smtp_port != 465,
        use_tls=settings.smtp_port == 465,
    )


async def send_confirmation_email(recipient: str, payment_id: uuid.UUID, amount: str) -> None:
    if not settings.smtp_host or not settings.smtp_from:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Giao dịch đã hoàn tất nhưng chưa cấu hình SMTP để gửi email xác nhận.",
        )
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = recipient
    message["Subject"] = "Thanh toán học phí thành công"
    message.set_content(
        f"Giao dịch {payment_id} đã thanh toán thành công số tiền {amount} VND."
    )
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=(
            settings.smtp_password.get_secret_value()
            if settings.smtp_user
            else None
        ),
        start_tls=settings.smtp_port != 465,
        use_tls=settings.smtp_port == 465,
    )
