# 🏋️ Hệ Thống Quản Lý Phòng Tập Gym

## 1. Mô Tả Dự Án

Hệ thống quản lý phòng tập gym được thiết kế nhằm hỗ trợ chủ phòng tập và nhân viên trong việc quản lý hiệu quả các hoạt động vận hành, bao gồm:

- Quản lý phòng tập và thiết bị
- Quản lý nhân sự
- Quản lý hội viên và gói tập
- Báo cáo thống kê

Bằng cách cung cấp một nền tảng kỹ thuật số tích hợp, hệ thống giúp tối ưu hóa quy trình quản lý, giảm thiểu sai sót và nâng cao trải nghiệm của hội viên.

---

## Quickstart cho developer

Monorepo gồm 2 sub-project độc lập (mỗi project có `node_modules` + `tsconfig` riêng):

- [`server/`](server/) — REST API: **NestJS 10 + Prisma + PostgreSQL** (port 3000). Xem [`server/README.md`](server/README.md).
- [`client/`](client/) — Web UI: **React + Vite + TypeScript** (port 5173). Xem [`client/README.md`](client/README.md).

### Yêu cầu

- Node.js ≥ 20, npm ≥ 10
- Tài khoản Supabase (PostgreSQL managed) — Free tier đủ cho dev

### Setup nhanh

```bash
# 1. Clone repo
git clone <repo-url> gym-management-system
cd gym-management-system

# 2. Backend
cd server
cp .env.example .env                  # Điền DATABASE_URL + DIRECT_URL Supabase + JWT_SECRET
npm install
npm run prisma:push                   # Sync schema.prisma → Supabase (idempotent)
npm run prisma:seed                   # Seed RBAC + 10 user mẫu (password: Password123!)
npm run dev                           # http://localhost:3000

# 3. Smoke test backend (terminal khác)
curl http://localhost:3000/health     # Lần đầu sau cold start có thể db:down (lazy connect)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.local","password":"Password123!"}'
# Tiêu chí pass: trả accessToken + roles:["owner"]
curl http://localhost:3000/health     # Sau login phải trả db:ok

# 4. Frontend (mở terminal khác, từ root)
cd client
npm install
npm run dev                           # http://localhost:5173
```

### Tài khoản mặc định sau seed

| Email | Role | Password |
|---|---|---|
| `owner@gym.local` | owner | `Password123!` |
| `staff.linh@gym.local` | staff | `Password123!` |
| `trainer.minh@gym.local` | trainer | `Password123!` |
| `nguyen.van.a@email.com` | member | `Password123!` |

Đổi password ngay trong môi trường thật.

### Tài liệu thiết kế

- [`docs/VI/SRS_VI.md`](docs/VI/SRS_VI.md) — Software Requirements Specification (13 UC: UC00-UC12)
- [`docs/VI/Design/Architecture.md`](docs/VI/Design/Architecture.md) — High-Level Design (10 cluster, 14 ADR, NFR, threat model)
- [`docs/VI/Design/Database.md`](docs/VI/Design/Database.md) — ERD + DDL + convention (20 model + otp_codes)
- [`docs/VI/Design/API/`](docs/VI/Design/API/) — API spec Module 1 Auth + Module 2 RBAC + Module 4 Member/Subscription (Markdown + OpenAPI 3.0)

### Troubleshooting

Xem [`server/README.md` § Troubleshooting](server/README.md) cho các vấn đề thường gặp: build silent fail, DB không connect, seed thiếu data, OTP không gửi email.

---

## 2. Đối Tượng Sử Dụng

| Đối tượng | Vai trò |
|---|---|
| **Chủ phòng tập** | Quản lý tổng thể hoạt động kinh doanh: doanh thu, nhân sự, hội viên, thiết bị và phản hồi khách hàng |
| **Nhân viên quản lý** | Theo dõi hoạt động hàng ngày, kiểm soát đăng ký, gia hạn gói tập và xử lý phản hồi hội viên |
| **Huấn luyện viên cá nhân** | Quản lý danh sách học viên, theo dõi lịch tập, hướng dẫn và đánh giá tiến độ tập luyện |
| **Hội viên** | Đăng ký, theo dõi gói tập, quản lý lịch sử tập luyện và đánh giá chất lượng dịch vụ |

---

## 3. Chức Năng Chính

### 3.1 Quản Lý Phòng Tập

