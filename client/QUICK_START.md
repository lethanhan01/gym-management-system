# RoGym Frontend — Quick Start

> **Đọc file này trước.** Khoảng 5-10 phút. Sau đó tra cứu chi tiết tại [`UI_COMPONENTS.md`](./UI_COMPONENTS.md).

---

## 1. Kiến trúc thư mục UI

Có 3 lớp component, dùng theo thứ tự ưu tiên:

```
client/src/components/
├── ui/               ← Lớp 1: Nguyên liệu thô (Button, Input, Card, Table...)
├── shared/           ← Lớp 2: Shell hệ thống (Sidebar, Topbar, ProtectedRoute...)
├── MemberUI.tsx      ← Lớp 3: Alias theo role (re-export từ lớp 1+2)
├── TrainerUI.tsx
├── StaffUI.tsx
└── OwnerUI.tsx
```

**Nguyên tắc:** Luôn dùng lớp cao nhất có sẵn. Đừng tự viết lại những gì đã có.

```tsx
// Import từ lớp 1 — dùng khi code không nằm trong context của role cụ thể
import { Button, Modal, StatusBadge } from '@/components/ui'

// Import từ lớp 3 — dùng khi đang code cho một role cụ thể
import { TrainerPage, TrainerPageHeader, TrainerSkeleton } from '@/components/TrainerUI'
import { StaffModal, StaffStatCard } from '@/components/StaffUI'
```

### Alias theo role là gì?

`TrainerPage`, `TrainerModal`, `StaffStatCard`... đều là những tên khác của shared component.
Chúng không tạo ra giao diện khác — chỉ giúp code dễ đọc hơn và cho phép mở rộng riêng cho từng role sau này.

---

## 2. Tạo page mới — từng bước

### Bước 1: Chọn layout đúng

```tsx
// Mọi trang dashboard đều dùng Page + PageHeader
import { TrainerPage, TrainerPageHeader } from '@/components/TrainerUI'
// hoặc: MemberPage, StaffPage, OwnerPage tùy role
```

### Bước 2: Xử lý 3 trạng thái dữ liệu

Mọi trang có fetch API đều cần xử lý đủ 3 trạng thái: loading / error / empty.

```tsx
export default function StudentsPage() {
  const { data, loading, error, reload } = useTrainerStudents()

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Trainer"
        title="Danh sách học viên"
        description="Theo dõi học viên đang được phân công."
        actions={<Button variant="primary" leftIcon={<Plus size={16} />}>Thêm mới</Button>}
      />

      {loading ? (
        <TrainerSkeleton rows={4} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState title="Chưa có học viên" />
      ) : (
        // render danh sách
      )}
    </TrainerPage>
  )
}
```

**Quy tắc:** Không render empty state trong lúc `loading`. Luôn có nút retry khi error.

### Bước 3: Thanh tìm kiếm + bộ lọc

```tsx
import { SearchToolbar } from '@/components/ui'

<SearchToolbar
  value={search}
  onChange={setSearch}
  placeholder="Tìm theo tên, SĐT..."
  filters={<FilterDropdown .../>}
  actions={<Button variant="primary">Thêm mới</Button>}
/>
```

### Bước 4: Hiển thị dữ liệu dạng bảng

```tsx
import { ResponsiveTable } from '@/components/ui'

const columns: ColumnDef<Member>[] = [
  { key: 'name', header: 'Họ tên', render: (m) => <span className="font-semibold">{m.fullName}</span> },
  { key: 'status', header: 'Trạng thái', render: (m) => <StatusBadge status={m.status} /> },
]

<ResponsiveTable
  data={members}
  columns={columns}
  keyExtractor={(m) => m.id}
  loading={isLoading}
  error={error}
  onRetry={refetch}
  pagination={{ page, totalPages, onPageChange: setPage }}
/>
```

`ResponsiveTable` tự chuyển thành card stack trên mobile — **không cần tự viết responsive cho table**.

### Bước 5: Form trong Modal

```tsx
import { Modal, FormField, Input, Button } from '@/components/ui'

<Modal open={isOpen} onClose={() => setIsOpen(false)} title="Thêm học viên mới" size="lg">
  <form onSubmit={handleSubmit}>
    <FormField label="Họ và tên" required error={errors.fullName?.message}>
      <Input id="fullName" {...register('fullName')} placeholder="Nhập họ tên" />
    </FormField>
    <Button type="submit" loading={isSubmitting}>Lưu</Button>
  </form>
</Modal>
```

---

## 3. Quick Reference — Component nào cho tình huống nào

