import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Numeric, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database.base import Base


class Payer(Base):
    __tablename__ = "payers"
    __table_args__ = (
        CheckConstraint("available_balance >= 0", name="ck_payers_balance_nonnegative"),
        CheckConstraint("role IN ('admin', 'user')", name="ck_payers_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(32))
    email: Mapped[str] = mapped_column(String(320), unique=True)
    available_balance: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="user",
        server_default=text("'user'"),
    )