- **Thông tin phòng tập:** Lưu trữ và cập nhật thông tin phòng tập (mã phòng, tên phòng, loại phòng: gym, yoga, fitness, v.v.), số lượng phòng và tình trạng hoạt động.
- **Thiết bị tập luyện:** Theo dõi danh sách thiết bị (mã thiết bị, tên thiết bị, số lượng, ngày nhập, bảo hành, xuất xứ, trạng thái sử dụng).
- **Nhân sự:** Phân quyền cho các nhóm nhân sự (nhân viên kinh doanh, chăm sóc khách hàng, huấn luyện viên), theo dõi lịch làm việc và đánh giá hiệu suất.
- **Phản hồi hội viên:** Tiếp nhận và xử lý đánh giá, phản hồi về nhân viên và cơ sở vật chất.

### 3.2 Quản Lý Hội Viên

- **Thông tin cá nhân:** Ghi nhận họ tên, tuổi, nghề nghiệp, thông tin liên hệ, sinh nhật, loại thành viên và dấu vân tay (nếu có).
- **Đăng ký & gia hạn:** Theo dõi ngày đăng ký, loại đăng ký (theo buổi / tháng / năm) và tình trạng gia hạn.
- **Lịch sử sử dụng dịch vụ:** Ghi nhận số buổi tập, thời gian tập, các dịch vụ đã sử dụng và mức độ tham gia.
- **Tài khoản hội viên:** Hội viên đăng nhập để theo dõi gói tập, lịch tập, phản hồi và nhận thông tin khuyến mãi.

### 3.3 Quản Lý Gói Tập

- **Thiết lập gói tập:** Định nghĩa các loại gói (gói 3 tháng, 6 tháng, 1 năm, theo buổi, VIP, tập cá nhân với huấn luyện viên).
- **Đăng ký & thanh toán:** Xác nhận đăng ký, ghi nhận thanh toán, cấp biên lai và gia hạn gói tập.

### 3.4 Báo Cáo Thống Kê

- **Doanh thu:** Thống kê theo ngày, tuần, tháng, quý, năm.
- **Đăng ký & gia hạn:** Báo cáo hội viên mới, hội viên gia hạn, số buổi tập đã sử dụng.
- **Hiệu suất nhân viên:** Đánh giá dựa trên phản hồi hội viên và hoạt động quản lý.

---

## 4. Quy Trình Nghiệp Vụ

### 4.1 Đăng Ký Hội Viên Mới

```
1. Hội viên cung cấp thông tin cá nhân và chọn gói tập.
2. Nhân viên tiếp nhận, tạo hồ sơ hội viên trên hệ thống.
3. Hội viên thanh toán (tiền mặt, thẻ ngân hàng, ví điện tử).
4. Hệ thống cấp mã hội viên và cập nhật danh sách hội viên.
```

### 4.2 Ghi Nhận Lịch Sử Tập Luyện & Theo Dõi Gói Tập

```
1. Hội viên đăng nhập vào hệ thống qua ứng dụng hoặc website.
2. Hệ thống hiển thị thông tin gói tập, lịch sử sử dụng, số buổi còn lại.
3. Nhân viên / huấn luyện viên ghi nhận lịch sử tập luyện.
4. Hội viên có thể gia hạn gói tập trực tuyến.
```

### 4.3 Bảo Trì Thiết Bị

```
1. Nhân viên kiểm tra tình trạng thiết bị định kỳ.
2. Nếu phát hiện lỗi, nhân viên báo cáo trên hệ thống.
3. Hệ thống thông báo cho bộ phận bảo trì để xử lý.
4. Sau khi sửa chữa, trạng thái thiết bị được cập nhật lại.
```

---

## 5. Công Nghệ Sử Dụng

Dự án gồm **2 project độc lập**: `client/` và `server/`. Mỗi bên tự quản lý `package.json`, `package-lock.json` và `node_modules` riêng.

**Frontend** (`client/`)

- Vite 5 + React 18 + TypeScript
- TailwindCSS 3
- Zustand (state), TanStack Query (server state)
- React Router 6, React Hook Form
- Axios, Recharts, GSAP, lucide-react

**Backend** (`server/`)

- Node.js 20 + Express 4 + TypeScript
- PostgreSQL (`pg`)
- JWT (`jsonwebtoken`), bcryptjs
- Winston (logging), Helmet, CORS, Morgan
- `tsx` cho dev/watch

**Tooling (cấu hình riêng trong mỗi project)**

- Prettier, ESLint, EditorConfig
- `.nvmrc` để khoá phiên bản Node

---

## 6. Đóng Góp

Mọi đóng góp đều được hoan nghênh. Vui lòng tạo **Issue** hoặc **Pull Request** để thảo luận trước khi thay đổi.

---

## 7. Giấy Phép

> *(Cập nhật khi có thông tin giấy phép)*
