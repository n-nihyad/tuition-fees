"""Create the clean initial schema. No seed data or legacy conversion."""

from alembic import op

revision = "20261017_payment_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """CREATE TABLE wallets (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	user_id UUID NOT NULL, 
	available_balance NUMERIC(14, 2) DEFAULT '0.00' NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_wallet_nonnegative CHECK (available_balance >= 0), 
	UNIQUE (user_id)
)"""
    )
    op.execute(
        """CREATE TABLE tuition_fees (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	mssv VARCHAR(32) NOT NULL, 
	full_name VARCHAR(200) NOT NULL, 
	name VARCHAR(255) DEFAULT 'Tuition fee' NOT NULL, 
	amount NUMERIC(14, 2) NOT NULL, 
	status VARCHAR(16) DEFAULT 'unpaid' NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_tuition_amount_positive CHECK (amount > 0), 
	CONSTRAINT ck_tuition_status CHECK (status IN ('unpaid', 'paid'))
)"""
    )
    op.execute(
        """CREATE INDEX ix_tuition_fees_mssv_status ON tuition_fees (mssv, status)"""
    )
    op.execute(
        """CREATE TABLE payments (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	payer_id UUID NOT NULL, 
	tuition_fee_id UUID NOT NULL, 
	amount NUMERIC(14, 2) NOT NULL, 
	status VARCHAR(16) DEFAULT 'pending_otp' NOT NULL, 
	otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	balance_before NUMERIC(14, 2), 
	idempotency_key VARCHAR(128) NOT NULL, 
	terms_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_payment_amount_positive CHECK (amount > 0), 
	CONSTRAINT uq_payments_idempotency UNIQUE (payer_id, idempotency_key), 
	CONSTRAINT ck_payments_balance_before CHECK (balance_before IS NULL OR balance_before >= 0), 
	CONSTRAINT ck_payments_completion CHECK ((status = 'pending_otp' AND completed_at IS NULL) OR (status IN ('succeeded', 'failed', 'expired') AND completed_at IS NOT NULL)), 
	CONSTRAINT ck_payments_success_balance CHECK (status <> 'succeeded' OR (balance_before IS NOT NULL AND balance_before >= amount)), 
	CONSTRAINT ck_payments_completed_time CHECK (completed_at IS NULL OR completed_at >= created_at), 
	CONSTRAINT ck_payments_otp_window CHECK (otp_expires_at > created_at AND otp_expires_at <= created_at + INTERVAL '5 minutes'), 
	FOREIGN KEY(payer_id) REFERENCES wallets (user_id) ON DELETE RESTRICT, 
	FOREIGN KEY(tuition_fee_id) REFERENCES tuition_fees (id) ON DELETE RESTRICT, 
	CONSTRAINT payment_status CHECK (status IN ('pending_otp', 'succeeded', 'failed', 'expired'))
)"""
    )
    op.execute("""CREATE INDEX ix_payments_fee ON payments (tuition_fee_id)""")
    op.execute(
        """CREATE INDEX ix_payments_payer_created ON payments (payer_id, created_at)"""
    )
    op.execute(
        """CREATE INDEX ix_payments_pending_expiry ON payments (otp_expires_at) WHERE status = 'pending_otp'"""
    )
    op.execute(
        """CREATE UNIQUE INDEX uq_payments_one_success_per_fee ON payments (tuition_fee_id) WHERE status = 'succeeded'"""
    )
    op.execute(
        """CREATE UNIQUE INDEX uq_payments_open_per_fee ON payments (tuition_fee_id) WHERE completed_at IS NULL"""
    )


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("tuition_fees")
    op.drop_table("wallets")
