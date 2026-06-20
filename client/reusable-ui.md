# Hướng dẫn tái sử dụng UI Frontend

Tài liệu này mô tả cách ghép các Components, Hooks, Layouts và CSS API hiện có.
Chuẩn màu sắc, typography và quy tắc thêm style được định nghĩa tại
[`design.md`](./design.md).

## 1. Quy ước import và lựa chọn API

Dùng alias `@/` thay cho đường dẫn tương đối dài:

```tsx
import { Page, PageHeader } from '@/components/shared/PageUI'
import { Select } from '@/components/Select'
import { useTrainerSessions } from '@/hooks/useTrainerSessions'
```

Thứ tự lựa chọn khi xây dựng màn hình:

1. Shared UI primitives trong `src/components/ui`.
2. Shared component trong `src/components`.
3. Alias hoặc component theo role như `MemberUI`, `TrainerUI`.
4. Hook nghiệp vụ trong `src/hooks`.
5. Class ngữ nghĩa trong `src/styles/components/` (xem `design.md` cho danh sách class).
6. Component mới nếu pattern có hành vi hoặc API tái sử dụng rõ ràng.

Không copy markup loading, empty, error, select, modal hoặc status badge giữa các
page.

## 2. Page foundation

Nguồn:

- [`PageUI.tsx`](./src/components/shared/PageUI.tsx)
- [`MemberUI.tsx`](./src/components/MemberUI.tsx)
- [`TrainerUI.tsx`](./src/components/TrainerUI.tsx)

### 2.1. Export chung

| Component | Props chính | Vai trò |
| --- | --- | --- |
| `Page` | `children`, `className?` | Container dashboard tối đa 1280px |
| `PageHeader` | `title`, `eyebrow?`, `description?`, `actions?` | Heading và action chuẩn |
| `PageSkeleton` | `rows?` | Loading list/page |
| `PageEmptyState` | `title`, `description?`, `action?` | Empty state |
| `PageErrorState` | `message`, `onRetry?` | Error và retry |

Member aliases:

```tsx
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberEmptyState,
  MemberErrorState,
} from '@/components/MemberUI'
```

Trainer aliases:

```tsx
import {
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerEmptyState,
  TrainerErrorState,
} from '@/components/TrainerUI'
```

Alias không tạo giao diện khác. Chúng giúp code theo role dễ đọc và cho phép mở
rộng API role tại một nơi.

### 2.2. Pattern trang tải dữ liệu

```tsx
export default function StudentsPage() {
  const { data, loading, error, reload } = useTrainerStudents()

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Học viên"
        title="Danh sách học viên"
        description="Theo dõi học viên đang được phân công."
      />

      {loading ? (
        <TrainerSkeleton rows={4} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState title="Chưa có học viên" />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {data.map((student) => (
            <article key={student.memberId} className="rogym-card rogym-card--compact">
              {student.fullName}
            </article>
          ))}
        </section>
      )}
    </TrainerPage>
  )
}
```

Không render empty state trong lúc `loading`. Error có thể giữ retry bằng hàm
`reload` từ hook.

## 3. Shared UI Primitives (`@/components/ui`)

Nguồn: [`ui/index.ts`](./src/components/ui/index.ts)

```tsx
import { Button, Modal, SearchInput, StatCard, StatusBadge } from '@/components/ui'
```

### 3.1. Tổng quan

| Component | Props chính | Vai trò |
| --- | --- | --- |
| `Button` | `variant?`, `loading?`, `wide?` + HTMLButtonElement attrs | Wrapper `.rogym-btn` với loading spinner, forwardRef |
| `Modal` | `open`, `title`, `onClose`, `children`, `footer?` | Dialog với Escape key, role="dialog", aria-modal |
| `SearchInput` | `value`, `onChange`, `placeholder?`, `debounceMs?`, `aria-label?` | Input tìm kiếm với debounce và nút clear |
| `StatCard` | `icon`, `label`, `value`, `hint?`, `accent?` | Metric card với icon, số, nhãn |
| `StatusBadge` | `status: string`, `tone: StatusTone` | Badge inline tone-based |

Các alias trong role UI files (`StaffModal`, `TrainerModal`, `StaffStatCard`,
`TrainerStatCard`) đều trỏ về shared component này. Chỉ import từ `ui/` khi code
không nằm trong role-specific context.

### 3.2. `Button`

