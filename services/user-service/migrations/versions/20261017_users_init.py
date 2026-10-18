"""Create the clean initial schema. No seed data or legacy conversion."""

from alembic import op

revision = "20261017_users_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""CREATE TYPE user_role AS ENUM ('admin', 'student')""")
    op.execute(
        """CREATE TABLE users (
	mssv VARCHAR(32), 
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	username VARCHAR(100) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	full_name VARCHAR(200) NOT NULL, 
	phone VARCHAR(32) NOT NULL, 
	email VARCHAR(320) NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	role user_role DEFAULT 'student' NOT NULL, 
	token_version BIGINT DEFAULT '0' NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_users_token_version CHECK (token_version >= 0), 
	UNIQUE (mssv), 
	UNIQUE (username), 
	UNIQUE (email)
)"""
    )


def downgrade() -> None:
    op.drop_table("users")
    op.execute("DROP TYPE user_role")
