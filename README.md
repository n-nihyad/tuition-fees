# Hệ thống thanh toán học phí

Monorepo gồm React client, API Gateway và ba service. PostgreSQL có **hai database**:
`user_db` do User Service quản lý; `payment_db` do Payment Service quản lý.
Tuition Service chuyển tiếp tra cứu học phí, không có database riêng.

## Khởi động bằng Docker

Mở PowerShell tại thư mục dự án. Tạo `.env` từ `.env.example` nếu chưa có, điền
khóa JWT, khóa nội bộ, mật khẩu PostgreSQL và thông tin SMTP để nhận OTP.

```powershell
Copy-Item .env.example .env
```

Chỉnh giá trị trong `.env`, rồi chạy:

```powershell
docker compose up -d --build
docker compose ps
```

Migration tự chạy khi User Service và Payment Service khởi động. Lần khởi tạo mới
chỉ tạo schema, không tự tạo tài khoản, ví, học phí hoặc giao dịch.

| Giao diện | URL mặc định |
| --- | --- |
| Client | http://localhost:8080 |
| Swagger User | http://localhost:8000/docs/user |
| Swagger Payment | http://localhost:8000/docs/payment |
| Swagger Tuition | http://localhost:8000/docs/tuition |

Cổng client có thể đổi bằng `CLIENT_PORT` trong `.env`.

## Dữ liệu mẫu tùy chọn

[`scripts/demo_account.sql`](scripts/demo_account.sql) là mẫu để tự chỉnh và chạy
thủ công. Đổi email trước khi thử OTP. Script không được chạy khi startup hoặc test.

```powershell
Get-Content -Raw -Encoding UTF8 .\scripts\demo_account.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d user_db
```

Sau khi chạy mẫu, đăng nhập bằng `demo1` / `De123`. Chi tiết dữ liệu và cách chạy
lại script nằm trong [README services](services/README.md).

## Phát triển và kiểm thử

- [Client](client/README.md): chạy Vite, tổ chức UI/CSS và kiểm thử giao diện.
- [Services](services/README.md): schema, API, migration và quyền sở hữu dữ liệu.
- [Thiết kế hệ thống](docs/system-design.md): sơ đồ và luồng giao dịch.
- [Chạy test](docs/testing.md): môi trường Python, lệnh từ root và PostgreSQL test riêng.

Sau khi kích hoạt môi trường Python đã cài dependencies kiểm thử:

```powershell
python .\scripts\test_backend.py
pnpm run test:client
pnpm run check:client
```

## Tổ chức thư mục

| Thư mục | Nội dung |
| --- | --- |
| `client/` | React, chia theo feature; thành phần dùng chung trong `src/shared/` |
| `gateway/` | Proxy HTTP và Swagger |
| `services/` | User, payment, tuition; mỗi service có app và tests riêng |
| `infra/` | Khởi tạo hai database PostgreSQL |
| `scripts/` | Mẫu SQL thủ công và trình chạy test |
| `docs/` | Thiết kế và hướng dẫn kiểm thử |

`.venv`, cache, `*.egg-info`, `node_modules`, `dist`, kết quả Playwright và
`.ui-backups` là file cục bộ/phát sinh, được ignore. Giữ lockfile của client,
migration và `.env.example` trong mã nguồn. Mỗi Docker build dùng context riêng
của client/gateway/service, với `.dockerignore` tương ứng.

Bản source không kèm dependency, môi trường ảo, cache, build output hoặc backup
undo. Docker build tự cài dependencies và build client; không cần tạo `.venv`
hay cài Node/Python trên máy host để chạy stack. Cần Docker có kết nối tới image
registry và package registry. `.env` chứa cấu hình riêng nên phải tạo lại từ mẫu;
không thể tự khôi phục mật khẩu, khóa bí mật hay dữ liệu cũ bằng lệnh build.

## Dừng hoặc reset

`docker compose down` dừng stack và giữ volume. Chỉ khi muốn **xóa toàn bộ dữ liệu
PostgreSQL, Redis và MongoDB** của dự án mới dùng:

```powershell
docker compose down --volumes --remove-orphans
```

Sau đó chạy lại `docker compose up -d --build` để tạo schema trống.
