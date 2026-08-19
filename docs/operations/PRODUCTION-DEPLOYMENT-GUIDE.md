# Hướng dẫn Triển khai Production Toàn diện (Render, Vercel & LINE/LIFF Integration)

Tài liệu này hướng dẫn chi tiết quy trình đóng gói (build), cấu hình môi trường và triển khai toàn bộ dự án **RoGym - Gym Management System** lên môi trường Production thực tế.

---

## 📐 1. Kiến trúc Triển khai Tổng quan

Dự án được triển khai độc lập theo mô hình Decoupled Architecture:

```mermaid
flowchart TD
    User["📱 Người dùng trên Ứng dụng LINE"] -->|1. Mở Rich Menu / LIFF App| Vercel["⚡ Vercel (Frontend Client)"]
    Vercel -->|2. REST API Requests| Render["🚀 Render (Backend NestJS API)"]
    Render -->|3. Truy vấn / Lưu trữ dữ liệu| DB[("🐘 Supabase / PostgreSQL DB")]
    LINEConsole["💬 LINE Messaging API / Webhook"] <-->|4. Push Notification & Webhook Callbacks| Render
    Vercel <-->|5. Authenticate & Profile SDK| LINEConsole
```

| Thành phần | Công nghệ / Nền tảng | Địa chỉ Hosting | Vai trò |
| :--- | :--- | :--- | :--- |
| **Frontend (Client)** | React 18, Vite, `@line/liff` SDK | **Vercel** | Giao diện Hội viên, Staff, Trainer, Owner & Webview LIFF |
| **Backend (Server)** | NestJS, Prisma ORM, Passport JWT | **Render** (Web Service) | RESTful API v1, Webhook receiver, Push Notifications Engine |
| **Database** | PostgreSQL (Supabase / Render Postgres) | **Supabase** (hoặc Render) | Cơ sở dữ liệu quan hệ (20 models, RBAC, Sessions) |
| **LINE Integration** | LINE Messaging API, LINE LIFF | **LINE Developers Console** | Xác thực người dùng, Webhook sự kiện, Rich Menu 4 vùng |

---

## 🗄️ 2. Bước 1: Khởi tạo Cơ sở Dữ liệu Production (Supabase / Postgres)

### 2.1 Lấy thông số kết nối Database
Nếu sử dụng Supabase, bạn cần lấy 2 chuỗi kết nối:
1. `DATABASE_URL`: Transaction Pooler (Port `6543`) - Dùng cho NestJS Runtime.
2. `DIRECT_URL`: Direct Connection (Port `5432`) - Dùng cho Prisma Migrations/Push.

### 2.2 Cập nhật Schema & Khởi tạo Dữ liệu ban đầu
Sau khi kết nối DB, thực hiện các lệnh sau trên terminal địa phương để đồng bộ Schema và tạo dữ liệu ban đầu:

```bash
cd server

# 1. Tạo Prisma Client mới nhất
npm run prisma:generate

# 2. Đẩy Schema Prisma lên Database Production
npm run prisma:push

# 3. Đồng bộ danh sách Quyền hạn (RBAC Permissions & Groups)
npm run prisma:sync:rbac

# 4. Khởi tạo tài khoản Quản trị viên (Owner) mặc định
npm run prisma:seed
```

> [!NOTE]
> Tài khoản Owner mặc định sau khi seed:
> - **Email**: `owner@gym.local`
> - **Mật khẩu**: `Password123!`

---

## 🚀 3. Bước 2: Triển khai Backend API lên Render (Web Service)

