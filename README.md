# Tuition Fees

Hướng dẫn cài đặt và chạy ứng dụng từ source trên Windows. Repository gồm:

- `server/`: REST API dùng FastAPI, SQLAlchemy và PostgreSQL.
- `client/`: giao diện React/Vite.
- `server/compose.yml`: cấu hình PostgreSQL và các service phụ trợ.

## Yêu cầu

- Windows 10/11 và PowerShell.
- Python 3.12 trở lên.
- Node.js 20.19+ hoặc 22.12+ và Corepack (để dùng pnpm theo `client/pnpm-lock.yaml`).
- Docker Desktop đang chạy, dùng để khởi động PostgreSQL.

## Chạy backend

Mở PowerShell tại thư mục gốc repository:

```powershell
cd .\server
Copy-Item .env.example .env
```

Mở `server/.env`, thay `JWT_SECRET_KEY` bằng secret ngẫu nhiên dài ít nhất 32 ký tự. Giữ `DATABASE_URL` trỏ tới PostgreSQL cục bộ theo cấu hình trong file mẫu.

Khởi động PostgreSQL:

```powershell
docker compose up -d postgres
```

Tạo virtual environment, cài dependency và khởi tạo database:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Khởi động API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

API chạy tại `http://localhost:8000`; tài liệu OpenAPI có tại
`http://localhost:8000/docs`. Giữ cửa sổ terminal này mở khi sử dụng ứng dụng.

> Nếu máy có nhiều phiên bản Python, bảo đảm `py -m venv .venv` chọn Python 3.12 trở lên. Có thể kiểm tra bằng `.\.venv\Scripts\python.exe --version`.

### Tạo tài khoản thử nghiệm

Sau khi PostgreSQL đã chạy và migration hoàn tất, mở PowerShell thứ hai tại `server/` và chạy:

```powershell
Get-Content .\scripts\seed_test_account.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d tuition-fees
```

Tài khoản đăng nhập thử:

```text
Username: payer1
Password: correct-password
```

Script seed chỉ dành cho môi trường phát triển; không dùng tài khoản này trong production.

## Chạy frontend

Mở PowerShell khác tại thư mục gốc repository:

```powershell
cd .\client
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Mở địa chỉ Vite được in trong terminal (mặc định `http://localhost:5173`). Trong chế độ phát triển, client gọi API qua proxy của Vite (`/api` → `http://localhost:8000`), vì vậy không cần cấu hình CORS cho luồng này. Nếu API chạy ở địa chỉ khác, sửa đích proxy trong `client/vite.config.ts`; nếu muốn gọi API trực tiếp, đặt `VITE_AUTH_API_URL` trong `client/.env` và cấu hình `CORS_ORIGINS` ở server cho đúng origin của client.

Không cần tạo file `client/.env` khi dùng API mặc định qua proxy. Để gọi API trực tiếp ở địa chỉ khác, tạo file đó với nội dung, ví dụ:

```dotenv
VITE_AUTH_API_URL=http://localhost:8000/api/v1/auth
```

## Chạy bằng Docker Compose

Compose có thể chạy API và PostgreSQL cùng lúc. Từ `server/`, tạo `server/.env` như phần backend ở trên, đặt `DATABASE_URL` dùng hostname `postgres` thay vì `localhost`, rồi chạy:

```powershell
docker compose up --build
```

API sẽ lắng nghe tại `http://localhost:8000`. Để dừng các service:

```powershell
docker compose down
```

## Kiểm tra và xử lý lỗi thường gặp

- `ModuleNotFoundError`: cài package vào đúng virtual environment bằng `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`; khởi chạy Uvicorn bằng chính Python trong `.venv`.
- Không kết nối được database: kiểm tra Docker Desktop và `docker compose ps`; khi chạy API trực tiếp trên máy, `DATABASE_URL` phải dùng `localhost`. Khi API chạy trong Compose, hostname là `postgres`.
- Lỗi xác thực cấu hình: `JWT_SECRET_KEY` phải có ít nhất 32 ký tự.
- Client không gọi được API: kiểm tra API đang chạy cổng `8000` và `VITE_AUTH_API_URL` có giá trị đúng. Khởi động lại Vite sau khi sửa file `.env`.

Chạy backend test từ `server/`:

```powershell
.\.venv\Scripts\python.exe -m pytest
```