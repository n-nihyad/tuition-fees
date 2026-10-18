# Học phí số — client

React + TypeScript client cho cổng thanh toán học phí. Ứng dụng hỗ trợ đăng
nhập, hiển thị hồ sơ người nộp và số dư, tra cứu MSSV, xác nhận toàn bộ học phí
bằng OTP email, và xem lịch sử giao dịch.

## Chạy cùng backend

Từ thư mục gốc repository, cấu hình `.env` theo `.env.example`, chạy gateway và
các service. Dữ liệu mẫu chỉ được thêm thủ công nếu cần, theo
[README services](../services/README.md); không tự seed khi khởi động.
Sau đó chạy client từ thư mục `client/`:

```powershell
pnpm install --frozen-lockfile
pnpm run dev
```

Vite chuyển tiếp `/api` tới API Gateway tại `http://localhost:8000`. Không gọi
trực tiếp service từ trình duyệt. Swagger UI đi qua gateway tại `/docs/user`,
`/docs/tuition` và `/docs/payment`.

Sau khi đăng nhập, client điều hướng qua các trang:

- `/dashboard` — tổng quan số dư và giao dịch gần đây.
- `/payment` — tra cứu học phí, thanh toán và xác thực OTP.
- `/history` — danh sách giao dịch.

Đường dẫn `/` chuyển về `/dashboard` và yêu cầu đăng nhập. Đường dẫn không xác
định hiển thị trang 404 với nút quay về tổng quan hoặc đăng nhập.
Giao diện hỗ trợ tiếng Việt và tiếng Anh; chọn ngôn ngữ bằng menu `VI` / `EN`
trên thanh điều hướng. Lựa chọn được lưu trên trình duyệt.

## Cấu trúc `src`

- `app/` — cấu hình ứng dụng, routes, Redux store và typed hooks.
- `features/<feature>/api/` — endpoint theo tính năng.
- `features/<feature>/hooks/` — React Query hooks và nghiệp vụ kết nối dữ liệu.
- `features/<feature>/components/` — UI trình bày của tính năng.
- `features/<feature>/pages/` — kết nối route với hooks và components.
- `features/<feature>/store/` — Redux slices cho trạng thái client cần chia sẻ giữa các trang.
- `@tanstack/react-query` cache dữ liệu server; feature không có trạng thái client riêng không cần tạo Redux slice rỗng.
- `shared/` — Axios client, layout, i18n, types và formatters dùng chung.
- `main.tsx`, `index.css`, `styles/` — entry point và stylesheet toàn cục.

Ranh giới dùng chung được ghi trong [shared/README.md](src/shared/README.md).
Thứ tự import CSS được giữ cố định tại `index.css`; xem
[styles/README.md](src/styles/README.md) trước khi chỉnh cascade.

## Kiểm tra

Chạy các lệnh dưới đây trong `client/`. Unit test cần Node 24 trở lên; kiểm thử
trình duyệt cần Google Chrome đã cài. Hướng dẫn backend và lệnh tổng hợp từ root
nằm trong [docs/testing.md](../docs/testing.md).

```powershell
pnpm run lint
pnpm run build
pnpm test
pnpm run test:e2e
```

`test:e2e` dùng Playwright + Chrome cài trên máy, tự khởi động Vite tại
`127.0.0.1:5177`. API được mô phỏng hoàn toàn: không đăng nhập hay thanh toán
trên dữ liệu thật. Kiểm tra các màn ở 360/390/1280 px, tương phản/nhãn bằng axe,
điều hướng bàn phím, mạng chậm, gửi trùng, reload giao dịch chờ, phản hồi sau
logout, 401 và lỗi tải chunk. Ảnh nằm trong `test-results/`; trace được giữ khi
test lỗi. Viewport thấp mô phỏng diện tích còn lại khi nhập liệu, không thay
thế kiểm tra bàn phím thật trên iOS/Android.

Client tải mã theo từng trang; login không tải layout đã đăng nhập hoặc bảng
lịch sử. Có màn phục hồi khi tải mã trang thất bại. Chỉ pointer giao dịch chờ
được lưu trong sessionStorage để phục hồi sau reload; trạng thái, số tiền và
quyền truy cập luôn lấy lại từ backend, không lưu OTP. `GET /api/payments`
hỗ trợ tham số tùy chọn `paymentId` để lấy lại đúng giao dịch của người đăng nhập.

Các request đọc có timeout 15 giây, tạo/xác nhận giao dịch 30 giây. Không tự
retry POST thanh toán; thao tác thử lại giữ nguyên idempotency key hiện có.


## Backend schema update

- Fee lookup returns all semesters in `fees`. Select a fee explicitly when multiple fees exist; requests include `tuitionFeeId`.
- A checkout intent gets a client-generated `idempotencyKey`. Retries keep the key until a different fee is selected or a terminal result is received. State is kept while navigating within the app. A pending payment ID is kept in sessionStorage; reloading payment fetches that authorized record from the server. History also supports resuming a pending payment.
- Use **Leave pending and pay another fee** in the OTP step to switch payment targets immediately. The original payment stays in server history with its original OTP deadline. Resume it using **View / resume** in history, including after a browser reload. Switching clears entered OTP, consent and the active retry key; resuming restores that payment's own key and target. No cancel API is called and OTP validity is never extended. One fee still allows only one open payment. Switching is disabled while a create/confirmation request is in flight. The backend expires overdue pending attempts before returning history, as well as when confirming or starting another attempt. Opening history fetches the updated statuses; there is no five-second polling.
- The client disables OTP submission when the displayed deadline has passed or the known attempt limit is exhausted. The backend remains authoritative; reconfirming an already successful payment returns its stored result without another debit.
- History uses server `limit` / `offset` pagination and displays fee names, completion times, and balance before debit. No static academic-year filter, fake payment method or inactive export control is displayed.
- Missing wallets are shown as an account setup state; lookup still works and payment is disabled.
- Payment state and cached account data clear when switching accounts.

Checks: `pnpm run build`, `pnpm run lint`, `pnpm test`. The dependency-free test runner uses Node 24's native TypeScript support and module hooks.

## Session expiry

The client watches the access token's `exp` claim and signs out after the delay in
`SESSION_EXPIRY_DELAY_MS` (`src/shared/auth/sessionExpiry.ts`), currently 1500 ms,
including while idle. An authenticated API response with HTTP 401 starts the same
countdown immediately; duplicate responses do not restart it and queries do not
retry 401 errors. Invalid login credentials are excluded. Sign-out removes the
stored token, payment/OTP state and query cache before returning to login.
Responses and timers associated with an older token cannot sign out a newer
login. Browser timers may be delayed when a tab is suspended; the backend always
validates JWTs independently.
