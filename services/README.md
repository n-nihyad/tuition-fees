# Service schema refactor

## Database ownership

| Database | Owner | Tables |
| --- | --- | --- |
| `user_db` | User Service | `users` |
| `payment_db` | Payment Service | `wallets`, `tuition_fees`, `payments` |

Compose retains two databases and the existing connection configuration. Tuition Service still delegates fee lookup to Payment Service. No HTTP methods or paths are changed, including legacy `/api/v1/auth/*` aliases and internal routes.

PostgreSQL cannot enforce foreign keys across databases. `wallets.user_id` and `payments.payer_id` reference User Service logically. Each authenticated financial request validates the JWT and calls `/api/users/me`, which checks account existence, activity, role and token version. Unavailable User Service prevents financial operations. The returned user ID is checked against the token subject when present.

Do not hard-delete users with financial history. Deactivate them and increment token_version. Existing endpoints do not expose user deletion; direct database administration must also follow this policy. There is no distributed transaction between account validation and payment commit.

Within Payment DB, payments reference both `wallets.user_id` and `tuition_fees.id` with `ON DELETE RESTRICT`. Wallet debit, fee status and payment completion commit atomically. Row locks follow fee -> wallet -> payment order; Redis locks reduce competing requests, while PostgreSQL constraints and locks protect correctness if a Redis lease expires.

The schema retains `users.role`, `users.is_active`, and `wallets.updated_at` for existing functionality. `users.mssv` is nullable and unique; token_version is a nonnegative BIGINT. Payers may pay another student's fees, preserving the existing payment-on-behalf workflow.

## Compatible API extensions

- `GET /api/users/me` adds `id` and nullable `mssv`. Password hashes and token versions remain private.
- `GET /api/tuition/fees/{student_id}` preserves `studentId`, `studentName`, `amount`, `isPaid`; adds `tuitionFeeId`, `name`, and `fees: [{id,name,amount,status}]`. For multiple fees, legacy fields represent the first unpaid fee ordered by ID, falling back to a paid fee. Amounts are not aggregated. Both public services and the internal proxy carry these fields.
- `POST /api/payments` adds optional `tuitionFeeId` and `idempotencyKey`. Older requests still work for students with exactly one fee. Multiple fees require tuitionFeeId; missing selection returns 409 rather than choosing a payment target implicitly.
- Keys contain 1-128 non-whitespace characters and are unique per payer. New clients should generate a key before the first request and reuse it for retries. For old clients the server generates and returns a key, but a lost first response cannot be replayed by key unless the client supplied one.
- Same key and fee returns the stored payment without another OTP email or debit. Same key for another fee returns 409. Failed/expired attempts remain in history; a new payment intent requires a new key.
- Payment responses add `tuitionFeeId`, `feeName`, `balanceBefore`, `idempotencyKey`, `termsAcceptedAt`, `completedAt`.
- Reconfirming a successful payment returns its stored result with HTTP 200 without requiring Redis OTP state or another debit. Only the owning payer can do this.

Example:

```json
{
  "studentId": "SV001",
  "tuitionFeeId": "22222222-2222-4222-8222-222222222222",
  "agreeTerms": true,
  "idempotencyKey": "unique-client-checkout-key"
}
```

Amounts always come from the database. OTP lifetime is at most five minutes, with at most five verification attempts. Expired pending attempts close when history is requested, during confirmation, or before a new attempt for that fee. History updates only the authenticated payer's overdue pending attempts before pagination, then returns the updated rows. There is no scheduler or five-second polling. Partial unique indexes allow at most one open payment and one successful payment per fee. Confirmation rechecks fee amount/status and wallet funds, captures balance_before immediately before debit, and sets completed_at for every terminal status. For expired attempts, completed_at is the original otp_expires_at deadline, even if expiry is detected later; succeeded/failed attempts retain their processing completion time.

OTP delivery failures mark the attempt failed instead of deleting history. Redis cleanup and confirmation-email errors after a committed debit are logged without turning financial success into an API failure. SMTP, Redis and MongoDB are not part of the PostgreSQL transaction; exactly-once email delivery is not guaranteed.

## Clean initialization and reset

The project starts with empty databases. No demo accounts, wallets, fees or payments are automatically inserted during startup. Test fixtures remain isolated inside tests.

An optional manual template is available at [`scripts/demo_account.sql`](../scripts/demo_account.sql). It creates `demo1` with password `De123`, a wallet with balance `5000000.00`, and one unpaid `SV001` fee of `850000.00`. Edit the email before testing OTP. The script uses psql `\connect` and `\gset` to link the real user ID across the two databases, including when demo1 already exists. Existing users, wallet balances and fees are left unchanged on rerun; editing an existing user's email in the template does not update that stored user. Copy the annotated blocks and choose new usernames, emails and UUIDs to add accounts or fees. No payment history is fabricated.

Run manually from the repository root only when needed:

```powershell
Get-Content -Raw -Encoding UTF8 .\scripts\demo_account.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d user_db
```

This script is not part of migration or automatic database initialization.

Each service has one initial Alembic revision:

- User Service: `20261017_users_init` creates `users`.
- Payment Service: `20261017_payment_init` creates `wallets`, `tuition_fees`, `payments`, all checks and indexes.

Old migration history and legacy data conversion have been removed. Every check constraint is fully validated; there is no historical NOT VALID exception. These initial revisions require empty databases and must not be stamped over old tables.

To delete all existing project data from the repository root:

```powershell
docker compose down --volumes --remove-orphans
```

This removes project containers and PostgreSQL, Redis and MongoDB volumes, including both application databases, OTP state and audit logs. Other Docker projects and images are unaffected. The stack stays stopped after reset.

When ready to initialize from scratch:

```powershell
docker compose up -d --build
```

`infra/postgres/init.sql` creates empty `user_db` and `payment_db`. Each service runs `alembic upgrade head` before starting. No user or business data is automatically created. Existing endpoints do not provide account registration or wallet/fee provisioning; supply real data through your administration process before attempting login or payment.

Both initial revisions support downgrade to base and recreation on an empty database. Downgrading deletes the corresponding tables and all their data.

## Verification

See [testing setup](../docs/testing.md) for dependencies and interpreter setup.
From the repository root, run `python scripts/test_backend.py` to execute gateway,
user, tuition and payment suites in separate processes. Each process uses its own
working directory and `PYTHONPATH`, avoiding collisions between packages named
`app`. You can also run `python -m pytest -q` separately inside each service.

PostgreSQL tests require PAYMENT_TEST_DATABASE_URL pointing to an isolated test database, for example `postgresql+asyncpg://postgres:password@localhost:55439/payment_test`. These tests DROP AND RECREATE payment tables; never use a production URL. They cover concurrent debit, create/confirm/history, duplicate MSSV, unique idempotency/open/success constraints, and balance/OTP constraints. The root runner requires `--with-postgres` to forward that URL; direct pytest uses it when present. Without the URL, pytest reports them as skipped. Unit tests and offline Alembic SQL generation do not replace testing migration and concurrency on real PostgreSQL.