```tsx
<Button variant="primary" loading={saving} onClick={handleSave}>
  Lưu
</Button>

<Button variant="outline-white" onClick={onCancel}>
  Hủy
</Button>

<Button variant="icon" aria-label="Đóng" onClick={onClose}>
  <X size={17} />
</Button>
```

`variant`: `'primary' | 'outline-white' | 'danger' | 'icon'` (mặc định `'primary'`).

`loading`: khóa button và hiện spinner. `wide`: thêm full-width style. Component là
`forwardRef` nên nhận được `ref`.

### 3.3. `Modal`

```tsx
<Modal
  open={open}
  title="Cập nhật thông tin"
  onClose={() => setOpen(false)}
  footer={
    <>
      <button className="rogym-btn rogym-btn--outline-white" onClick={() => setOpen(false)}>
        Hủy
      </button>
      <SubmitButton form="my-form" loading={saving}>
        Lưu
      </SubmitButton>
    </>
  }
>
  <form id="my-form">{fields}</form>
</Modal>
```

Modal tự đóng khi nhấn Escape. `footer` là optional; nếu bỏ qua, không render
footer bar.

### 3.4. `SearchInput`

```tsx
const [search, setSearch] = useState('')

<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Tìm học viên..."
  aria-label="Tìm học viên"
  debounceMs={300}
/>
```

`onChange` được gọi sau `debounceMs` ms kể từ lần gõ cuối (mặc định 300). Nút X
xuất hiện khi có value, clear về chuỗi rỗng khi nhấn.

### 3.5. `StatCard`

```tsx
<StatCard
  icon={<Users size={18} />}
  label="Học viên"
  value={total}
  hint="Đang được phân công"
  accent={true}
/>
```

`accent`: `true` (mặc định) → icon bg xanh accent; `false` → icon bg trắng mờ.

### 3.6. `StatusBadge` và `StatusTone`

```tsx
import { StatusBadge, type StatusTone } from '@/components/ui'

<StatusBadge status="Đang hoạt động" tone="success" />
<StatusBadge status="Đã hủy" tone="muted" />
```

`tone`: `'success' | 'accent' | 'warning' | 'danger' | 'muted'`.

Để map từ status string sang tone tự động, dùng `statusTone()` từ `@/lib/status`:

```tsx
import { statusTone, statusLabel } from '@/lib/status'

<StatusBadge status={statusLabel(session.status)} tone={statusTone(session.status)} />
```

## 4. Role UI Facades

Mỗi role có file UI riêng re-export aliases của shared components và thêm các
component đặc thù nghiệp vụ của role đó.

### 4.1. StaffUI

Nguồn: [`StaffUI.tsx`](./src/components/StaffUI.tsx)

```tsx
import {
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffEmptyState,
  StaffErrorState,
  StaffStatCard,
  StaffStatusBadge,
  StaffModal,
  SubmitButton,
  StaffSelect,
} from '@/components/StaffUI'
```

| Export | Thực thể | Ghi chú |
| --- | --- | --- |
| `StaffPage` | `Page` | Alias layout |
| `StaffPageHeader` | `PageHeader` | Alias layout |
| `StaffSkeleton` | `PageSkeleton` | Alias layout |
| `StaffEmptyState` | `PageEmptyState` | Alias layout |
| `StaffErrorState` | `PageErrorState` | Alias layout |
| `StaffStatCard` | `StatCard` | Props: `icon`, `label`, `value`, `hint?`, `accent?` |
| `StaffStatusBadge` | `StatusBadge` wrapper | Props: `status`, `tone?` — tự map qua `statusTone()` khi bỏ `tone` |
| `StaffModal` | `Modal` | Props: `open`, `title`, `onClose`, `children`, `footer?` |
| `SubmitButton` | Button wrapper | Props: `loading?`, `disabled?`, `form?`, `children` |
| `StaffSelect` | `Select` | Alias của shared Select |

### 4.2. TrainerUI

Nguồn: [`TrainerUI.tsx`](./src/components/TrainerUI.tsx)

```tsx
import {
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerEmptyState,
  TrainerErrorState,
  TrainerStatCard,
  TrainerStatusBadge,
  TrainerModal,
  SubmitButton,
  TrainerSelect,
  StudentCombobox,
} from '@/components/TrainerUI'
```

`TrainerStatusBadge`:

