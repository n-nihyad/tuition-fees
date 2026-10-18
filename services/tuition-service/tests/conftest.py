import os

os.environ.setdefault(
    "JWT_SECRET_KEY",
    "tuition-service-test-secret-with-more-than-32-characters",
)
os.environ.setdefault(
    "INTERNAL_API_KEY",
    "tuition-service-internal-test-secret-with-more-than-32-chars",
)
os.environ.setdefault("USER_SERVICE_URL", "http://localhost:8001")
os.environ.setdefault("PAYMENT_SERVICE_URL", "http://localhost:8002")
