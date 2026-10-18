# Chạy kiểm thử

Chạy các lệnh bên dưới từ thư mục gốc dự án, trừ khi ghi rõ vị trí khác.
Không chạy tất cả thư mục Python trong một lần `pytest`: gateway và các service
cùng dùng tên package `app`, nên có thể import nhầm nhau.

## Chuẩn bị Python

Backend yêu cầu Python từ 3.12. Có thể dùng môi trường phát triển riêng cho từng
service. Nếu dùng một `.venv` chung để chạy trình tổng hợp, cài đủ dependency của
gateway và dev extras của ba service; không cài editable cả ba package `app` vào
cùng môi trường. Các lệnh sau chỉ cài dependencies, không khởi động server:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\gateway\requirements-dev.txt
```

Để cài dependency từ `pyproject.toml` của từng service mà không cài package `app`,
dùng `uv` (cài bằng `python -m pip install uv` nếu chưa có):

```powershell
uv pip install --python .\.venv\Scripts\python.exe -r .\services\user-service\pyproject.toml --extra dev
uv pip install --python .\.venv\Scripts\python.exe -r .\services\payment-service\pyproject.toml --extra dev
uv pip install --python .\.venv\Scripts\python.exe -r .\services\tuition-service\pyproject.toml --extra dev
```

Hoặc tạo `.venv` riêng trong từng service, chạy `python -m pip install ".[dev]"`
tại đó, rồi `python -m pytest -q`; gateway dùng `requirements-dev.txt`.
Không cần thay đổi môi trường đang hoạt động nếu đã cài đủ dependencies.

## Chạy backend từ root

```powershell
python .\scripts\test_backend.py
python .\scripts\test_backend.py payment-service
```

Trình chạy dùng đúng Python đang gọi nó, tạo tiến trình mới cho mỗi suite, đặt
working directory và `PYTHONPATH` về service tương ứng, và trả exit code khác 0
nếu có suite lỗi. Nó không cài dependency, chạy migration hay khởi động Docker.
`pnpm test` hoặc `pnpm run test:backend` tại root gọi cùng trình chạy; cần kích hoạt
đúng môi trường Python trước khi dùng các lệnh này.

Theo mặc định, các test cần PostgreSQL bị bỏ qua; trình chạy không chuyển tiếp
`PAYMENT_TEST_DATABASE_URL` nếu chưa bật `--with-postgres`. Test HTTP khác dùng
adapter/mock và không cần stack Compose đang chạy.

## Test tích hợp PostgreSQL

Chỉ dùng database kiểm thử riêng, có thể xóa. Các test trong
`test_payment_concurrency.py` drop và tạo lại bảng payment, không được trỏ vào
`payment_db` đang dùng. Không dùng chuỗi kết nối của database có dữ liệu cần giữ.

```powershell
$env:PAYMENT_TEST_DATABASE_URL = 'postgresql+asyncpg://postgres:password@localhost:55439/payment_test'
python .\scripts\test_backend.py payment-service --with-postgres
Remove-Item Env:PAYMENT_TEST_DATABASE_URL
```

Database ví dụ phải được tạo riêng trước khi chạy. Các test này dùng PostgreSQL
thật để kiểm tra khóa hàng, transaction và constraint; Redis, email và audit dùng
adapter test. Không có URL test thì pytest báo skipped, không phải đã kiểm chứng
đồng thời trên PostgreSQL. Khi chạy `pytest` trực tiếp trong service, URL từ môi
trường vẫn có hiệu lực mà không cần cờ của trình tổng hợp.

## Client

Cài dependencies trong `client/` bằng `pnpm install --frozen-lockfile`. Unit test
hiện dùng Node 24 trở lên để chạy TypeScript trực tiếp và module hooks. Node trong
Docker chỉ build ứng dụng, không chạy bộ unit test này.

```powershell
pnpm run test:client
pnpm run check:client
pnpm run test:e2e
```

Đây là script của root, chuyển tiếp đến `client/`. Có thể chạy các lệnh tương ứng
`pnpm test`, `pnpm run lint`, `pnpm run build`, `pnpm run test:e2e` khi ở `client/`.

Playwright dùng Google Chrome đã cài trên máy, tự chạy Vite tại
`127.0.0.1:5177`; cổng này phải rảnh. API được mock, không tạo giao dịch thật.
Kiểm tra mobile/tablet/desktop và accessibility bằng axe. Ảnh/kết quả nằm trong
`client/test-results/`; trace giữ khi test lỗi. Viewport mô phỏng không thay thế
kiểm thử bàn phím thật trên thiết bị.

## File phát sinh

Cache Python, pytest, Ruff, uv; metadata `*.egg-info`; dependency/build client và
kết quả Playwright được `.gitignore` loại khỏi mã nguồn. `.dockerignore` ở từng
build context loại các file cục bộ tương ứng. Không xóa `.venv`, dependency hoặc
metadata cài đặt để dọn source vì có thể ảnh hưởng môi trường phát triển hiện có.
Backup undo trong `.ui-backups/` được giữ cục bộ và không đóng gói vào service.