```tsx
<TrainerStatusBadge status={session.status} />
<TrainerStatusBadge status="Sắp bắt đầu" tone="warning" />
```

Khi bỏ qua `tone`, component dùng `statusTone()` và `statusLabel()` từ
[`lib/status.ts`](./src/lib/status.ts) để tự chuyển đổi.

`StudentCombobox`:

| Prop | Kiểu |
| --- | --- |
| `students` | `TrainerStudentSummary[]` |
| `value` | `string` |
| `onChange` | `(value: string) => void` |
| `disabled?` | `boolean` |

Tên là `StudentCombobox` nhưng implementation là select danh sách, không có text
search.

### 4.3. OwnerUI

Nguồn: [`OwnerUI.tsx`](./src/components/OwnerUI.tsx)

```tsx
import {
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerEmptyState,
  OwnerErrorState,
  OwnerStatCard,
  OwnerBadge,
  OwnerSelect,
} from '@/components/OwnerUI'
```

`OwnerStatCard = StatCard` — cùng props.

`OwnerBadge` có prop shape **khác** với `StatusBadge`:

```tsx
<OwnerBadge label="Premium" color="#06c384" />
```

Props: `label: string`, `color: string` (hex color string). Dùng khi cần màu tùy
chỉnh không thuộc tone set của `StatusBadge`. Không dùng `OwnerBadge` khi đã có
tone phù hợp — dùng `StatusBadge` thay.

### 4.4. MemberUI

Nguồn: [`MemberUI.tsx`](./src/components/MemberUI.tsx)

Chỉ re-export page foundation aliases. Không có stat card hay badge riêng — dùng
shared `StatCard` và `StatusBadge` trực tiếp khi cần.

## 5. Form components

### 5.1. `Select`

Nguồn: [`Select.tsx`](./src/components/Select.tsx)

```tsx
<Select
  value={status}
  onValueChange={setStatus}
  ariaLabel="Trạng thái buổi học"
>
  <option value="">Tất cả trạng thái</option>
  <option value="scheduled">Đã lên lịch</option>
  <option value="completed">Hoàn thành</option>
</Select>
```

| Prop | Ghi chú |
| --- | --- |
| `value` | Controlled string value |
| `onValueChange` | Nhận string mới |
| `children` | Các phần tử `option` |
| `disabled?`, `required?` | Trạng thái form |
| `name?` | Tên field |
| `ariaLabel?` | Accessible name khi thiếu label ngoài |
| `className?` | Mở rộng layout, không thay skin |

`Select` chuyển option sang Radix Select và dùng các class
`.rogym-select`, `.rogym-select__content`, `.rogym-select__item`.

### 5.2. `DatePickerInput`

Nguồn: [`DatePickerInput.tsx`](./src/components/DatePickerInput.tsx)

```tsx
<DatePickerInput
  value={from}
  onChange={setFrom}
  min="2026-01-01"
  aria-label="Từ ngày"
/>
```

- Input/output: `yyyy-MM-dd`.
- Hiển thị: `dd/MM/yyyy`.
- Props: `value`, `onChange`, `placeholder?`, `disabled?`, `min?`, `max?`,
  `aria-label?`, `className?`.

### 5.3. `DateTimePickerInput`

Nguồn: [`DateTimePickerInput.tsx`](./src/components/DateTimePickerInput.tsx)

```tsx
<DateTimePickerInput
  value={startsAt}
  onChange={setStartsAt}
  minuteStep={15}
  aria-label="Thời gian bắt đầu"
/>
```

- Input/output: `yyyy-MM-ddTHH:mm`.
- `min` và `max` dùng phần ngày để giới hạn calendar.
- `minuteStep` mặc định là `5`. Giờ mặc định khi chưa chọn: `08:00`.

Hai date picker đã cấu hình locale tiếng Việt và popover. Không dùng native input
khác style cho cùng use case nếu không có yêu cầu đặc biệt.

### 5.4. Profile fields

Nguồn:
- [`profile/ProfilePasswordField.tsx`](./src/components/profile/ProfilePasswordField.tsx)
- [`profile/ProfileInfoRow.tsx`](./src/components/profile/ProfileInfoRow.tsx)

```tsx
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'

<ProfileInfoRow label="Email" value={user.email} />
<ProfilePasswordField
  label="Mật khẩu mới"
  value={newPassword}
  onChange={setNewPassword}
/>
```

