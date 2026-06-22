# Gym Management — Client

`client/` là ứng dụng web SPA của hệ thống Gym Management, phục vụ khách truy cập và bốn vai trò **Member, Trainer, Staff, Owner**. Frontend được xây dựng bằng React, Vite và TypeScript, giao tiếp với REST API trong `server/` qua Axios.

> Xem tổng quan toàn dự án tại [README ở thư mục gốc](../README.md). Quy chuẩn giao diện nằm trong [design.md](./design.md) và hướng dẫn tái sử dụng nằm trong [reusable-ui.md](./reusable-ui.md).

## 1. Phạm vi hiện tại

| Khu vực | Chức năng đã có trong cấu trúc route/page |
| --- | --- |
| Public | Trang chủ, chương trình tập, huấn luyện viên, gói tập và liên hệ. |
| Auth & đăng ký | Đăng nhập, quên/đặt lại mật khẩu; đăng ký hội viên, xác thực email, thanh toán và hoàn tất đăng ký. |
| Member | Dashboard, hồ sơ, tài khoản thanh toán, gói tập, gia hạn/lịch sử, chọn PT, attendance, tiến độ, feedback và workout. Các chức năng tập luyện yêu cầu subscription còn hiệu lực. |
| Trainer | Dashboard, hồ sơ, học viên, cập nhật tiến độ, lịch/buổi tập, giáo án, workout plan và thư viện bài tập. |
| Staff | Dashboard, hồ sơ, lịch làm việc, hội viên, đăng ký tại quầy, gia hạn, check-in, chấm công, feedback, phòng tập và thiết bị. |
| Owner | Dashboard, hồ sơ, gói tập, tài khoản hệ thống, nhân sự/lịch làm việc, thiết bị, RBAC và báo cáo. |
| Hạ tầng dùng chung | Phân quyền route, layout dashboard, API client, state, i18n Việt–Nhật, design system, test và coverage. |

Phạm vi trên phản ánh các route và page đang có trong source; không thay thế tài liệu yêu cầu hoặc xác nhận mọi nghiệp vụ đã hoàn tất. Xem đặc tả màn hình tại [docs/VI/Design/UIUX](../docs/VI/Design/UIUX/).

## 2. Công nghệ chính

| Nhóm | Công nghệ |
| --- | --- |
| Nền tảng | React 18, TypeScript 5, Vite 5 |
| Routing | React Router 6, lazy loading, role guard và subscription guard |
| API & state | Axios, TanStack Query, Zustand |
| UI | TailwindCSS, Radix UI, shadcn, Lucide Icons, React Day Picker, Recharts |
| Đa ngôn ngữ | i18next, react-i18next; tiếng Việt và tiếng Nhật |
| Kiểm thử | Vitest, Testing Library, jsdom, V8 coverage |
| Triển khai | Vite production build, Vercel Analytics và `vercel.json` |

Node.js được khóa ở phiên bản **20** trong [`.nvmrc`](./.nvmrc).

## 3. Vai trò của từng folder

### 3.1. Các folder cấp cao

| Folder | Trách nhiệm |
| --- | --- |
| `public/` | Tài nguyên tĩnh được Vite phục vụ trực tiếp, không đi qua bước import/bundle. |
| `public/exercises/` | Ảnh minh họa bài tập, được truy cập bằng URL tĩnh từ dữ liệu exercise. |
| `src/` | Toàn bộ source TypeScript, React, style, bản dịch và test của ứng dụng. |
| `dist/` | Kết quả `npm run build`; là dữ liệu sinh tự động, không chỉnh sửa trực tiếp. |
| `coverage/` | Báo cáo sinh bởi `npm run test:coverage`. |
| `node_modules/` | Dependency được npm cài đặt; không thuộc source dự án. |

### 3.2. Các folder trực tiếp trong `src/`

| Folder | Trách nhiệm |
| --- | --- |
| `src/@types/` | Khai báo hoặc mở rộng type cho thư viện bên ngoài, hiện có type bổ sung cho i18next. |
| `src/assets/` | Ảnh được import vào component và được Vite tối ưu khi build. |
| `src/components/` | Component dùng lại giữa nhiều page hoặc nhiều vai trò. |
| `src/hooks/` | Hook nghiệp vụ dùng lại, hiện tập trung vào subscription và dữ liệu Trainer. |
| `src/layouts/` | Khung trang cấp cao: layout cho auth và dashboard theo vai trò. |
| `src/lib/` | Hàm tiện ích thuần, formatter, xử lý lỗi API, subscription, lịch/ca làm và cấu hình i18n. |
| `src/locales/` | Tài nguyên dịch được chia theo ngôn ngữ và namespace nghiệp vụ. |
| `src/pages/` | Page gắn trực tiếp với route, được chia theo khu vực public và vai trò người dùng. |
| `src/services/` | Lớp giao tiếp REST API theo domain; mọi request dùng Axios instance chung. |
| `src/stores/` | State dùng chung bằng Zustand như auth, subscription và chấm công Staff. |
| `src/styles/` | Design token, reset, typography, utility và CSS component của toàn ứng dụng. |
| `src/test/` | Thiết lập môi trường Vitest và factory/helper dùng chung cho test. |

