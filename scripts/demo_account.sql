-- MẪU TẠO TÀI KHOẢN + VÍ + HỌC PHÍ. Chỉ chạy thủ công bằng psql.
-- File dùng \connect và \gset để làm việc với HAI database; không chạy bằng
-- SQLAlchemy hoặc trình SQL chỉ hỗ trợ câu lệnh SQL thuần.
-- Không được thêm file này vào migration hoặc Docker entrypoint.
--
-- Tài khoản mẫu: demo1 / De123, role student.
-- Ví mẫu: 5.000.000; học phí SV001: 850.000, chưa thanh toán.
-- Thay email bằng địa chỉ nhận thư thật trước khi thử OTP.
--
-- Chạy từ thư mục gốc dự án KHI BẠN MUỐN:
-- Get-Content -Raw -Encoding UTF8 .\scripts\demo_account.sql |
--   docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d user_db
--
-- Thêm tài khoản: sao chép các block bên dưới, đổi UUID/username/email/MSSV,
-- đổi username trong SELECT ... \gset, rồi khai báo ví và phí tương ứng.
-- Có thể dùng cùng hash dưới đây nếu mật khẩu vẫn là De123.
-- Nếu đổi mật khẩu, tạo hash bằng hash_password() của User Service;
-- tuyệt đối không đặt mật khẩu plaintext vào cột password_hash.
--
-- Chạy lại không sửa tài khoản đã có, không nạp lại số dư, không mở lại phí
-- đã trả. Có thể chạy lại sau lỗi ở database thứ hai; hai database không có
-- transaction chung. Username trùng sẽ sử dụng ID của tài khoản đang tồn tại.

\set ON_ERROR_STOP on

-- =========================================================
-- 1. USER DB: tài khoản
-- =========================================================
\connect user_db

BEGIN;

INSERT INTO users (
    id, username, password_hash, full_name, phone, email,
    mssv, is_active, role, token_version
)
VALUES (
    '11111111-1111-4111-8111-111111111111', -- UUID mới nếu thêm user khác
    'demo1',
    '$argon2id$v=19$m=65536,t=3,p=4$IRPljWGmRxoWwhACVV11Kg$Pe6hnaEBHMnpjmOoqVsbnRL0LMfM+A4jT+pP+VGwQCY',
    'Nguyen Van A',
    '0900000000',
    'demo1@example.test',                -- Điền email nhận OTP thật
    'SV001',
    TRUE,
    'student',
    0
)
ON CONFLICT (username) DO NOTHING;

-- Lấy ID thật, kể cả demo1 đã được tạo trước đó với UUID khác.
-- Không cập nhật mật khẩu/thông tin của tài khoản đã có.
SELECT id AS demo_user_id FROM users WHERE username = 'demo1' \gset

COMMIT;

-- =========================================================
-- 2. PAYMENT DB: ví của chính tài khoản bên trên
-- =========================================================
\connect payment_db

BEGIN;

INSERT INTO wallets (user_id, available_balance)
VALUES (
    :'demo_user_id'::uuid,
    5000000.00                           -- Số dư khởi tạo; không ghi đè khi chạy lại
)
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================
-- 3. PAYMENT DB: học phí mẫu để tra cứu và thanh toán
-- =========================================================
INSERT INTO tuition_fees (id, mssv, full_name, name, amount, status)
VALUES (
    '22222222-2222-4222-8222-222222222222', -- UUID mới cho MỖI khoản phí
    'SV001',
    'Nguyen Van A',
    'Hoc phi hoc ky 1 - Nam hoc 2026-2027',
    850000.00,
    'unpaid'
)
ON CONFLICT (id) DO NOTHING;

-- Thêm học phí: sao chép VALUES phía trên, đổi UUID, tên học kỳ và số tiền.
-- Một MSSV được có nhiều khoản phí. Khi đó POST /api/payments cần tuitionFeeId.
-- Ví dụ thêm dòng bằng dấu phẩy trước ON CONFLICT:
-- , (
--     '22222222-2222-4222-8222-333333333333',
--     'SV001', 'Nguyen Van A',
--     'Hoc phi hoc ky 2 - Nam hoc 2026-2027', 1200000.00, 'unpaid'
-- )

-- Không tạo payments giả. Dùng API tạo thanh toán và xác nhận OTP để sinh
-- lịch sử thật, ghi balance_before và trừ số dư đúng transaction.
COMMIT;
