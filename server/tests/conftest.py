import os

os.environ.setdefault(
    "JWT_SECRET_KEY",
    "test-secret-key-that-is-longer-than-thirty-two-characters",
)
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/payment",
)