Hai file điều phối chính:

- `src/main.tsx`: khởi tạo React, Router, TanStack Query và i18n.
- `src/App.tsx`: khai báo route, lazy loading, phân quyền theo role và điều kiện subscription.

### 3.3. Các folder trong `src/components/`

| Folder | Trách nhiệm |
| --- | --- |
| `components/charts/` | Biểu đồ tiến độ và cân nặng của hội viên/học viên. |
| `components/home/` | Thành phần dành cho các trang public, hiện có thanh điều hướng trang chủ. |
| `components/payment/` | Dữ liệu và control chọn phương thức thanh toán. |
| `components/profile/` | Các dòng thông tin và trường mật khẩu dùng chung cho trang hồ sơ. |
| `components/shared/` | Thành phần xuyên vai trò: page shell, sidebar, topbar, pagination, bộ lọc ngày, route guard và subscription guard. |
| `components/staff/` | Component riêng cho nghiệp vụ Staff, hiện có lịch làm việc. |
| `components/trainer/` | Component riêng cho Trainer, hiện có modal chi tiết buổi tập. |
| `components/ui/` | UI primitive mức thấp như Button, Modal, SearchInput, StatCard, StatusBadge và LanguageSwitcher. |
| `components/workout/` | Component và dữ liệu dùng chung cho exercise, workout plan và plan builder. |

Các file `MemberUI.tsx`, `TrainerUI.tsx`, `StaffUI.tsx`, `OwnerUI.tsx` ở gốc `components/` cung cấp API/component theo vai trò; các control dùng chung như `Select`, `DatePickerInput`, `DateTimePickerInput` và `PackagePicker` cũng đặt tại đây.

### 3.4. Các folder trong `src/pages/`

| Folder | Vai trò hoặc chức năng |
| --- | --- |
| `pages/home/` | Trang public giới thiệu phòng tập, chương trình, PT, gói tập và liên hệ. |
| `pages/auth/` | Đăng nhập, quên mật khẩu và đặt lại mật khẩu. |
| `pages/member/` | Toàn bộ màn hình dành cho hội viên. |
| `pages/trainer/` | Toàn bộ màn hình dành cho huấn luyện viên. |
| `pages/staff/` | Màn hình vận hành hằng ngày cho nhân viên; Owner cũng có thể truy cập nhóm route này. |
| `pages/owner/` | Màn hình quản trị chỉ dành cho chủ phòng tập. |

#### Member

| Folder | Chức năng |
| --- | --- |
| `pages/member/register/` | Đăng ký tài khoản hội viên, xác thực email và màn hình hoàn tất. |
| `pages/member/subscription/` | Mua, thanh toán, xem, gia hạn và tra cứu lịch sử gói tập. |
| `pages/member/workout/` | Xem/xây dựng giáo án, thư viện bài tập, lịch sử, lịch tập và thực hiện buổi tập. |
| `pages/member/attendance/` | Lịch sử check-in/check-out của hội viên. |
| `pages/member/progress/` | Theo dõi chỉ số và tiến độ tập luyện. |
| `pages/member/feedback/` | Gửi phản hồi và theo dõi phản hồi đã gửi. |

Các page đặt trực tiếp trong `pages/member/` phụ trách dashboard, hồ sơ, tài khoản thanh toán và chọn Trainer.

#### Trainer

| Folder | Chức năng |
| --- | --- |
| `pages/trainer/students/` | Danh sách/chi tiết học viên và ghi nhận lịch sử tiến độ. |
| `pages/trainer/sessions/` | Lịch buổi tập và tạo training session. |
| `pages/trainer/plans/` | Danh sách, tạo, chỉnh sửa, xây dựng và giao workout plan/lesson plan. |
| `pages/trainer/exercises/` | Tra cứu thư viện bài tập. |

Các page đặt trực tiếp trong `pages/trainer/` phụ trách dashboard và hồ sơ Trainer.

#### Staff

| Folder | Chức năng |
| --- | --- |
| `pages/staff/members/` | Danh sách, chi tiết và đăng ký hội viên tại quầy. |
| `pages/staff/renewal/` | Gia hạn gói tập cho hội viên. |
| `pages/staff/check-in/` | Check-in hội viên tại quầy. |
| `pages/staff/attendance/` | Chấm công và lịch sử attendance của Staff. |
| `pages/staff/feedback/` | Tiếp nhận và xử lý phản hồi. |
| `pages/staff/facility/` | Quản lý phòng/khu vực tập. |
| `pages/staff/equipment/` | Quản lý thiết bị và trạng thái bảo trì. |

Các page đặt trực tiếp trong `pages/staff/` phụ trách dashboard, hồ sơ và lịch làm việc.

#### Owner

| Folder | Chức năng |
| --- | --- |
| `pages/owner/users/` | Tổng quan tài khoản người dùng trong hệ thống. |
| `pages/owner/staff-management/` | Danh sách, chi tiết, tạo nhân sự và phân lịch làm việc. |
| `pages/owner/rbac/` | Quản lý group và permission. |
| `pages/owner/packages/` | Quản lý danh mục gói tập. |
| `pages/owner/equipment/` | Giám sát và quản lý thiết bị ở cấp Owner. |
| `pages/owner/reports/` | Báo cáo doanh thu, hóa đơn giao dịch và hiệu suất nhân viên. |

