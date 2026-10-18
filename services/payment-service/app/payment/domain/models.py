import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Uuid,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, synonym


class Base(DeclarativeBase):
    pass


class PaymentStatus(str, Enum):
    PENDING_OTP = "pending_otp"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    EXPIRED = "expired"


class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = (
        CheckConstraint(
            "available_balance >= 0",
            name="ck_wallet_nonnegative",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False, unique=True
    )
    available_balance: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, server_default="0.00"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class TuitionFee(Base):
    __tablename__ = "tuition_fees"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_tuition_amount_positive"),
        CheckConstraint("status IN ('unpaid', 'paid')", name="ck_tuition_status"),
        Index("ix_tuition_fees_mssv_status", "mssv", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    mssv: Mapped[str] = mapped_column(String(32), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="Tuition fee", server_default="Tuition fee"
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="unpaid", server_default="unpaid"
    )
    student_id = synonym("mssv")
    student_name = synonym("full_name")

    @property
    def is_paid(self) -> bool:
        return self.status == "paid"

    @is_paid.setter
    def is_paid(self, value: bool) -> None:
        self.status = "paid" if value else "unpaid"


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payment_amount_positive"),
        UniqueConstraint("payer_id", "idempotency_key", name="uq_payments_idempotency"),
        CheckConstraint(
            "balance_before IS NULL OR balance_before >= 0",
            name="ck_payments_balance_before",
        ),
        CheckConstraint(
            "(status = 'pending_otp' AND completed_at IS NULL) OR (status IN ('succeeded', 'failed', 'expired') AND completed_at IS NOT NULL)",
            name="ck_payments_completion",
        ),
        CheckConstraint(
            "status <> 'succeeded' OR (balance_before IS NOT NULL AND balance_before >= amount)",
            name="ck_payments_success_balance",
        ),
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= created_at",
            name="ck_payments_completed_time",
        ),
        CheckConstraint(
            "otp_expires_at > created_at AND otp_expires_at <= created_at + INTERVAL '5 minutes'",
            name="ck_payments_otp_window",
        ),
        Index(
            "uq_payments_open_per_fee",
            "tuition_fee_id",
            unique=True,
            postgresql_where=text("completed_at IS NULL"),
        ),
        Index("ix_payments_fee", "tuition_fee_id"),
        Index(
            "ix_payments_pending_expiry",
            "otp_expires_at",
            postgresql_where=text("status = 'pending_otp'"),
        ),
        Index("ix_payments_payer_created", "payer_id", "created_at"),
        Index(
            "uq_payments_one_success_per_fee",
            "tuition_fee_id",
            unique=True,
            postgresql_where=text("status = 'succeeded'"),
            sqlite_where=text("status = 'succeeded'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    payer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("wallets.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    tuition_fee_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tuition_fees.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(
            PaymentStatus,
            name="payment_status",
            native_enum=False,
            create_constraint=True,
            length=16,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=PaymentStatus.PENDING_OTP,
        server_default="pending_otp",
    )
    otp_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    balance_before: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    terms_accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