`ProfilePasswordField` dùng wrapping `<label>` nên không cần `htmlFor`/`id` bên
ngoài. `ProfileInfoRow` là read-only, không có input.

## 6. Workout components và helpers

Nguồn:

- [`ExerciseUI.tsx`](./src/components/workout/ExerciseUI.tsx)
- [`PlanBuilderUI.tsx`](./src/components/workout/PlanBuilderUI.tsx)
- [`exercise-data.ts`](./src/components/workout/exercise-data.ts)

### 6.1. `ExerciseCard`

Props:

| Prop | Vai trò |
| --- | --- |
| `exercise` | Dữ liệu `Exercise` |
| `action?` | Action ở góc card |
| `onClick?` | Bật trạng thái interactive |
| `imageAspect?` | Class aspect ratio, mặc định `aspect-[6/4]` |

Ảnh đã dùng `loading="lazy"`. Action bên trong card cần chặn event bubbling nếu có
hành vi khác với `onClick` của card.

### 6.2. `ExerciseCategoryFilterPopover`

Props: `open`, `value`, `onChange`, `onApply`, `onClose`.

Giá trị category dùng type `ExerciseCategoryFilter`. Danh sách option lấy từ
`EXERCISE_CATEGORY_OPTIONS`, không khai báo lại trong page.

### 6.3. `NumberField`

```tsx
<NumberField label="Số sets" value={sets} min={1} onChange={setSets} />
```

Props: `label`, `value`, `min`, `onChange`, `className?`.

### 6.4. `ExerciseTargetFields`

Component gom field sets, reps, duration, weight và rest:

```tsx
<ExerciseTargetFields
  category={exercise.category}
  values={targets}
  onChange={{
    sets: (sets) => setTargets((old) => ({ ...old, sets })),
    reps: (reps) => setTargets((old) => ({ ...old, reps })),
    duration: (duration) => setTargets((old) => ({ ...old, duration })),
    weight: (weight) => setTargets((old) => ({ ...old, weight })),
    restSeconds: (restSeconds) => setTargets((old) => ({ ...old, restSeconds })),
  }}
/>
```

Các option:

- `durationMode`: `cardio-only | always`.
- `gridClassName`: layout grid tùy ngữ cảnh.
- `compact`: giảm spacing field.
- `restOutsideGrid`: đặt rest field ngoài grid.
- `weightPlaceholder`: placeholder cho mức tạ.

### 6.5. Exercise helpers

| Export | Vai trò |
| --- | --- |
| `EXERCISE_CATEGORY_OPTIONS` | Option và label chuẩn |
| `getExerciseCategoryLabel()` | Chuyển enum thành tiếng Việt |
| `filterExercises()` | Search/category filter nhất quán |

`filterExercises()` hỗ trợ tìm theo tên, nhóm cơ, dụng cụ và tùy chọn mô tả.

## 7. Payment components và helpers

Nguồn:

- [`payment-methods.tsx`](./src/components/payment/payment-methods.tsx)
- [`payment-method-data.ts`](./src/components/payment/payment-method-data.ts)

| Export | Vai trò |
| --- | --- |
| `PaymentMethodIcon` | Icon theo `PaymentMethod` |
| `PAYMENT_METHOD_OPTIONS` | Danh sách option chuẩn |
| `getPaymentMethodLabel()` | Label đầy đủ hoặc compact |
| `maskPaymentAccountRef()` | Chỉ hiển thị bốn ký tự cuối |

```tsx
<span className="inline-flex items-center gap-2">
  <PaymentMethodIcon method={method} />
  {getPaymentMethodLabel(method)}
</span>
```

Không tự tạo mapping icon/label thanh toán trong từng page.

## 8. Charts

Nguồn:

- [`MemberWeightChart.tsx`](./src/components/charts/MemberWeightChart.tsx)
- [`StudentProgressChart.tsx`](./src/components/charts/StudentProgressChart.tsx)

```tsx
<div className="h-72">
  <StudentProgressChart data={points} />
</div>
```

`StudentProgressChart` cần parent có chiều cao vì dùng `ResponsiveContainer` với
`height="100%"`. `MemberWeightChart` có chiều cao 220px nội bộ.

Dữ liệu:

```ts
type ProgressPoint = {
  date: string
  weight: number | null
  bmi: number | null
}

type WeightPoint = {
  date: string
  weight: number
}
```