### 3.1 Tạo Web Service mới trên Render
1. Đăng nhập [Render.com](https://render.com) → Chọn **New +** → **Web Service**.
2. Kết nối tới Git Repository chứa dự án của bạn.
3. Thiết lập các thông số chính:
   - **Name**: `rogym-server-api` (hoặc tên tùy chọn)
   - **Region**: Singapore (ap-southeast-1) để tối ưu độ trễ với Việt Nam.
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### 3.2 Cấu hình Biến Môi trường (Environment Variables) trên Render
Vào phần **Environment** của Web Service trên Render và thêm các biến sau:

| Biến môi trường | Giá trị đề xuất / Lưu ý | Mô tả |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Bật chế độ Production cho NestJS |
| `PORT` | `3000` (hoặc để Render tự cấp) | Cổng chạy ứng dụng Backend |
| `DATABASE_URL` | `postgresql://user:pass@ep-host.supabase.com:6543/postgres?pgbouncer=true` | Connection string runtime (Pooler) |
| `DIRECT_URL` | `postgresql://user:pass@ep-host.supabase.com:5432/postgres` | Connection string trực tiếp |
| `JWT_SECRET` | `Chuỗi_Bảo_Mật_Ngẫu_Nhiên_Rất_Dài_Và_Phức_Tạp_2026` | Khoá mã hoá JWT Token |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn hiệu lực của JWT Token |
| `CLIENT_URL` | `https://rogym-client.vercel.app` | URL trang Frontend trên Vercel (dùng cho CORS) |
| `LINE_MESSAGING_ENABLED` | `true` | **Kích hoạt gửi tin nhắn LINE thật** |
| `LINE_MOCK_ENABLED` | `false` | **Tắt chế độ giả lập Mock** |
| `LINE_CHANNEL_ACCESS_TOKEN` | `Channel_Access_Token_Dài_Từ_LINE_Console` | Token phát ra từ LINE Messaging API Channel |
| `LINE_CHANNEL_SECRET` | `Channel_Secret_32_Ký_Tự_Từ_LINE_Console` | Khóa bí mật dùng kiểm tra chữ ký Webhook HMAC |
| `LINE_LIFF_URL` | `https://liff.line.me/2010144670-0RJwlyfv` | Liên kết LIFF chính thức từ LINE Console |

---

## ⚡ 4. Bước 3: Triển khai Frontend lên Vercel

### 4.1 Chuẩn bị File Đặt tuyến SPA (`client/vercel.json`)
Dự án đã có sẵn file [`client/vercel.json`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/vercel.json) nhằm ngăn chặn lỗi 404 khi điều hướng hoặc làm mới trang trong React Router:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 4.2 Tạo Project mới trên Vercel
1. Đăng nhập [Vercel.com](https://vercel.com) → Chọn **Add New...** → **Project**.
2. Import Git Repository của dự án.
3. Thiết lập thông số cấu hình:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` (Bấm Edit và chọn thư mục `client`)
   - **Build Command**: `npm run build` (`tsc && vite build`)
   - **Output Directory**: `dist`

### 4.3 Cấu hình Biến Môi trường (Environment Variables) trên Vercel
Thêm các biến môi trường sau trong thiết lập Vercel Project Settings:

| Biến môi trường | Giá trị đề xuất / Lưu ý | Mô tả |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://rogym-server-api.onrender.com/api/v1` | URL API chính thức trên Render |
| `VITE_LIFF_ID` | `2010144670-0RJwlyfv` | LIFF App ID chính thức từ LINE Developers Console |
| `VITE_LIFF_MOCK` | `false` | **Tắt plugin LIFF Mock trên Production** |

---

## 📲 5. Bước 4: Cấu hình LINE Developers Console

### 5.1 Tạo Provider & Channels
1. Truy cập [LINE Developers Console](https://developers.line.biz/).
2. Tạo một **Provider** mới (ví dụ: `RoGym Fitness`).
3. Tạo 2 Channel chính:
   - **Messaging API Channel** (Tài khoản LINE Official Account).
   - **LINE Login Channel** (Dùng cho LIFF Integration).

### 5.2 Cấu hình LIFF Application
1. Trong Channel **LINE Login**, chuyển sang tab **LIFF** → bấm **Add**.
2. Thiết lập thông số LIFF App:
   - **LIFF app name**: `RoGym Member App`
   - **Size**: `Full`
   - **Endpoint URL**: `https://rogym-client.vercel.app/liff` (URL Vercel kèm đường dẫn `/liff`)
   - **Scopes**: Đánh tích chọn `profile`, `openid`.
   - **Bot prompt**: chọn `Normal` (hoặc `Aggressive`).
3. Lưu lại và sao chép **LIFF ID** thu được (dạng `2010144670-0RJwlyfv`).

### 5.3 Cấu hình Messaging API Webhook
1. Trong Channel **Messaging API**, cuộn xuống phần **Messaging API settings**.
2. Thiết lập **Webhook URL**:
   `https://rogym-server-api.onrender.com/api/v1/line/webhook`
3. Bật công tắc **Use webhook** thành `Enabled`.
4. Bấm nút **Verify** để xác nhận Webhook phản hồi `200 OK`.
5. Tạo một **Channel Access Token (v2.1)** dài hạn và lưu vào cấu hình Render.

---

## 🎨 6. Bước 5: Đồng bộ Rich Menu 4 vùng lên LINE Official Account

Sau khi Backend trên Render và các thông số LINE đã sẵn sàng, chạy script đẩy Rich Menu 4 vùng chính thức lên tài khoản LINE OA:

```bash
cd server

# Chạy script đồng bộ Rich Menu với các biến môi trường Production
dotenv -e .env.production -- ts-node --transpile-only scripts/sync-rich-menu.ts
```

Script sẽ thực hiện tự động:
1. Xóa các Rich Menu cũ chưa khớp.
2. Tạo Rich Menu mới 4 vùng với kích thước chuẩn **2500 × 843 px**:
   - **Vùng 1**: Lịch tập (`/liff?redirect=/member/workout/sessions`)
   - **Vùng 2**: Đặt lịch PT (`/liff?redirect=/member/workout/sessions?book=1`)
   - **Vùng 3**: Check-in (`/liff?redirect=/member/attendance`)
   - **Vùng 4**: Hồ sơ cá nhân (`/liff?redirect=/member/profile`)
3. Upload ảnh nền Rich Menu.
4. Đặt làm Rich Menu mặc định (**Default Rich Menu**) cho toàn bộ người dùng follow LINE OA.

---

## 🧪 7. Kiểm tra & Xử lý Sự cố (Troubleshooting)

### 7.1 Quy trình Kiểm tra sau Triển khai (Post-Deployment Verification)
1. **Kiểm tra Healthcheck API**:
   Truy cập `https://rogym-server-api.onrender.com/health` → Phải trả về `{"status":"ok"}`.
2. **Kiểm tra Đăng nhập & CORS**:
   Truy cập `https://rogym-client.vercel.app` → Thử đăng nhập tài khoản Owner (`owner@gym.local` / `Password123!`).
3. **Kiểm tra LIFF trên ứng dụng LINE thật**:
   Mở ứng dụng LINE trên điện thoại → Tìm tài khoản RoGym Official Account → Bấm vào nút bất kỳ trên Rich Menu → Màn hình Webview LIFF phải tự động mở và đăng nhập thông suốt.

### 7.2 Xử lý Sự cố Thường gặp

#### 🔴 Lỗi `404 Not Found` khi làm mới trang trên Vercel
- **Nguyên nhân**: Thiếu cấu hình SPA rewrites.
- **Khắc phục**: Kiểm tra file `client/vercel.json` đã được commit lên Git chưa.

#### 🔴 Lỗi `CORS Error` khi gọi API từ Frontend đến Render
- **Nguyên nhân**: Biến `CLIENT_URL` trên Render chưa khớp với domain Vercel.
- **Khắc phục**: Đảm bảo `CLIENT_URL` trên Render là `https://rogym-client.vercel.app` (không có dấu slash `/` ở cuối).

#### 🔴 Lỗi `LINE webhook signature khong hop le` (HTTP 401)
- **Nguyên nhân**: Sai `LINE_CHANNEL_SECRET`.
- **Khắc phục**: Kiểm tra lại chuỗi Secret trong Messaging API Settings trên LINE Developers Console.
