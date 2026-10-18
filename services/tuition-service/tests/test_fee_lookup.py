import httpx
import pytest

from app.main import app
from app.tuition.presentation.dependencies import ensure_student_access


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "extension",
    [
        {},
        {
            "tuitionFeeId": "22222222-2222-4222-8222-222222222222",
            "name": "Semester 1",
            "fees": [
                {
                    "id": "22222222-2222-4222-8222-222222222222",
                    "name": "Semester 1",
                    "amount": "850000.00",
                    "status": "unpaid",
                }
            ],
        },
    ],
)
async def test_tuition_service_proxies_authenticated_fee_lookup(extension) -> None:
    observed: dict[str, str] = {}

    async def payment_service(request: httpx.Request) -> httpx.Response:
        observed["path"] = str(request.url)
        observed["service_key"] = request.headers["x-internal-api-key"]
        return httpx.Response(
            200,
            json={
                "studentId": "SV001",
                "studentName": "Tran Thi B",
                "amount": "850000.00",
                "isPaid": False,
                **extension,
            },
        )

    app.state.http_client = httpx.AsyncClient(
        transport=httpx.MockTransport(payment_service)
    )
    app.dependency_overrides[ensure_student_access] = lambda: None
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://tuition"
    ) as client:
        response = await client.get(
            "/api/tuition/fees/SV001",
            headers={"Authorization": "Bearer valid-token"},
        )

    await app.state.http_client.aclose()
    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {
        "studentId": "SV001",
        "studentName": "Tran Thi B",
        "amount": "850000.00",
        "isPaid": False,
        **extension,
    }
    assert observed["path"] == "http://localhost:8002/internal/tuition/fees/SV001"
    assert (
        observed["service_key"]
        == "tuition-service-internal-test-secret-with-more-than-32-chars"
    )
