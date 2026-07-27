# Hệ Thống Quản Lý Phòng Tập Gym

**Demo deploy:** [https://gym-management-system-liart-three.vercel.app/](https://gym-management-system-liart-three.vercel.app/)

## Mục lục

- [Mô tả dự án](#1-mô-tả-dự-án)
- [Đối tượng sử dụng](#2-đối-tượng-sử-dụng)
- [Chức năng chính](#3-chức-năng-chính)
- [Công nghệ sử dụng](#4-công-nghệ-sử-dụng)
- [Chạy thử nhanh (demo)](#5-chạy-thử-nhanh-demo)
- [Triển khai từ mã nguồn](#6-triển-khai-từ-mã-nguồn)
- [Đóng góp](#7-đóng-góp)

---

## 1. Mô Tả Dự Án

Hệ thống quản lý phòng tập gym được thiết kế nhằm hỗ trợ chủ phòng tập và nhân viên trong việc quản lý hiệu quả các hoạt động vận hành, bao gồm:

- Quản lý phòng tập và thiết bị
- Quản lý nhân sự, lịch làm việc và chấm công
- Quản lý hội viên, gói tập và thanh toán
- Lập lịch và theo dõi buổi tập (training session, workout plan)
- Tiếp nhận và xử lý phản hồi hội viên
- Báo cáo thống kê doanh thu và hiệu suất

---

## 2. Đối Tượng Sử Dụng

| Đối tượng | Vai trò |
|---|---|
| **Chủ phòng tập (Owner)** | Quản lý tổng thể: doanh thu, nhân sự, RBAC, gói tập, báo cáo |
| **Nhân viên quản lý (Staff)** | Đăng ký hội viên, gia hạn gói, xử lý phản hồi, quản lý phòng/thiết bị |
| **Huấn luyện viên (Trainer / PT)** | Quản lý học viên, lịch tập, workout plan, ghi tiến độ |
| **Hội viên (Member)** | Xem gói tập, lịch tập, workout plan, gửi phản hồi |

---

## 3. Chức Năng Chính

- **Tài khoản & bảo mật:** Đăng nhập JWT, xác thực email OTP, quên/đặt lại mật khẩu, đổi mật khẩu, đăng ký hội viên online.
- **Quản lý hội viên:** Hồ sơ cá nhân, gán/chọn trainer, theo dõi tiến độ luyện tập.
- **Gói tập & thanh toán:** Mua/gia hạn/hủy gói, ghi nhận thanh toán, hóa đơn, đối soát.
- **Nhân sự:** Hồ sơ, lịch làm việc, chấm công vào/ra, đánh giá hiệu suất.
- **Workout Plan & Training:** Thư viện bài tập, xây dựng plan, lập lịch training session, nhật ký buổi tập, check-in hội viên.
- **Phòng tập & thiết bị:** CRUD phòng, thiết bị, nhật ký bảo trì.
- **Phản hồi:** Gửi/xử lý phản hồi theo loại (nhân viên, thiết bị, dịch vụ).
- **Báo cáo & thống kê (Owner):** Doanh thu, hội viên mới, tỷ lệ gia hạn, hiệu suất nhân viên.
- **RBAC:** Quản lý nhóm quyền và phân quyền người dùng.

---

## 4. Công Nghệ Sử Dụng

Dự án gồm **2 project độc lập**: `client/` và `server/`. Mỗi bên tự quản lý `package.json` và `node_modules` riêng.

**Frontend** (`client/`)

- Vite 5 + React 18 + TypeScript
- TailwindCSS 3, shadcn/ui
- Zustand (state), TanStack Query (server state)
- React Router 6, React Hook Form
- Axios, Recharts, GSAP, lucide-react

**Backend** (`server/`)

- Node.js 20 + Express 4 + TypeScript
- PostgreSQL + Prisma ORM
- JWT (`jsonwebtoken`), bcryptjs
- Winston (logging), Helmet, CORS, Morgan
- `tsx` cho dev/watch

---

## 5. Chạy Thử Nhanh (Demo)

Truy cập bản deploy tại:

**[https://gym-management-system-teal-three.vercel.app/](https://gym-management-system-teal-three.vercel.app/)**

> Không cần cài đặt gì. Backend và database đã được host sẵn.

### Tài khoản demo

> **Lưu ý:** Mã OTP chung cho môi trường demo là `111111` (áp dụng cho tất cả bước xác thực email và đặt lại mật khẩu).

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Chủ phòng tập (Owner) | `owner@gym.local` | `Password123!` |
| Nhân viên (Staff) | `staff.linh@gym.local` | `Password123!` |
| Huấn luyện viên (Trainer) | `trainer.huong@gym.local` | `Password123!` |
| Hội viên (Member) | `gia.bao.mock@gym.local` | `Password123!` |

---

## 6. Triển Khai Từ Mã Nguồn

### 6.1 Yêu cầu

- Node.js >= 20 (xem `client/.nvmrc` hoặc `server/.nvmrc`)
- PostgreSQL >= 14 **hoặc** tài khoản [Supabase](https://supabase.com) (khuyến nghị)
- npm >= 10 (đi kèm Node 20)

### 6.2 Clone và cài đặt

```bash
git clone https://github.com/nhithedev/gym-management-system.git
cd gym-management-system
```

### 6.3 Cấu hình Server

```bash
cd server
cp .env.example .env
```

Mở `server/.env` và điền các giá trị sau:

| Biến | Mô tả |
|---|---|
| `DATABASE_URL` | Connection string runtime PostgreSQL (Supavisor Session Pooler — port **5432** nếu dùng Supabase) |
| `JWT_SECRET` | Chuỗi bí mật dài, ngẫu nhiên (tối thiểu 32 ký tự) |
| `JWT_EXPIRES_IN` | Thời gian hết hạn token, ví dụ `7d` |
| `CLIENT_URL` | URL frontend, ví dụ `http://localhost:5173` |
| `PORT` | Cổng server (mặc định `3000`) |
| `DEMO_MASTER_OTP` | *(Tùy chọn)* OTP tĩnh cho demo — **không set trên production** |
| `EXERCISEDB_API_KEY` | *(Tùy chọn)* API key RapidAPI ExerciseDB; chỉ cần khi chủ động nạp snapshot catalog |
| `EXERCISEDB_SYNC_ENABLED` | Đặt `true` tạm thời khi chạy `cd server; npm run exercise:catalog:sync`; mặc định `false` |
| `EXERCISEDB_SCHEDULER_ENABLED` | Bật cron sync định kỳ; giữ `false` cho nạp một lần |
| `EXERCISEDB_MIN_EXPECTED_COUNT` | Ngưỡng record tối thiểu để chặn payload ExerciseDB bị cắt ngắn; chốt từ staging trước production |
| `LINE_CHANNEL_ID` | *(Tùy chọn)* ID số của LINE Login channel sở hữu LIFF app; backend dùng để verify LINE ID token |
| `LINE_MESSAGING_ENABLED` | `true` khi bật LINE Messaging webhook/push/reminder; mặc định `false` |
| `LINE_CHANNEL_SECRET` | Bắt buộc khi `LINE_MESSAGING_ENABLED=true`; lấy từ LINE Messaging API channel |
| `LINE_CHANNEL_ACCESS_TOKEN` | Bắt buộc khi `LINE_MESSAGING_ENABLED=true`; channel access token của LINE Messaging API |
| `LINE_LIFF_URL` | Bắt buộc khi `LINE_MESSAGING_ENABLED=true`; public LIFF URL `https://liff.line.me/<LIFF_ID>`, không phải Endpoint URL hay URL `developers.line.biz` |
| `LINE_MESSAGE_LOCALE` | Locale nội dung LINE, nhận `vi` hoặc `ja` |
| `LINE_REMINDER_MINUTES` | Số phút gửi nhắc lịch tập qua LINE trước giờ bắt đầu, mặc định `30` |

> **Supabase:** Dùng **Session pooler** (port 5432) cho `DATABASE_URL`, cùng `DB_CONNECTION_MODE=supavisor-session`, `sslmode=require` và `connection_limit=5`; không thêm `pgbouncer=true`. Prisma runtime và `prisma db push` cùng dùng URL này. URL-encode ký tự đặc biệt trong mật khẩu nếu có.

### Nạp snapshot ExerciseDB một lần

Thực hiện ở staging trước, chốt `EXERCISEDB_MIN_EXPECTED_COUNT` từ lượt staging thành công, tạo backup database production, rồi inject key qua secret runtime (không commit vào `.env`). Trong thư mục `server/`, đặt `EXERCISEDB_SYNC_ENABLED=true`, giữ `EXERCISEDB_SCHEDULER_ENABLED=false` và chạy `npm run exercise:catalog:sync` hai lần. Lượt hai phải có `insertedCount=0`, `updatedCount=0`, `hiddenCount=0` nếu provider không đổi. Sau nghiệm thu, đặt cả hai cờ thành `false`, gỡ API key và restart backend. Ảnh ExerciseDB vẫn tải từ URL của provider.

> **LINE deploy:** Với LIFF ID `2010144670-0RjWIyfv`, đặt `VITE_LIFF_ID=2010144670-0RjWIyfv`, `LINE_CHANNEL_ID=2010144670` và `LINE_LIFF_URL=https://liff.line.me/2010144670-0RjWIyfv`. `VITE_LIFF_ID` là LIFF ID đầy đủ; `LINE_CHANNEL_ID` là channel ID số dùng để verify token; `LINE_LIFF_URL` là URL người dùng mở, không phải Endpoint URL. Trong LINE Developers Console, đặt **Endpoint URL** là `https://<frontend-public-domain>/liff`, bật scope `openid`, và cấu hình reverse proxy để `/liff` trả SPA `index.html` còn `/api/v1` chuyển tiếp tới backend. Khi frontend và API cùng origin, giữ `VITE_API_URL` trống; đặt `CLIENT_URL=https://<frontend-public-domain>`. Các link gửi qua LINE nên dùng `https://liff.line.me/2010144670-0RjWIyfv?redirect=%2Fmember...`. Sau khi build server, có thể chạy `npm run config:check` để kiểm tra env trước khi `npm start`.

### 6.4 Khởi động Server

```bash
# Trong thư mục server/
npm install
npm run prisma:push       # Đồng bộ schema Prisma lên database
npm run dev               # Dev server: http://localhost:3000
```

### 6.5 Cấu hình Client

```bash
cd client
cp .env.example .env
```

Mở `client/.env` và điền nếu cần:

| Biến | Mô tả |
|---|---|
| `VITE_API_URL` | URL backend. Để trống khi chạy local hoặc khi production reverse proxy `/api/v1` về backend cùng origin |
| `API_PROXY_TARGET` | Target proxy cho Vite dev (mặc định `http://127.0.0.1:3000`) |
| `VITE_LIFF_ID` | *(Tùy chọn)* LIFF ID đầy đủ, ví dụ `2010144670-0RjWIyfv`; không dùng channel ID số hay LIFF URL |

### 6.6 Khởi động Client

```bash
# Trong thư mục client/
npm install
npm run dev               # http://localhost:5173
```

> Mở 2 terminal song song: một cho `server/`, một cho `client/`. Truy cập ứng dụng tại `http://localhost:5173`.

### 6.7 Script tiện ích

**`client/`**

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Build production (`tsc` + `vite build`) |
| `npm run preview` | Preview bản build |
| `npm run lint` | ESLint cho `src/` |
| `npm run format` | Prettier format `src/` |

**`server/`**

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | `tsx watch src/index.ts` |
| `npm run build` | Compile TypeScript ra `dist/` |
| `npm start` | Chạy bản build (`node dist/index.js`) |
| `npm run lint` | ESLint cho `src/` |
| `npm run format` | Prettier format `src/` |
| `npm run prisma:push` | Đồng bộ schema Prisma lên database |
| `npm run db:safety:check` | Chặn entrypoint database destructive trong CI |

---

## 7. Đóng Góp

Mọi đóng góp đều được hoan nghênh. Vui lòng tạo **Issue** hoặc **Pull Request** để thảo luận trước khi thay đổi.
