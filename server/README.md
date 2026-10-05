# Tuition Fees API

## Login

`POST /api/auth/login` accepts JSON credentials and returns an access/refresh
JWT pair for the `student` or `admin` role. The existing client path
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
  "role": "student"
}
```

Invalid or inactive credentials return `401 Unauthorized`; malformed requests
return `422 Unprocessable Entity`. Passwords are stored as Argon2 hashes. The
PostgreSQL `users` table stores the account identity, role, and available
balance. Set `DATABASE_URL` to the `tuition-fees` database.

## Logout

`POST /api/auth/logout` requires the access token in the `Authorization: Bearer`
header and returns `204 No Content`. The server increments the account's token
version, invalidating its outstanding access and refresh tokens. This signs out
all active sessions for that account. The client also clears its local tokens
and returns to the login page if the logout request fails.

`GET /api/auth/me` requires the same bearer token and returns the authenticated
user's role. The client checks this endpoint before rendering protected
dashboard and payment routes; expired or revoked sessions are redirected to
login.

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

The API listens on port `8000`. In development, the Vite client proxies `/api`
requests to `http://localhost:8000`, so browser requests remain same-origin and
do not depend on the frontend port being `5173`. If the API runs elsewhere,
update the `/api` proxy target in `client/vite.config.ts`. For a direct
cross-origin client request, set `VITE_AUTH_API_URL` and configure
`CORS_ORIGINS` with the frontend's exact origin.

Start the API and PostgreSQL together with Docker Compose after setting the
same `JWT_SECRET_KEY` in `.env`:

```powershell
docker compose up --build
```

The migrations create the `users` table and its `role` column (`admin` or
`student`). To create a local account for testing the real PostgreSQL login
flow, apply the dev-only seed once after running the migration:

```powershell
Get-Content .\scripts\seed_test_account.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d tuition-fees
```

The credentials are:

```text
Username: payer1
Password: correct-password
Role:     student
```

The password is stored as an Argon2 hash. This login slice intentionally does
not expose public registration.

Run the login tests with:

```powershell
pytest
```