Nếu thêm chart mới, hãy tái sử dụng chart wrapper/theme hiện có thay vì lặp cấu
hình màu, tooltip và axis tại page.

## 9. PackagePicker

Nguồn: [`PackagePicker.tsx`](./src/components/PackagePicker.tsx)

```tsx
import { PackagePicker, PackagePickerSkeleton } from '@/components/PackagePicker'

{loading ? (
  <PackagePickerSkeleton />
) : (
  <PackagePicker
    packages={packages}
    selectedId={selectedId}
    onSelect={setSelectedId}
    startDate={startDate}
    endDate={endDate}
    endDateLabel="Ngày hết hạn"
    onContinue={handleContinue}
    currentPackageId={currentPkg?.packageId}
    fallbackPackage={fallbackPkg}
  />
)}
```

Props:

| Prop | Kiểu | Ghi chú |
| --- | --- | --- |
| `packages` | `Package[]` | Danh sách gói để chọn |
| `selectedId` | `string` | ID đang chọn |
| `onSelect` | `(id: string) => void` | Callback khi chọn gói |
| `startDate` | `Date` | Ngày bắt đầu hiển thị |
| `endDate` | `Date \| null` | Ngày hết hạn hiển thị |
| `endDateLabel` | `string` | Label cho endDate |
| `onContinue` | `() => void` | Callback khi nhấn tiếp tục |
| `currentPackageId?` | `string` | Đánh dấu gói đang dùng |
| `fallbackPackage?` | `Package \| null` | Gói fallback khi không tìm thấy selectedId |

Dùng `PackagePickerSkeleton` làm loading state, không tự tạo skeleton khác.

## 10. Hooks

### 10.1. `useTrainerStudents`

Nguồn: [`useTrainerStudents.ts`](./src/hooks/useTrainerStudents.ts)

Input tùy chọn: `page`, `pageSize`, `search`, `status`.

Output:

```ts
{
  data,
  total,
  totalPages,
  loading,
  error,
  reload,
}
```

### 10.2. `useTrainerSessions`

Nguồn: [`useTrainerSessions.ts`](./src/hooks/useTrainerSessions.ts)

Filter hỗ trợ: `memberId`, `roomId`, `status`, `from`, `to`, `page`, `pageSize`,
`sort`.

Output: `data`, `total`, `loading`, `error`, `reload`.

### 10.3. `useTrainerPlans`

Nguồn: [`useTrainerPlans.ts`](./src/hooks/useTrainerPlans.ts)

Không nhận input. Output: `data`, `loading`, `error`, `reload`.

### 10.4. `useSubscriptionExpiry`

Nguồn: [`useSubscriptionExpiry.ts`](./src/hooks/useSubscriptionExpiry.ts)

```ts
useSubscriptionExpiry(onExpired: () => void): void
```

Poll subscription status mỗi 60 giây. Gọi `onExpired` khi subscription hết hạn và
tự cập nhật `subscriptionStore`. Dùng trong shell component, không gọi trong page.

### 10.5. Quy tắc dùng hook

- Hook tự tải lại khi dependency filter thay đổi.
- Debounce search text trước khi truyền vào hook để tránh gọi API theo từng phím.
- Không gọi `reload()` trong effect phụ thuộc chính `reload` nếu hook đã tự load.
- Dùng `reload` sau create/update/delete thành công.
- Không sao chép state `loading/error/data` vào state thứ hai nếu không cần biến
  đổi dữ liệu.
- Memoize dữ liệu tính toán nặng; không memoize JSX nhỏ chỉ để "tối ưu".

Ví dụ debounce:

```tsx
const [searchInput, setSearchInput] = useState('')
const deferredSearch = useDeferredValue(searchInput)
const students = useTrainerStudents({ search: deferredSearch, page: 1 })
```

## 11. Layouts và route guards

### 11.1. `AuthLayout`

Nguồn: [`AuthLayout.tsx`](./src/layouts/AuthLayout.tsx)

- Render `<Outlet />` cho route auth.
- Redirect người dùng đã đăng nhập về route theo role.
- Có `Suspense` fallback cho lazy page.

```tsx
<Route element={<AuthLayout />}>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
</Route>
```

### 11.2. `DashboardLayout`

Nguồn: [`DashboardLayout.tsx`](./src/layouts/DashboardLayout.tsx)

