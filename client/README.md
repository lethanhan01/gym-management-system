# Gym Management — Client

Ứng dụng web (SPA) dành cho hội viên, nhân viên, huấn luyện viên và chủ phòng tập. Đây là **frontend** của hệ thống Quản lý phòng tập Gym, được xây dựng bằng **React 18 + Vite 5 + TypeScript** và giao tiếp với REST API của `server/` qua Axios.

> Tổng quan toàn dự án xem tại [README ở root](../README.md).

---

## 1. Công nghệ sử dụng

| Nhóm | Thư viện |
| --- | --- |
| Build & ngôn ngữ | Vite 5, TypeScript 5, React 18 |
| Styling | TailwindCSS 3, PostCSS, Autoprefixer |
| State (client) | Zustand |
| State (server) | TanStack Query (React Query) v5 |
| Routing | React Router 6 |
| Form | React Hook Form |
| HTTP | Axios |
| Biểu đồ | Recharts |
| Animation | GSAP |
| Icon | lucide-react |
| Code style | ESLint, Prettier, EditorConfig |

Phiên bản Node được khoá tại [`.nvmrc`](./.nvmrc) (Node 20).

---

## 2. Cấu trúc thư mục

```text
client/
├── src/
│   ├── components/
│   │   └── common/           # Sidebar, Topbar, ProtectedRoute, ...
│   ├── hooks/                # Custom hooks (useAuth, ...)
│   ├── layouts/              # AuthLayout, DashboardLayout
│   ├── pages/
│   │   ├── auth/             # Login, ForgotPassword, ResetPassword
│   │   └── home/             # HomePage (dashboard)
│   ├── services/             # api.ts (axios instance), *.service.ts
│   ├── stores/               # Zustand store (authStore, ...)
│   ├── styles/               # globals.css (Tailwind directives)
│   ├── types/                # Type chung của FE
│   ├── App.tsx               # Khai báo router & providers
│   ├── main.tsx              # Entry point ReactDOM.createRoot
│   └── vite-env.d.ts
├── index.html                # Vite entry HTML
├── vite.config.ts            # Cấu hình Vite (alias `@/`, dev proxy `/api`)
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── .env.example
└── package.json
```

Alias quan trọng: `@/...` trỏ về `client/src/...` (xem `vite.config.ts` và `tsconfig.json`).

---

## 3. Yêu cầu hệ thống

- Node.js >= 20 (khớp với `.nvmrc`)
- npm >= 10
- Server backend đang chạy tại `http://localhost:3000` (xem [`server/README.md`](../server/README.md))

---

## 4. Cài đặt & chạy

### Yêu cầu trước

Server backend phải đang chạy tại `http://localhost:3000`. Khởi động server trước:

```bash
cd server
npm run dev
```

Xác nhận server sẵn sàng:

```bash
curl http://localhost:3000/health
# Kết quả mong đợi: {"status":"ok","db":"ok",...}
```

### Chạy client

```bash
cd client
npm install          # chỉ cần lần đầu hoặc sau khi thêm package
npm run dev          # http://localhost:5173
```

Dev server của Vite **proxy** tự động mọi request `/api/*` sang `http://localhost:3000` (cấu hình trong `vite.config.ts`). Không cần CORS khi phát triển local.

Mở trình duyệt tại `http://localhost:5173`. Trang mặc định chuyển hướng về `/login`.

### Đăng nhập thử

Sau khi seed database (`npm run prisma:seed` phía server), đăng nhập bằng tài khoản mặc định:

| Trường | Giá trị |
| --- | --- |
| Email | `owner@gym.local` |
| Mật khẩu | `Password123!` |

Sau khi đăng nhập thành công, ứng dụng tự động chuyển hướng đến dashboard theo role (`/owner`, `/staff`, `/trainer`, `/member`).

### Build production

```bash
npm run build                 # type-check (tsc) + bundle (vite build) -> dist/
npm run preview               # serve thử bản build tại http://localhost:4173
```

---

## 5. Scripts có sẵn

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Khởi động Vite dev server kèm HMR |
| `npm run build` | `tsc` kiểm tra type → `vite build` tạo `dist/` |
| `npm run preview` | Serve tĩnh bản build |
| `npm run lint` | Chạy ESLint trên `src/**/*.{ts,tsx}` |
| `npm run format` | Prettier format `src/**/*.{ts,tsx,js,json,css}` |

---

## 6. Biến môi trường

File `.env` (đã `gitignore`) được Vite nạp tự động. Chỉ các biến **bắt đầu bằng `VITE_`** mới lộ ra cho code phía client.

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `VITE_API_URL` | `/api/v1` (qua proxy) | Base URL của REST API. Đặt rõ khi build production, ví dụ `https://api.example.com/api/v1`. |
| `API_PROXY_TARGET` | `http://127.0.0.1:3000` | Backend local cho Vite dev proxy. Vite chờ endpoint `/health` sẵn sàng trước khi nhận request từ trình duyệt. |

Mẫu đầy đủ ở [`.env.example`](./.env.example).

---

## 7. Quy ước phát triển

- **Import alias**: ưu tiên `import x from '@/components/...'` thay vì path tương đối nhiều cấp.
- **Component**: PascalCase, mỗi component 1 file `.tsx`. Component dùng chung đặt trong `src/components/common/`.
- **Hook**: tên bắt đầu bằng `use`, đặt trong `src/hooks/`.
- **State**:
  - Dữ liệu từ server → **TanStack Query** (`useQuery`, `useMutation`).
  - State UI/global đơn giản → **Zustand** trong `src/stores/`.
- **Form**: dùng React Hook Form, validate bằng schema (Zod/Yup) khi cần.
- **Styling**: ưu tiên class Tailwind, hạn chế CSS riêng. CSS toàn cục đặt ở `src/styles/globals.css`.
- **HTTP**: dùng instance axios chung trong `src/services/api.ts`, các service nghiệp vụ đặt trong cùng thư mục dưới dạng `*.service.ts`.
- Trước khi commit: `npm run lint && npm run build` cần pass.

---

## 8. Kết nối với Server

| Môi trường | Cách gọi API |
| --- | --- |
| Dev (mặc định) | Gọi `/api/...` → Vite proxy chuyển tới `http://localhost:3000` |
| Dev override | Đặt `VITE_API_URL=http://localhost:3000/api/v1` trong `.env` |
| Production | Đặt `VITE_API_URL` thành domain API thật khi `npm run build` |

Để dev đầy đủ, mở 2 terminal song song:

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

---

## 9. Khắc phục sự cố

- **Backend không sẵn sàng khi chạy client**: Vite chờ tối đa 60 giây; đảm bảo `server/` đang chạy ở cổng 3000 hoặc chỉnh `API_PROXY_TARGET`.
- **Đổi cổng dev server**: chỉnh `server.port` trong `vite.config.ts`.
- **Tailwind class không có hiệu lực**: kiểm tra `content` trong `tailwind.config.js` đã match đường dẫn `src/**/*.{ts,tsx}`.
- **Type error sau khi cài thư viện**: chạy lại `npm install` rồi `npm run build` để TypeScript nhận types mới.

---

## 10. Tham khảo

- [Hướng dẫn tái sử dụng components, hooks và layouts](./reusable-ui.md)
- [Vite Docs](https://vitejs.dev/)
- [React](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://docs.pmnd.rs/zustand)
- [React Router](https://reactrouter.com/)
- [TailwindCSS](https://tailwindcss.com/)
