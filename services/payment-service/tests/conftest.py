import os

os.environ.setdefault(
    "JWT_SECRET_KEY",
    "payment-service-test-secret-with-more-than-32-characters",
)
os.environ.setdefault(
    "INTERNAL_API_KEY",
    "payment-service-internal-test-secret-with-more-than-32-chars",
)
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/payment_test",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017/audit_test")
os.environ.setdefault("USER_SERVICE_URL", "http://localhost:8001")
os.environ.setdefault("SMTP_HOST", "")
os.environ.setdefault("SMTP_FROM", "")