Các page đặt trực tiếp trong `pages/owner/` phụ trách dashboard và hồ sơ Owner.

### 3.5. Các folder hỗ trợ khác

| Folder | Trách nhiệm |
| --- | --- |
| `src/locales/vi/` | Bản dịch tiếng Việt cho `common`, `auth`, `home`, `member`, `trainer`, `staff`, `owner`, `validation`. |
| `src/locales/ja/` | Bản dịch tiếng Nhật với cùng hệ namespace như tiếng Việt. |
| `src/styles/components/` | CSS theo nhóm giao diện như auth, button, card, form, layout, sidebar, table, checkout và session. |
| `src/test/` | `setup.ts` mở rộng matcher DOM; các factory giúp tạo dữ liệu test nhất quán. |

## 4. Luồng phụ thuộc frontend

```text
main.tsx
  -> App.tsx / route guards
  -> layouts
  -> pages theo vai trò
  -> components + hooks + stores
  -> services
  -> Axios instance (/api/v1)
  -> server
```

- Dữ liệu từ API nên đi qua `src/services/`; không tạo Axios instance riêng trong page.
- State đăng nhập/subscription dùng store chung để route guard và layout có cùng nguồn dữ liệu.
- Logic format, chuẩn hóa response và business helper dùng lại đặt trong `src/lib/`.
- Giao diện tái sử dụng đặt trong `src/components/`; page chỉ điều phối dữ liệu và hành vi của một route.

## 5. Cài đặt và chạy

Yêu cầu: Node.js 20, npm 10+ và backend chạy tại `http://localhost:3000`.

```bash
cd server
npm run dev
```

Ở terminal khác:

```bash
cd client
npm install
npm run dev
```

Vite chạy tại `http://localhost:5173`, chờ endpoint `/health` của backend sẵn sàng rồi proxy `/api/*` tới `http://127.0.0.1:3000`.

Sau khi seed database phía server, có thể đăng nhập bằng tài khoản Owner mặc định:

| Trường | Giá trị |
| --- | --- |
| Email | `owner@gym.local` |
| Mật khẩu | `Password123!` |

## 6. Scripts

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Chạy Vite dev server với HMR. |
| `npm run build` | Type-check bằng `tsc`, sau đó tạo production bundle trong `dist/`. |
| `npm run preview` | Chạy thử production build tại local. |
| `npm run test` | Chạy toàn bộ test một lần bằng Vitest. |
| `npm run test:watch` | Chạy Vitest ở chế độ theo dõi. |
| `npm run test:coverage` | Chạy test và tạo báo cáo coverage trong `coverage/`. |
| `npm run lint` | Chạy ESLint cho source TypeScript/React. |
| `npm run format` | Format source bằng Prettier. |

Coverage hiện tập trung vào luồng subscription, subscription store, route guard và các điểm tích hợp liên quan; ngưỡng được cấu hình trong `vitest.config.ts`.

## 7. Biến môi trường

| Biến | Mặc định | Vai trò |
| --- | --- | --- |
| `VITE_API_URL` | `/api/v1` | Base URL của REST API. Để trống khi muốn dùng Vite proxy. |
| `API_PROXY_TARGET` | `http://127.0.0.1:3000` | Backend được Vite proxy tới trong môi trường local. |
| `VITE_LIFF_ID` | Không có | LINE LIFF App ID dùng cho nút đăng nhập LINE. |

Xem mẫu cấu hình tại [`.env.example`](./.env.example).

## 8. Quy ước phát triển

- Dùng alias `@/` cho `client/src/`; tránh import tương đối nhiều cấp.
- Page mới phải đặt đúng role/domain trong `src/pages/` và khai báo route trong `src/App.tsx`.
- Ưu tiên component sẵn có theo thứ tự `components/ui` → `components/shared` → component theo role/domain.
- Dữ liệu server dùng service và TanStack Query khi cần cache; state phiên làm việc hoặc UI dùng Zustand.
- Style mới phải theo [design.md](./design.md) và [src/styles/CONVENTIONS.md](./src/styles/CONVENTIONS.md); không rải màu hoặc inline style trong page.
- Khi thêm nội dung hiển thị, cập nhật đồng thời namespace tương ứng trong `locales/vi` và `locales/ja`.
- Trước khi commit, chạy tối thiểu `npm run lint`, `npm run test` và `npm run build`.

## 9. Tài liệu liên quan

- [Hướng dẫn tái sử dụng component, hook và layout](./reusable-ui.md)
- [RoGym Frontend Design System](./design.md)
- [CSS State Conventions](./src/styles/CONVENTIONS.md)
- [Đặc tả UI/UX theo vai trò](../docs/VI/Design/UIUX/Gym-System-Roles-And-Screens-Detailed-Specification.md)
- [API Specification](../docs/VI/Design/API/README.md)
- [Hướng dẫn chạy backend](../server/README.md)