- Sở hữu `Sidebar`, `Topbar`, main scroll area và route `Outlet`.
- Tải trạng thái subscription cho member.
- Ẩn sidebar với member chưa có subscription.
- Dùng `PageSkeleton` làm lazy fallback.

Page con không render lại sidebar/topbar và không tự thêm `min-height: 100vh`.

### 11.3. `ProtectedRoute`

Nguồn: [`ProtectedRoute.tsx`](./src/components/shared/ProtectedRoute.tsx)

```tsx
<ProtectedRoute allowedRoles={['trainer']}>
  <DashboardLayout />
</ProtectedRoute>
```

Component redirect về `/login` khi chưa có user và về `/` khi role không được
phép. Chờ `hasHydrated` từ authStore trước khi kiểm tra.

### 11.4. `SubscriptionRequired`

Nguồn:
[`SubscriptionRequired.tsx`](./src/components/shared/SubscriptionRequired.tsx)

Dùng như route wrapper cho khu vực member yêu cầu gói tập:

```tsx
<Route element={<SubscriptionRequired />}>
  <Route path="workout/plan" element={<WorkoutPlanPage />} />
</Route>
```

Khi subscription chưa được tải, component hiển thị loading. Khi không có gói,
component redirect về `/member/subscription/setup`.

### 11.5. `Sidebar` và `Topbar`

Đây là shell component do `DashboardLayout` sở hữu. Không import trực tiếp vào
page. Menu/sidebar theo role và title topbar theo route được cấu hình tại chính hai
component này.

### 11.6. Zustand Stores

```tsx
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
```

**authStore** (persist vào localStorage):

```ts
const { user, token, isAuthenticated, hasHydrated, setAuth, clearAuth } = useAuthStore()

interface AuthUser {
  userId: string
  email: string
  fullName: string
  roles: Role[]        // 'owner' | 'staff' | 'trainer' | 'member'
  staffId?: string | null
  memberId?: string | null
}
```

- `hasHydrated` — dùng để chờ localStorage hydration trước khi render route guard.
- Không tạo local state `isLoggedIn` hay `currentRole` — lấy trực tiếp từ
  `user.roles`.

**subscriptionStore** (in-memory, không persist):

```ts
const { hasActiveSub, setHasActiveSub } = useSubscriptionStore()
// hasActiveSub: boolean | null — null = chưa fetch
```

## 12. CSS API tái sử dụng

### 12.1. Foundation

| Nhu cầu | Class |
| --- | --- |
| Root public page | `.rogym-page` |
| Container | `.rogym-container` |
| Section | `.rogym-section` và variant |
| Card | `.rogym-card` và modifier |
| Label/input | `.rogym-field-label`, `.rogym-input` |
| Divider | `.rogym-divider` |
| Scrollbar | `.app-scrollbar` |

### 12.2. Actions

```tsx
<div className="flex flex-wrap gap-3">
  <button className="rogym-btn rogym-btn--primary">Xác nhận</button>
  <button className="rogym-btn rogym-btn--outline-white">Hủy</button>
  <button className="rogym-btn rogym-btn--danger">Xóa</button>
</div>
```

Base `.rogym-btn` là bắt buộc. Variant không thay thế base.

### 12.3. State

```tsx
<span className="rogym-tone-badge is-compact" data-tone="success">
  Đang hoạt động
</span>

<button
  className={cn('rogym-choice-chip', active && 'is-active')}
  aria-pressed={active}
>
  Tất cả
</button>

<article className="rogym-calendar-session" data-status={session.status}>
  {session.title}
</article>
```

Các state phổ biến:

- Boolean modifier: `is-active`, `is-open`, `is-selected`, `is-visible`,
  `is-completed`, `is-danger`, `is-warning`.
- Tone: `data-tone`.
- Session: `data-status`.

### 12.4. Domain classes

Chỉ dùng trong đúng miền:

| Miền | Nhóm class |
| --- | --- |
| Auth | `.rogym-auth-*`, `.rogym-quick-role*`, `.rogym-otp-input` |
| Shell | `.rogym-dashboard-*`, `.rogym-sidebar*`, `.rogym-topbar*` |
| Payment | `.rogym-payment-*`, `.rogym-checkout-*` |
| Workout | `.rogym-plan-*`, `.rogym-exercise-*`, `.rogym-workout-*` |
| Session | `.rogym-session-*`, `.rogym-calendar-*` |
| Package | `.rogym-package-*`, `.rogym-package-picker*` |

### 12.5. Generated classes