| Tình huống | Component nên dùng |
|---|---|
| Nút kích hoạt hành động (submit, delete...) | `<Button>` |
| Nút điều hướng sang trang khác | `<ButtonLink to="/path">` |
| Nút link ra ngoài / download file | `<ButtonAnchor href="...">` |
| Ô input text đơn dòng | `<Input>` bọc trong `<FormField>` |
| Ô nhập văn bản nhiều dòng | `<Textarea>` bọc trong `<FormField>` |
| Dropdown chọn 1 giá trị | `<Select>` |
| Chọn ngày | `<DatePickerInput>` |
| Chọn ngày + giờ | `<DateTimePickerInput>` |
| Bật/tắt ngay lập tức (On/Off) | `<Switch>` |
| Tick chọn nhiều mục trong danh sách | `<Checkbox>` |
| Thanh tìm kiếm + lọc trên trang danh sách | `<SearchToolbar>` |
| Bảng dữ liệu (responsive auto) | `<ResponsiveTable>` |
| Popup xác nhận hành động nguy hiểm | `<ConfirmDialog>` |
| Popup form thêm/sửa | `<Modal>` |
| Thẻ metric / số liệu dashboard | `<StatCard>` |
| Nhãn trạng thái (active, pending...) | `<StatusBadge>` |
| Nhãn danh mục, tag | `<Badge>` |
| Thông báo cảnh báo inline trong trang | `<Alert>` |
| Trình tự nhiều bước (wizard) | `<Stepper>` |
| Nội dung thu gọn / mở rộng (FAQ) | `<Accordion>` |
| Ảnh đại diện người dùng | `<Avatar>` |
| Placeholder khi đang tải | `<Skeleton>`, `<SkeletonText>` |

---

## 4. Quy tắc MUST / SHOULD / NEVER

### MUST (bắt buộc)
- Dùng `SearchToolbar` cho mọi thanh tìm kiếm — không tự viết `<input>` thủ công
- Xử lý đủ 3 trạng thái: loading / error / empty cho mọi trang có API call
- Dùng `getApiError()` trong catch block, không tự parse `err.response?.data?.message`
- Dùng `ProtectedRoute` với `allowedRoles` cho mọi route cần xác thực
- Debounce search text trước khi truyền vào hook (dùng `useDeferredValue` hoặc `debounceMs`)

### SHOULD (nên làm)
- Dùng alias theo role (`TrainerPage`, `StaffModal`...) khi code trong context role cụ thể
- Dùng `statusLabel()` và `statusTone()` từ `@/lib/status` thay vì tự map chuỗi trạng thái
- Dùng `formatDate()`, `formatVnd()` từ `@/lib` thay vì tự format date/currency
- Memoize dữ liệu tính toán nặng, không memoize JSX nhỏ

### NEVER (không được làm)
- Tự viết markup `<div><Search/><input/></div>` cho thanh tìm kiếm
- Tự copy loading/empty/error state giữa các trang
- Tạo local state `isLoggedIn` hay `currentRole` — lấy từ `useAuthStore()`
- Dùng `style={{...}}` inline hoặc hardcode hex màu trong TSX
- Import `Sidebar` hay `Topbar` trực tiếp vào page — chúng do layout quản lý

---

## 5. Các lib utilities hay dùng

```tsx
// @/lib/date — múi giờ Asia/Ho_Chi_Minh
import { formatDate, formatDateTime, formatTime, toDateInput, todayInput } from '@/lib/date'
formatDate('2026-08-19T00:00:00Z')  // → "19/08/2026"
formatVnd(1500000)                   // → "1.500.000 ₫"

// @/lib/status — map trạng thái sang label + màu
import { statusLabel, statusTone } from '@/lib/status'
statusLabel('active')   // → "Đang hoạt động"
statusTone('expired')   // → 'danger'

// @/lib/api-error — xử lý lỗi API
import { getApiError, isApiConflict } from '@/lib/api-error'
catch (err) { setError(getApiError(err, 'Không thể tải dữ liệu.')) }

// @/lib/currency
import { formatVnd } from '@/lib/currency'

// @/lib/utils — merge Tailwind class
import { cn } from '@/lib/utils'
cn('rogym-btn', isActive && 'is-active', className)
```

---

## 6. State quản lý xác thực & gói tập

```tsx
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

// Lấy thông tin người dùng đang đăng nhập
const { user, isAuthenticated, hasHydrated } = useAuthStore()
// user.roles: ('owner' | 'staff' | 'trainer' | 'member')[]

// Kiểm tra gói tập hội viên
const { hasActiveSub } = useSubscriptionStore()
// null = chưa fetch, true/false = kết quả
```

**Lưu ý:** `hasHydrated` dùng để chờ localStorage hydration trước khi render route guard (tránh redirect sai khi F5).

---

## 7. Checklist trước khi submit PR

- [ ] Dùng đúng layout và route guard (`ProtectedRoute`, `SubscriptionRequired`)
- [ ] Đủ 3 trạng thái: loading / error / empty
- [ ] Search text được debounce
- [ ] Dùng `Select` và date picker dùng chung, không dùng native `<select>` hay `<input type="date">`
- [ ] Dùng `statusLabel()` / `statusTone()` / `getApiError()` — không tự mapping
- [ ] Không có `style={{}}` hay hex màu trong TSX
- [ ] Chạy `npm run lint` và `npm run build` trong `client/` không có lỗi

---

## Tra cứu thêm

- **Toàn bộ component, props table, code examples:** [`UI_COMPONENTS.md`](./UI_COMPONENTS.md)
- **Design tokens, màu sắc, typography:** [`design.md`](./design.md)
- **Kiến trúc kỹ thuật viết component mới:** đã tích hợp vào `UI_COMPONENTS.md` — xem Section V
