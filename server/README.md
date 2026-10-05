# Tuition Fees API

## Login

`POST /api/auth/login` accepts JSON credentials and returns an access/refresh
JWT pair for the `PAYER` role. The existing client path
`POST /api/v1/auth/login` is retained as an undocumented alias.

Request:

```json
{
  "username": "payer1",
  "password": "your-password"
}
```

Success (`200 OK`, `Cache-Control: no-store`):

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<JWT>",
  "expiresIn": 900,
  "role": "PAYER"
}
```

Invalid or inactive credentials return `401 Unauthorized`; malformed requests
return `422 Unprocessable Entity`. Passwords are stored as Argon2 hashes. The
PostgreSQL `payers` table stores the account identity and available balance.

## Run locally

Copy `.env.example` to `.env` and replace `JWT_SECRET_KEY` with a random secret
of at least 32 characters. The default CORS origins allow the Vite development
server at `localhost:5173` and `127.0.0.1:5173`; set `CORS_ORIGINS` to a JSON
array of trusted frontend origins when using another address. Then install
dependencies, apply migrations, and start the API:

```powershell
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

The API listens on port `8000`, which is the client's default login API port.
Set `VITE_AUTH_API_URL` in the client environment to override
`http://localhost:8000/api/v1/auth` when needed.

Start the API and PostgreSQL together with Docker Compose after setting the
same `JWT_SECRET_KEY` in `.env`:

```powershell
docker compose up --build
```

The migrations create the `payers` table and its `role` column (`admin` or
`user`); the role is stored but is not yet used by login or authorization. To
create a local account for testing the real PostgreSQL login flow, apply the
dev-only seed once after running the migration:

```powershell
Get-Content .\scripts\seed_test_account.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d payment
```

The credentials are:

```text
Username: payer1
Password: correct-password
Role:     user
```

The password is stored as an Argon2 hash. This login slice intentionally does
not expose public registration.

Run the login tests with:

```powershell
pytest
```