`.rogym-sx-*` là class migration nội bộ. Không:

- Dùng chúng như design token.
- Đoán ý nghĩa từ hash.
- Sao chép sang component mới.
- Đưa chúng vào public component API.

Khi gặp class hash cần tái sử dụng, hãy đặt tên semantic mới trong file phù hợp ở
`src/styles/components/`.

### 12.6. Lib utilities

**`@/lib/utils`:**

```ts
cn(...inputs: ClassValue[]): string
```

Merge Tailwind classes, xử lý conflict (clsx + tailwind-merge).

**`@/lib/date`** (múi giờ Asia/Ho_Chi_Minh):

```ts
formatDate(value?: string | Date | null): string         // "dd/MM/yyyy"
formatDateTime(value?: string | Date | null): string     // "dd/MM/yyyy HH:mm"
formatTime(value?: string | Date | null): string         // "HH:mm"
toDateInput(value?: string | Date | null): string        // "yyyy-MM-dd"
toDateTimeLocalInput(value?: string | Date | null): string
todayInput(): string                                      // hôm nay dạng "yyyy-MM-dd"
```

**`@/lib/currency`:**

```ts
formatVnd(value: number | string): string   // → "1.500.000 ₫"
```

**`@/lib/status`:**

```ts
statusLabel(status?: string | null): string     // → "Đang hoạt động", "Đã hủy", ...
statusTone(status?: string | null): StatusTone  // → 'success' | 'warning' | ...
```

Dùng để map status enum sang label tiếng Việt + màu badge. Không tự tạo mapping
riêng trong page.

**`@/lib/api-error`:**

```ts
getApiError(error: unknown, fallback?: string): string
isApiConflict(error: unknown): boolean
```

Dùng trong catch block thay vì tự parse `err.response?.data?.message`:

```ts
} catch (err) {
  setError(getApiError(err, 'Không thể tải dữ liệu.'))
}
```

**`@/lib/shift`:**

```ts
shiftLabel(shift: 'morning' | 'afternoon' | 'evening'): string
// → 'Buổi sáng' | 'Buổi chiều' | 'Buổi tối'
```

**`@/lib/package`:**

```ts
parsePackageBenefits(raw: string | null): string[]
```

Parse JSON hoặc newline-delimited string từ trường `benefits` của `Package`.

## 13. Ví dụ trang trainer hoàn chỉnh

```tsx
import { useDeferredValue, useState } from 'react'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'

export default function TrainerStudentsPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { data, loading, error, reload } = useTrainerStudents({
    search: deferredSearch,
    pageSize: 20,
  })

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Trainer"
        title="Học viên"
        actions={
          <input
            className="rogym-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm học viên"
            aria-label="Tìm học viên"
          />
        }
      />

      {loading ? (
        <TrainerSkeleton rows={4} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState
          title="Không tìm thấy học viên"
          description="Thử thay đổi từ khóa hoặc bộ lọc."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {data.map((student) => (
            <article
              key={student.memberId}
              className="rogym-card rogym-card--compact rogym-card--interactive"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold rogym-text-primary">
                    {student.fullName}
                  </h2>
                  <p className="mt-1 text-sm rogym-text-muted">
                    {student.memberCode}
                  </p>
                </div>
                <TrainerStatusBadge status={student.status} />
              </div>
            </article>
          ))}
        </section>
      )}
    </TrainerPage>
  )
}
```

## 14. Checklist tạo màn hình mới

- Dùng đúng layout và route guard.
- Dùng `PageUI` hoặc alias theo role.
- Có đủ loading, empty và error state.
- Dùng hook/service hiện có, không gọi cùng API ở nhiều effect.
- Search text được debounce/defer khi cần.
- Dùng `Select` và date picker dùng chung.
- Dùng helper label/status/payment/exercise thay vì mapping lặp.
- Dùng `getApiError()` trong catch block, không tự parse `err.response?.data?.message`.
- Profile fields: dùng `ProfilePasswordField` / `ProfileInfoRow`, không tự viết lại.
- Style nằm trong `src/styles/` (`globals.css` hoặc `components/`); TSX chỉ tham chiếu class.
- Không tạo class `.rogym-sx-*`.
- Dynamic state dùng modifier hoặc `data-*`.
- Kiểm tra keyboard, focus, disabled và mobile.
- Chạy `npm run lint` và `npm run build` trong `client`.
