# Hướng dẫn chạy và kiểm thử LIFF Mock

LIFF Mock là môi trường local để phát triển luồng LIFF login, deep link và LINE Messaging mà không gọi dịch vụ LINE thật. Nó dùng một member cố định là **LIFF Mock Member**, tự tạo hoặc tái sử dụng trong database development.

> Chỉ chạy trên development. Backend từ chối khởi động nếu `LINE_MOCK_ENABLED=true` trong production.

## 1. Điều kiện trước khi chạy

- Node.js 20+ và npm đã được cài đặt.
- Đã cài dependencies cho cả `server/` và `client/` bằng `npm install`.
- `server/.env` có ít nhất `DATABASE_URL` và `JWT_SECRET` hợp lệ. LIFF Mock vẫn dùng database local/dev để tạo tài khoản member và trả JWT của hệ thống.

Không cần cung cấp `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` hay một LIFF ID thật.

## 2. Khởi động môi trường

Mở hai PowerShell terminal tại thư mục gốc dự án.

### Terminal 1: backend

```powershell
cd server
npm run dev:line-mock
```

Lệnh này đặt `LINE_MOCK_ENABLED=true` cho process hiện tại. Nó thay thế xác minh token với LINE và chặn tất cả request push/reply ra `api.line.me`.

### Terminal 2: frontend

```powershell
cd client
Copy-Item .env.liff-mock.example .env.liff-mock
npm run dev:liff-mock
```

`dev:liff-mock` chạy Vite ở mode `liff-mock`; file `.env.liff-mock` bật `VITE_LIFF_MOCK=true`, dùng LIFF ID giả và proxy API về `http://127.0.0.1:3000`.

Mở các URL sau khi cả hai server đã sẵn sàng:

| Mục đích | URL |
| --- | --- |
| Đăng nhập LIFF mock | `http://localhost:5173/liff` |
| LINE Mock inbox | `http://localhost:5173/dev/line-mock` |
| Swagger backend | `http://localhost:3000/api/v1/docs` |

## 3. Kiểm tra thủ công

### Luồng LIFF login

1. Mở `http://localhost:5173/liff`.
2. LIFF Mock tự trả một session đăng nhập, ID token mock và profile **LIFF Mock Member**.
3. Backend xác thực token mock, tạo/tái sử dụng member, phát JWT ứng dụng và chuyển sang `/member`.
4. Nếu member chưa có gói tập active, ứng dụng có thể hiển thị màn hình yêu cầu đăng ký/gia hạn. Đây là hành vi của nghiệp vụ subscription, không phải lỗi LIFF Mock.

Để kiểm tra deep link, truy cập ví dụ sau:

```text
http://localhost:5173/liff?redirect=%2Fmember%2Fattendance
```

Sau login, URL chỉ được phép chuyển tới route `/member/...`; redirect không an toàn sẽ quay về `/member`.

### LINE Messaging inbox

1. Mở `http://localhost:5173/dev/line-mock`.
2. Nhấn **Follow** để tạo webhook Follow có chữ ký nội bộ. Outbox sẽ xuất hiện Reply message kèm link mở LIFF.
3. Nhấn **Unfollow** để mô phỏng việc OA bị unfollow; backend hủy liên kết `lineId` của member mock.
4. Nhấn **Mở LIFF link** để kiểm tra redirect trong tin nhắn.
5. Nhấn **Xóa inbox** để dọn outbox.

Outbox nằm trong bộ nhớ, không ghi database và tự xóa khi backend restart.

## 4. API development-only

Các endpoint này chỉ hoạt động khi backend đang chạy bằng `npm run dev:line-mock`; ở mode bình thường chúng trả `404`.

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/v1/dev/line-mock/messages` | Lấy outbox hiện tại |
| `DELETE` | `/api/v1/dev/line-mock/messages` | Xóa outbox |
| `POST` | `/api/v1/dev/line-mock/events` | Tạo event `follow` hoặc `unfollow` |

Ví dụ gọi từ PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/dev/line-mock/messages

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/v1/dev/line-mock/events `
  -ContentType application/json `
  -Body '{"type":"follow"}'

Invoke-RestMethod `
  -Method Delete `
  -Uri http://localhost:3000/api/v1/dev/line-mock/messages
```

## 5. Chạy test và build

Chạy test đầy đủ trước khi merge thay đổi liên quan LIFF/LINE:

```powershell
cd client
npm test
npm run lint
npm run build
```

```powershell
cd server
npm test -- --runInBand
npm run lint
npx nest build
```

Không dùng `npm run build` của server chỉ để kiểm tra TypeScript: script đó còn chạy `prisma db push`. Chỉ chạy nó khi bạn chủ động đồng bộ schema database.

## 6. Xử lý lỗi thường gặp

| Triệu chứng | Kiểm tra/cách xử lý |
| --- | --- |
| Backend không khởi động, báo thiếu `DATABASE_URL` | Tạo/cập nhật `server/.env` từ `server/.env.example` với database development hợp lệ. |
| Inbox báo không tải được | Kiểm tra backend chạy bằng `npm run dev:line-mock`, không phải `npm run dev`. |
| `/dev/line-mock` chuyển về trang chủ | Kiểm tra frontend chạy `npm run dev:liff-mock` và `client/.env.liff-mock` có `VITE_LIFF_MOCK=true`. |
| LIFF login trả lỗi token mock | Hai server phải cùng là mode mock; restart backend bằng `npm run dev:line-mock` và frontend bằng `npm run dev:liff-mock`. |
| Không vào được dashboard member | Kiểm tra trạng thái subscription của member mock; LIFF login thành công không tự cấp gói tập. |

## 7. Giới hạn và an toàn

- Môi trường này không kiểm tra LINE login thật, consent screen, quyền của channel, LIFF browser hay deep link qua ứng dụng LINE.
- Trước release, tắt mock và kiểm tra lại với `VITE_LIFF_ID`, `LINE_CHANNEL_ID` và `LINE_LIFF_URL` thật.
- Không commit `.env.liff-mock`, `.env.local` hoặc credential LINE. Không đặt `LINE_MOCK_ENABLED=true` ở staging/production.
