# Tài Liệu Đặc Tả & Hướng Dẫn Sử Dụng Bộ Component RoGym (`ui` & `shared`)

Tài liệu này tổng hợp toàn bộ các component giao diện dùng chung trong hệ thống **RoGym (Gym Management System)**, bao gồm:
1. **Thư viện UI Core ([`client/src/components/ui`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui))**: Bộ nguyên tử và phân tử giao diện chuẩn hóa (Buttons, Inputs, Cards, Tables, Dialogs...).
2. **Thư viện Shared Components ([`client/src/components/shared`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared))**: Bộ component bố cục hệ thống, thanh điều hướng theo phân quyền, chuông thông báo thời gian thực, route guard bảo mật và loader.

---

## I. Tổng Quan Design System RoGym

Hệ thống UI được xây dựng trên các nguyên tắc thiết kế cốt lõi:
- **Chủ đề thị giác (Visual Theme)**: Dark Cyber-Gym hiện đại với tông nền đen/xanh rêu đậm (`#080e0b`, `#0f1c16`), màu điểm nhấn xanh ngọc lục bảo **RoGym Green** (`#06c384`), **RoGym Teal** (`#42e09e`) và text thứ cấp tông xám ngọc (`#bbcabf`).
- **Khả năng tương thích thiết bị**: Chuẩn **Mobile-First**, đảm bảo diện tích chạm tối thiểu **44px** (`min-h-[44px]`, `touch-manipulation`), tự động co giãn theo viewport (`mobileFull`, `responsiveIconOnly`).
- **Khả năng tiếp cận (Accessibility - a11y)**: Hỗ trợ đầy đủ `aria-*`, điều khiển bàn phím (`focus-visible`, `Escape` to close), `role="alert"`, `aria-busy` khi loading.
- **Đa ngôn ngữ (i18n)**: Tích hợp sẵn `react-i18next` (hỗ trợ Tiếng Việt `vi` và Tiếng Nhật `ja`).

---

## II. Chi Tiết Các UI Components Core (`client/src/components/ui`)

---

### 1. Nhóm Nút Bấm & Điều Hướng (Button Family)

Gồm 3 biến thể component xuất phát từ file [`Button.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Button.tsx):

- **`<Button>`**: Dùng cho hành động (trigger function, form submit, toggle state) ➔ Render thẻ `<button>`.
- **`<ButtonLink>`**: Dùng cho điều hướng nội bộ SPA ➔ Tích hợp `react-router-dom` `<Link>`.
- **`<ButtonAnchor>`**: Dùng cho liên kết ngoài hoặc tải file ➔ Render thẻ `<a>`.

#### 🎯 Vai trò & Đặc điểm
- Là component nút bấm tương tác trung tâm của toàn bộ ứng dụng.
- Tích hợp sẵn hiệu ứng xoay **Spinner Loading**, quản lý trạng thái `disabled`, icon hai phía (`leftIcon`, `rightIcon`), chế độ ẩn chữ chỉ hiện icon trên mobile (`responsiveIconOnly`).
- Hỗ trợ hàm tiện ích [`getButtonClasses`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Button.tsx#L74) và [`normalizeButtonSize`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Button.tsx#L51).

#### 🎨 Hình dáng & Biến thể
- **Variants (13 kiểu)**:
  - `primary`: Nền xanh lục bảo `#06c384`, chữ đen đậm `#00492f`, đổ bóng phát sáng.
  - `secondary` / `outline-white`: Viền trắng bán trong suốt `rgba(255,255,255,0.45)`, nền mờ, hover viền trắng đặc.
  - `danger`: Nền đỏ cảnh báo (xóa dữ liệu, hủy gói quan trọng).
  - `outline-green` / `outline-green-light`: Viền xanh lục bảo, chữ xanh.
  - `dark`: Nền xám đen tối giản.
  - `elevated`: Nền tối nâng cao với viền nhẹ và đổ bóng.
  - `icon`: Nút hình vuông tỉ lệ 1:1 chuyên bọc icon.
  - `text`, `text-muted`, `text-accent`, `nav-link`: Dạng link chữ không viền/nền.
- **Sizes**: `xs` (30px), `sm` / `compact` (38px), `md` / `default` (44px), `lg` (50px), `xl` / `hero` (56px), `nav`, `wide`.

#### ⚙️ Bảng Props (`BaseButtonProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `variant` | `ButtonVariant` | `'primary'` | Kiểu dáng và màu sắc hiển thị |
| `size` | `ButtonSize` | `'default'` (`md`) | Kích thước chiều cao và padding |
| `loading` | `boolean` | `false` | Bật spinner xoay, tự động vô hiệu hóa click |
| `loadingText` | `string` | `undefined` | Văn bản hiển thị thay thế khi đang load |
| `leftIcon` | `ReactNode` | `undefined` | Icon gắn kèm ở đầu nút |
| `rightIcon` | `ReactNode` | `undefined` | Icon gắn kèm ở cuối nút |
| `fullWidth` | `boolean` | `false` | Chiếm 100% chiều rộng container |
| `mobileFull` | `boolean` | `false` | Full-width trên mobile, auto trên desktop |
| `responsiveIconOnly` | `boolean` | `false` | Ẩn chữ trên màn hình nhỏ, chỉ giữ lại icon |
| `truncate` | `boolean` | `false` | Cắt chữ bằng dấu `...` khi nội dung quá dài |

#### 💡 Ví dụ sử dụng:
```tsx
import { Button, ButtonLink } from '@/components/ui'
import { Plus, Save } from 'lucide-react'

// Nút submit có loading
<Button variant="primary" loading={isSubmitting} leftIcon={<Save size={16} />}>
  Lưu thông tin
</Button>

// Nút điều hướng responsive (chỉ hiện icon trên mobile)
<ButtonLink to="/admin/members/create" variant="primary" leftIcon={<Plus size={16} />} responsiveIconOnly>
  Thêm hội viên
</ButtonLink>
```

---

### 2. FormField ([`FormField.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/FormField.tsx))

#### 🎯 Vai trò & Đặc điểm
- Là container bao bọc chuẩn hóa cho mọi input trong form.
- Quản lý layout theo chiều dọc: **Label (Nhãn) + Bắt buộc (`*`) ➔ Control (Input/Select/...) ➔ Error/Hint message**.
- Tự động gắn nhãn trợ năng và animation chuyển động khi xuất hiện thông báo lỗi.

#### 🎨 Hình dáng & Biến thể
- Label chữ in hoa nhỏ (`text-xs uppercase tracking-wider text-white/80`). Dấu sao đỏ nếu `required`.
- Báo lỗi chữ đỏ `text-red-400 font-medium` với hiệu ứng `animate-in fade-in`.
- Hint gợi ý màu xám mờ `rogym-text-dim`.

#### ⚙️ Bảng Props (`FormFieldProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `label` | `ReactNode` | `undefined` | Nhãn tiêu đề trường |
| `required` | `boolean` | `false` | Hiển thị dấu `*` đỏ bắt buộc nhập |
| `hint` | `ReactNode` | `undefined` | Dòng chú thích / hướng dẫn phụ |
| `error` | `string \| null` | `undefined` | Thông báo lỗi xác thực |
| `htmlFor` | `string` | `undefined` | ID của input liên kết |
| `fullWidth` | `boolean` | `true` | Chiếm toàn bộ chiều ngang dòng |

#### 💡 Ví dụ sử dụng:
```tsx
<FormField label="Họ và tên" required error={errors.fullName?.message}>
  <Input id="fullName" {...register('fullName')} placeholder="Nhập họ tên" />
</FormField>
```

---

### 3. Input ([`Input.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Input.tsx))

#### 🎯 Vai trò & Đặc điểm
- Ô nhập dữ liệu đơn dòng cao cấp.
- Tích hợp sẵn:
  - Icon trái/phải (`leftIcon`, `rightIcon`).
  - Nút chuyển đổi ẩn/hiện mật khẩu tự động (`showPasswordToggle`).
  - Nút xóa nhanh nội dung (`clearable` + `onClear`).
  - Trạng thái xoay loading trực tiếp góc phải.
  - Tương thích đầy đủ `ref` và thư viện form (React Hook Form).

#### 🎨 Hình dáng & Biến thể
- Nền `var(--rogym-bg-card)`, viền sáng nhẹ khi focus `focus:border-[var(--rogym-teal)]`.
- Kích thước: `sm` (38px), `md` (44px - chuẩn mobile), `lg` (50px).
- Khi có `error`: Viền đỏ sáng và ring đỏ `border-red-500/80 focus:ring-red-400/30`.

#### ⚙️ Bảng Props (`BaseInputProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `inputSize` / `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Kích thước chiều cao input |
| `leftIcon` / `leadingIcon` | `ReactNode` | `undefined` | Icon nằm bên trái trong ô input |
| `rightIcon` / `trailingIcon` | `ReactNode` | `undefined` | Icon nằm bên phải trong ô input |
| `showPasswordToggle` | `boolean` | `false` | Bật nút con mắt ẩn/hiện mật khẩu (với `type="password"`) |
| `clearable` | `boolean` | `false` | Hiển thị nút `X` xóa nhanh khi có dữ liệu |
| `onClear` | `() => void` | `undefined` | Hàm callback khi bấm nút `X` |
| `loading` | `boolean` | `false` | Hiển thị spinner loading ở góc phải |
| `error` | `boolean \| string` | `undefined` | Đổi màu viền và ring cảnh báo lỗi |
| `fullWidth` | `boolean` | `true` | Chiếm 100% chiều rộng |
| `mobileFull` | `boolean` | `false` | Full-width trên mobile, auto trên desktop |

#### 💡 Ví dụ sử dụng:
```tsx
<Input
  type="password"
  showPasswordToggle
  leftIcon={<Lock size={16} />}
  error={!!errorMessage}
  placeholder="Nhập mật khẩu..."
/>
```

---

### 4. Textarea ([`Textarea.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Textarea.tsx))

#### 🎯 Vai trò & Đặc điểm
- Ô nhập văn bản nhiều dòng (ghi chú bài tập, mô tả gói tập, bệnh sử...).
- Hỗ trợ kéo giãn chiều dọc (`resize-y`), chiều cao tối thiểu `min-h-[96px]`, bo góc `rounded-xl`.

#### ⚙️ Bảng Props (`BaseTextareaProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `rows` | `number` | `3` | Số dòng mặc định |
| `error` | `boolean \| string` | `undefined` | Trạng thái báo lỗi viền đỏ |
| `fullWidth` | `boolean` | `true` | Chiếm 100% chiều rộng |
| `mobileFull` | `boolean` | `false` | Co giãn theo màn hình |

#### 💡 Ví dụ sử dụng:
```tsx
<Textarea
  rows={4}
  placeholder="Nhập mô tả bài tập hoặc lời khuyên huấn luyện..."
  error={errors.description?.message}
/>
```

---

### 5. Checkbox ([`Checkbox.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Checkbox.tsx)) & Switch ([`Switch.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Switch.tsx))

#### 🎯 Vai trò & So sánh sử dụng

| Đặc điểm | `Checkbox` | `Switch` |
| :--- | :--- | :--- |
| **Bản chất** | Chọn 1 hoặc nhiều mục trong danh sách / Đồng ý điều khoản | Bật/tắt trạng thái tức thì (On/Off toggle) |
| **Hình dáng** | Ô vuông bo tròn, dấu tick xanh khi checked | Thanh trượt dạng viên thuốc, hỗ trợ spinner con |
| **Touch target** | Chuẩn 44px (`min-h-[44px]`) | Chuẩn 44px (`min-h-[44px]`) |
| **Kích thước** | `sm`, `md`, `lg` | `sm`, `md`, `lg` |
| **Kịch bản dùng** | Chọn hàng loạt trong bảng, form đăng ký | Kích hoạt tài khoản, bật thông báo, chế độ riêng tư |

#### 💡 Ví dụ sử dụng:
```tsx
// Checkbox xác nhận điều khoản
<Checkbox
  id="terms"
  checked={isAccepted}
  onChange={(e) => setIsAccepted(e.target.checked)}
  label="Tôi đồng ý với điều khoản sử dụng"
  description="Áp dụng cho mọi buổi tập tại chi nhánh"
/>

// Switch kích hoạt trạng thái tức thì
<Switch
  id="active-status"
  checked={isActive}
  onChange={(e) => handleToggleStatus(e.target.checked)}
  label="Trạng thái hoạt động"
  description="Cho phép hội viên đặt lịch với HLV này"
  loading={isUpdating}
/>
```

---

### 6. Select ([`Select.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Select.tsx))

#### 🎯 Vai trò & Đặc điểm
- Hộp chọn giá trị đơn (Single Select) xây dựng trên nền tảng **Radix UI Select primitive**.
- Hoàn toàn khắc phục các giới hạn của thẻ `<select>` HTML gốc: popup hiển thị qua portal z-index cao, hỗ trợ scroll mượt mà, checkmark trạng thái chọn, bàn phím điều hướng mũi tên và phím tắt.

#### ⚙️ Bảng Props (`SelectProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `value` | `string` | Bắt buộc | Giá trị đang chọn |
| `onValueChange` | `(value: string) => void` | Bắt buộc | Callback khi thay đổi giá trị |
| `disabled` | `boolean` | `false` | Vô hiệu hóa hộp chọn |
| `required` | `boolean` | `false` | Bắt buộc chọn |
| `error` | `boolean \| string` | `undefined` | Trạng thái lỗi viền đỏ |

#### 💡 Ví dụ sử dụng:
```tsx
<Select value={role} onValueChange={(val) => setRole(val)} error={!!errors.role}>
  <option value="">-- Chọn vai trò --</option>
  <option value="admin">Quản trị viên</option>
  <option value="trainer">Huấn luyện viên</option>
  <option value="member">Hội viên</option>
</Select>
```

---

### 7. Bộ Chọn Ngày & Giờ (Date & Time Pickers)

#### 🎯 Vai trò & Đặc điểm
- **`DatePickerInput`** ([`DatePickerInput.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/DatePickerInput.tsx)):
  - Chọn ngày theo định dạng `yyyy-MM-dd` (hiển thị UI `dd/MM/yyyy`).
  - Cho phép vừa **gõ trực tiếp bàn phím** (tự động parse nhiều định dạng `d/M/yyyy`, `dd-MM-yyyy`), vừa **bấm chọn trên lịch Popover** (`react-day-picker`).
  - Hỗ trợ dropdown chọn nhanh tháng/năm (`captionLayout="dropdown"`), giới hạn dải ngày (`min`, `max`), tự động chuyển đổi ngôn ngữ lịch Tiếng Việt / Tiếng Nhật theo hệ thống.
- **`DateTimePickerInput`** ([`DateTimePickerInput.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/DateTimePickerInput.tsx)):
  - Mở rộng chọn cả **Ngày + Giờ:Phút** (định dạng `yyyy-MM-ddTHH:mm`).
  - Tích hợp thêm cụm chọn giờ (00-23) và phút với bước nhảy tùy chỉnh (`minuteStep`, mặc định 5 phút).

#### 💡 Ví dụ sử dụng:
```tsx
// Chọn ngày sinh (không cho phép chọn ngày tương lai)
<DatePickerInput
  value={birthDate}
  onChange={setBirthDate}
  max={format(new Date(), 'yyyy-MM-dd')}
/>

// Đặt lịch tập với PT (bước nhảy 15 phút)
<DateTimePickerInput
  value={sessionTime}
  onChange={setSessionTime}
  min={format(new Date(), 'yyyy-MM-ddTHH:mm')}
  minuteStep={15}
/>
```

---

### 8. Thanh Tìm Kiếm & Bộ Lọc (Search & Filters)

Bộ 3 component kết hợp tạo nên thanh công cụ danh sách dữ liệu:

1. **`SearchInput`** ([`SearchInput.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/SearchInput.tsx)):
   - Tích hợp sẵn **Debounce tự động** (`debounceMs`, mặc định 300ms) giúp tối ưu gọi API tìm kiếm.
   - Nhấn `Enter` để search tức thì, nhấn `Escape` hoặc nút `X` để clear tìm kiếm.
2. **`FilterDropdown`** ([`FilterDropdown.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/FilterDropdown.tsx)):
   - Nút bật menu popover chứa các bộ lọc phụ (trạng thái, chi nhánh, khoảng giá...).
   - Hiển thị **Badge số lượng bộ lọc đang kích hoạt** (`activeCount`), chân popup tối ưu 2 nút cân đối "Hủy" và "Lưu".
3. **`SearchToolbar`** ([`SearchToolbar.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/SearchToolbar.tsx)):
   - Component mẹ kết hợp đồng bộ: Ô tìm kiếm + Khe cắm bộ lọc (`filters`) + Khe cắm nút hành động (`actions`).
   - Tự động chuyển đổi layout Responsive: Trên mobile xếp dọc (`flex-col`), trên desktop xếp ngang (`flex-row`).

#### 💡 Ví dụ sử dụng:
```tsx
<SearchToolbar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Tìm kiếm theo tên, SĐT, email..."
  filters={
    <FilterDropdown
      open={filterOpen}
      onOpenChange={setFilterOpen}
      activeCount={activeFilterCount}
      onApply={handleApplyFilter}
      title="Lọc hội viên"
    >
      <Select value={status} onValueChange={setStatus}>
        <option value="">Tất cả trạng thái</option>
        <option value="active">Đang hoạt động</option>
        <option value="expired">Đã hết hạn</option>
      </Select>
    </FilterDropdown>
  }
  actions={
    <ButtonLink to="/admin/members/create" variant="primary" leftIcon={<Plus size={16} />}>
      Thêm mới
    </ButtonLink>
  }
/>
```

---

### 9. Thẻ Chứa & Thống Kê (Card Enterprise Suite & StatCard)

#### 🎯 Vai trò & Phân biệt
- **`Card Family`** ([`Card.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Card.tsx)):
  - **Bộ subcomponent**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardMedia`, `CardContent`, `CardFooter`, `CardRibbon`, `CardSkeleton`.
  - **Variants**:
    - `default`: Nền card tiêu chuẩn RoGym với viền teal mờ (`border-teal/20`).
    - `compact`: Nền card bo tròn thu gọn (`rounded-2xl`).
    - `interactive`: Hiệu ứng hover nổi 3D, đổ bóng và sáng viền, hỗ trợ keyboard a11y (Enter/Space) và click.
    - `glass`: Hiệu ứng kính mờ (backdrop blur), mờ trong suốt.
    - `bordered`: Viền nổi bật cho bảng giá hoặc phần tử cần nhấn mạnh.
    - `elevated`: Nền đổ bóng nhiều lớp cao cấp.
    - `accent`: Nền dạ quang/nhấn nhá với dải gradient ngọc bích (thường dùng cho bài tập/gói PT).
    - `warning` / `danger`: Trạng thái cảnh báo hết hạn hoặc hủy gói.
  - **Responsive Padding**:
    - `none` (`p-0`): Dành cho Card có ảnh tràn viền hoặc header accordion riêng.
    - `xs` (`p-2.5 sm:p-3`): Thẻ nhỏ, chip hoặc badge container.
    - `sm` (`p-3.5 sm:p-4 md:p-5`): Thẻ compact dashboard, history log.
    - `md` (`p-4 sm:p-5 md:p-6` - Mặc định): Kích thước tiêu chuẩn.
    - `lg` (`p-5 sm:p-6 md:p-8`): Thẻ lớn nổi bật hoặc trang pricing.
  - **Polymorphism & Routing**:
    - Thuộc tính `as`: `'div' | 'article' | 'section' | 'li' | 'aside'` chuẩn Semantic HTML5.
    - Truyền `to="/..."` tự động chuyển thành `<Link>` của React Router.
    - Truyền `href="http..."` tự động chuyển thành thẻ `<a>` kèm `rel="noreferrer noopener"`.
  - **Media & Ribbon**:
    - `<CardMedia src="..." aspectRatio="16/9 | 4/3 | 1/1 | 21/9" zoomOnHover overlayContent={...} badge={...} />` cho thumbnail bài tập, hình ảnh gói tập.
    - `<CardRibbon tone="accent | danger | warning | gold">HOT</CardRibbon>` nhãn góc ribbon nổi bật.
  - **Domain Aliases**:
    - `MemberCard`, `TrainerCard`, `StaffCard`, `OwnerCard` được re-export đồng bộ tại `MemberUI.tsx`, `TrainerUI.tsx`, `StaffUI.tsx`, `OwnerUI.tsx`.
- **`StatCard`** ([`StatCard.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/StatCard.tsx)):
  - Thẻ hiển thị chỉ số thống kê (KPI/Metrics) trên Dashboard.
  - Tích hợp sẵn icon nổi bật, badge xu hướng (`trend`), skeleton loading (`loading`), và biến thành link điều hướng khi truyền prop `to` hoặc `onClick`.

#### 💡 Ví dụ sử dụng:
```tsx
// 1. Thẻ bài tập / Domain Card đa năng (Exercise Card)
<Card as="article" variant="interactive" padding="none" to={`/member/exercises/${id}`}>
  <CardMedia
    src={exercise.thumbnailUrl}
    alt={exercise.name}
    aspectRatio="16/9"
    zoomOnHover
    badge={<Badge tone="accent">{exercise.bodyPart}</Badge>}
  />
  <CardContent className="p-4 space-y-2">
    <CardTitle size="md" truncate>{exercise.name}</CardTitle>
    <CardDescription lineClamp={2}>{exercise.description}</CardDescription>
  </CardContent>
  <CardFooter bordered responsiveStack align="between" className="px-4 py-3">
    <span className="text-xs text-white/50">{exercise.equipment}</span>
    <Button variant="primary" size="sm">Bắt đầu tập</Button>
  </CardFooter>
</Card>

// 2. Thẻ hiển thị gói tập có Ribbon
<Card variant="accent" padding="md" className="relative">
  <CardRibbon tone="accent">PHỔ BIẾN NHẤT</CardRibbon>
  <CardHeader
    eyebrow="Gói tập 6 tháng"
    actions={<StatusBadge status="active" label="Đang hoạt động" />}
  >
    <CardTitle size="lg">Platinum VIP</CardTitle>
    <CardDescription>Bao gồm Huấn Luyện Viên Cá Nhân 1-1</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold text-teal-300">1,500,000 ₫</p>
  </CardContent>
  <CardFooter>
    <Button variant="primary" className="w-full">Gia hạn ngay</Button>
  </CardFooter>
</Card>

// 3. StatCard chỉ số Dashboard
<StatCard
  icon={<Users size={20} />}
  label="Tổng số hội viên"
  value="1,248"
  hint="Tăng trưởng so với tháng trước"
  trend={{ value: '8.4%', isPositive: true }}
  to="/owner/members"
/>
```

---

### 10. Bảng Dữ Liệu & Phân Trang (Tables & Pagination)

#### 🎯 Vai trò & So sánh sử dụng

| Thành phần | File nguồn | Khi nào nên dùng? |
| :--- | :--- | :--- |
| **`Table` Suite** | [`Table.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Table.tsx) | Bộ nguyên tử HTML table (`TableContainer`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`). Dùng khi cần vẽ bảng cấu trúc tùy biến phức tạp (merge cell, custom row grouping). |
| **`ResponsiveTable<T>`** | [`ResponsiveTable.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/ResponsiveTable.tsx) | **Khuyên dùng cho mọi trang danh sách**. Tự động hiển thị bảng cuộn trên Desktop (`md+`) và **chuyển thành Card Stack trên Mobile** (`<md`). Tích hợp sẵn Skeleton, Error Retry, Empty state, Pagination và `onRowClick`. |
| **`Pagination`** | [`Pagination.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Pagination.tsx) | Thanh chuyển trang thông minh, tự động rút gọn dấu ba chấm (`...`) và hiển thị cô đọng trên mobile. |

#### 💡 Ví dụ sử dụng `ResponsiveTable`:
```tsx
const columns: ColumnDef<Member>[] = [
  { key: 'name', header: 'Hội viên', render: (m) => <span className="font-bold">{m.fullName}</span> },
  { key: 'phone', header: 'SĐT' },
  { key: 'status', header: 'Trạng thái', render: (m) => <StatusBadge status={m.status} /> },
  { key: 'actions', header: 'Hành động', align: 'right', render: (m) => <Button size="xs" variant="outline-white">Chi tiết</Button> },
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

---

### 11. Nhãn Trạng Thái (Badge & StatusBadge)

#### 🎯 Vai trò & Phân biệt
- **`Badge`** ([`Badge.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Badge.tsx)):
  - Huy hiệu nhãn thông tin đa dụng.
  - Tones: `success`, `accent`, `warning`, `danger`, `info`, `purple`, `primary`, `muted`, `outline`.
  - Sizes: `xs`, `sm`, `md`, `lg`. Hỗ trợ `leftIcon`, `rightIcon`, `interactive` (có thể click).
- **`StatusBadge`** ([`StatusBadge.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/StatusBadge.tsx)):
  - Component chuyên dụng cho trạng thái trong domain Gym (Active, Inactive, Expired, Pending, Cancelled, Paid...).
  - Tự động map từ chuỗi trạng thái (`status="active"`, `"pending"`) sang tone màu và text đa ngữ.

#### 💡 Ví dụ sử dụng:
```tsx
// Badge nhãn danh mục bài tập
<Badge tone="purple" size="sm">Cơ bụng 6 múi</Badge>

// StatusBadge tự động nhận diện màu và dịch ngữ
<StatusBadge status={member.status} size="sm" />
```

---

### 12. Hộp Thoại & Xác Nhận (Modal & ConfirmDialog)

#### 🎯 Vai trò & Đặc điểm
- **`Modal`** ([`Modal.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Modal.tsx)):
  - Hộp thoại popup đa năng (chứa form thêm/sửa, xem chi tiết).
  - Tích hợp backdrop làm mờ màn hình, chặn click xuyên thấu, đóng khi nhấn phím `Escape`, nút `X` đóng góc phải.
  - Sizes: `'sm' | 'md' | 'lg' | 'xl' | '2xl'`. Giới hạn chiều cao an toàn `max-h-[90vh]` kèm scroll bên trong.
- **`ConfirmDialog`** ([`ConfirmDialog.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/ConfirmDialog.tsx)):
  - Hộp thoại xác nhận hành động nguy hiểm/quan trọng (xóa bản ghi, hủy lịch, hoàn tiền).
  - Tích hợp sẵn icon cảnh báo, nút Hủy và nút Xác nhận, hỗ trợ trạng thái `loading` khi đang thực thi async.

#### 💡 Ví dụ sử dụng:
```tsx
// Modal form
<Modal open={isOpen} onClose={() => setIsOpen(false)} title="Thêm thiết bị mới" size="lg">
  <EquipmentForm onSuccess={() => setIsOpen(false)} />
</Modal>

// Dialog xác nhận xóa
<ConfirmDialog
  open={confirmDeleteOpen}
  onClose={() => setConfirmDeleteOpen(false)}
  onConfirm={handleDelete}
  variant="danger"
  title="Xóa bài tập"
  description="Hành động này sẽ xóa vĩnh viễn bài tập khỏi hệ thống. Bạn có chắc chắn muốn tiếp tục?"
  loading={isDeleting}
/>
```

---

### 13. Khung Trang & Trạng Thái Tải (PageUI Suite)

Gồm 5 component chuẩn hóa bố cục trang trong file [`PageUI.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/PageUI.tsx):

1. **`Page`**: Container bao bọc toàn trang, giới hạn max-width `1280px` căn giữa với khoảng cách chuẩn `space-y-6`.
2. **`PageHeader`**: Header tiêu chuẩn với 3 tầng thông tin: `eyebrow` (nhãn định danh trên đầu) + `title` (`h1` 2xl/3xl) + `description` (mô tả) + `actions` (cụm nút bấm bên phải).
3. **`PageSkeleton`**: Khung placeholder tải trang dạng xung nhịp `animate-pulse` (`rows` tùy chỉnh số dòng).
4. **`PageEmptyState`**: Khung thông báo không có dữ liệu kèm icon kính lúp, tiêu đề, mô tả và nút hành động.
5. **`PageErrorState`**: Khung thông báo lỗi kết nối/tải dữ liệu kèm icon cảnh báo và nút "Thử lại" (`onRetry`).

#### 💡 Ví dụ sử dụng:
```tsx
export function MembersPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="QUẢN LÝ KHÁCH HÀNG"
        title="Danh sách hội viên"
        description="Quản lý thông tin hợp đồng, gói tập và lịch sử rèn luyện của hội viên."
        actions={<Button variant="primary" leftIcon={<Plus size={16} />}>Thêm hội viên</Button>}
      />
      {isLoading ? (
        <PageSkeleton rows={4} />
      ) : error ? (
        <PageErrorState message={error} onRetry={refetch} />
      ) : (
        <ResponsiveTable ... />
      )}
    </Page>
  )
}
```

---

### 14. Chuyển Đổi Ngôn Ngữ ([`LanguageSwitcher.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/LanguageSwitcher.tsx))

#### 🎯 Vai trò & Đặc điểm
- Nút bấm chuyển đổi nhanh giữa hai ngôn ngữ **VI (Tiếng Việt)** và **JA (Tiếng Nhật)**.
- Tự động lưu ngôn ngữ đã chọn vào `localStorage` (`'gym-locale'`), cập nhật `document.documentElement.lang` và thông báo cho engine `i18next`.
- Thường được nhúng cố định trên thanh Navbar hoặc Header của hệ thống.

---

## III. Chi Tiết Các Component Dùng Chung (`client/src/components/shared`)

Các component trong thư mục `shared` đảm nhận vai trò quản lý **Layout**, **Điều hướng (Navigation)**, **Bảo mật tuyến đường (Route Guards)**, **Hệ thống thông báo thời gian thực** và **Bộ lọc chuyên biệt theo nghiệp vụ**.

---

### 1. Sidebar ([`Sidebar.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/Sidebar.tsx))

#### 🎯 Vai trò & Đặc điểm
- Thanh điều hướng dọc (Vertical Navigation) cố định cạnh trái cho Desktop (`md+`) và dạng ngăn kéo vuốt (Off-canvas Drawer) trên Mobile (`<md`).
- **Phân quyền động (Role-based Navigation)**: Tự động phát hiện vai trò hiện tại của tài khoản (`member`, `trainer`, `staff`, `owner`) để hiển thị cây danh mục tương ứng.
- **Tính năng độc quyền cho Chủ phòng tập (Owner Mode Switch)**: Cho phép Owner chuyển đổi qua lại tức thì giữa chế độ quản trị chiến lược (`/owner`) và chế độ vận hành như nhân viên (`/staff`).
- **Tương tác gói tập thông minh**: Kiểm tra trực tiếp từ `useSubscriptionStore` để chuyển đổi linh hoạt giữa link *"Gói hiện tại"* và *"Mua gói tập"*.
- **Hiệu ứng Hover Expand**: Tự động mở rộng hiển thị nhãn chữ khi hover chuột, kèm bộ đếm lùi 1000ms trước khi thu nhỏ (`handleMouseLeave`), tránh giật lag layout.
- **Hỗ trợ Sub-navigation đa tầng**: Tự động mở menu con khi nhóm route đang active.

#### 🎨 Hình dáng & Biến thể
- Nền tối rêu sâu (`rogym-sidebar`), viền sáng nhẹ, logo RoGym phát sáng xanh lục ở đỉnh.
- Các liên kết có hiệu ứng tia sáng quét `rogym-sweep` và highlight xanh ngọc khi active (`bg-[#06c384]/15 text-[#42e09e]`).

#### ⚙️ Bảng Props (`SidebarProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `isMobileOpen` | `boolean` | `false` | Điều khiển đóng/mở Drawer menu trên thiết bị di động |
| `onCloseMobile` | `() => void` | `undefined` | Callback đóng drawer khi người dùng click liên kết hoặc nền mờ |

#### 💡 Ví dụ sử dụng:
```tsx
import Sidebar from '@/components/shared/Sidebar'

// Sử dụng trong MainLayout
<div className="flex min-h-screen">
  <Sidebar isMobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
  <main className="flex-1 p-6 md:pl-20">{children}</main>
</div>
```

---

### 2. Topbar ([`Topbar.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/Topbar.tsx))

#### 🎯 Vai trò & Đặc điểm
- Thanh tiện ích nổi cố định ở góc trên bên phải màn hình (`fixed top-4 right-5 z-40`).
- Tích hợp 4 cụm tính năng thiết yếu:
  1. **Nút Kêu gọi Hành động (CTA Mua gói tập)**: Tự động hiển thị nổi bật màu xanh lục khi hội viên chưa có gói tập hợp lệ.
  2. **Chuyển đổi ngôn ngữ**: Tích hợp [`LanguageSwitcher`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/LanguageSwitcher.tsx).
  3. **Chuông thông báo**: Tích hợp [`NotificationBell`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/NotificationBell.tsx).
  4. **Avatar người dùng & Dropdown Menu**: Hiển thị chữ cái đầu tên người dùng, mở menu popup chứa thông tin cá nhân, liên kết tài khoản thanh toán và nút Đăng xuất (xóa sạch Auth & Subscription Store).

#### 💡 Ví dụ sử dụng:
```tsx
import Topbar from '@/components/shared/Topbar'

// Nhúng cố định vào Root Layout của ứng dụng
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Topbar />
      <div className="pt-16">{children}</div>
    </div>
  )
}
```

---

### 3. BottomNav ([`BottomNav.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/BottomNav.tsx))

#### 🎯 Vai trò & Đặc điểm
- Thanh điều hướng đáy màn hình (Bottom Navigation Bar) tối ưu trải nghiệm chạm trên điện thoại di động (chỉ hiển thị trên màn hình nhỏ `<md`).
- Tự động thay đổi 4 - 5 tab quan trọng nhất theo từng vai trò:
  - **Member**: Tổng quan ➔ Lịch tập ➔ **Nút Check-in QR lớn ở giữa (`variant: 'center'`)** ➔ Gói tập ➔ Hồ sơ.
  - **Trainer**: Tổng quan ➔ Học viên ➔ Lịch dạy ➔ Hồ sơ.
  - **Staff**: Tổng quan ➔ Hội viên ➔ Điểm danh ➔ Hồ sơ.
  - **Owner**: Tổng quan ➔ Nhân sự ➔ Doanh thu ➔ Hồ sơ.

#### 🎨 Hình dáng & Biến thể
- Thanh kính mờ `backdrop-blur-lg`, nút Check-in ở giữa được thiết kế lồi lên với vòng tròn xanh ngọc nổi bật giúp hội viên quét mã QR nhanh khi vừa bước vào quầy lễ tân gym.

```tsx
import BottomNav from '@/components/shared/BottomNav'

// Đặt tại chân layout chính (tự động ẩn trên desktop qua CSS media query)
<BottomNav />
```

---

### 4. Chuông & Bảng Thông Báo Thời Gian Thực ([`NotificationBell.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/NotificationBell.tsx))

#### 🎯 Vai trò & Đặc điểm
- Nút icon chuông thông báo thông minh kèm **Huy hiệu số lượng chưa đọc (`unreadCount`)**.
- **Cơ chế Polling ngầm (Background Polling)**: Tự động kiểm tra thông báo mới mỗi 20 giây (`POLL_INTERVAL_MS = 20_000`), tạm dừng khi người dùng chuyển tab trình duyệt (`document.visibilityState === 'hidden'`).
- **Realtime Toast Alert**: Tự động bật thông báo nổi thời gian thực khi có thông báo mới phát sinh.
- **Deep-linking thông minh**: Nhấp vào thông báo sẽ tự động đánh dấu đã đọc và chuyển hướng chính xác đến trang đối tượng nghiệp vụ tương ứng:
  - `training_session` ➔ Đến lịch tập tương ứng của Member / Trainer / Staff.
  - `subscription` / `payment` ➔ Đến trang quản lý gói tập hoặc lịch sử giao dịch.
  - `attendance_log` ➔ Đến nhật ký điểm danh.
  - `feedback` ➔ Đến trang phản hồi/khiếu nại.
- Hỗ trợ nút đánh dấu đọc tất cả (`markAllRead`) với icon `CheckCheck`.

#### 💡 Ví dụ sử dụng:
```tsx
import NotificationBell from '@/components/shared/NotificationBell'

<div className="flex items-center gap-2">
  <NotificationBell />
</div>
```

---

### 5. Bộ Thông Báo & Cảnh Báo ([`NotificationUI.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/NotificationUI.tsx))

Cung cấp 3 thành phần UI chuyên biệt cho thông điệp phản hồi:

1. **`NotificationToast`**: Khung thông báo dạng Toast trôi góc màn hình, hỗ trợ nút đóng `X`, nút hành động (`action`) và 4 tones màu (`success`, `error`, `warning`, `info`).
2. **`NotificationAlert`**: Banner cảnh báo nội tuyến nằm cố định trong form hoặc trang.
3. **`NotificationPanel`**: Khung popup chứa danh sách thông báo kèm Accessibility Region (`role="region"`).

#### 💡 Ví dụ sử dụng:
```tsx
import { NotificationToast, NotificationAlert } from '@/components/shared/NotificationUI'
import { AlertTriangle } from 'lucide-react'

// Toast thông báo
<NotificationToast
  tone="success"
  message="Thanh toán gói tập Gym VIP 6 tháng thành công!"
  onClose={() => setShowToast(false)}
/>

// Alert cảnh báo trong trang
<NotificationAlert
  tone="warning"
  title="Gói tập sắp hết hạn"
  message="Gói tập của bạn sẽ hết hạn trong 3 ngày tới. Vui lòng gia hạn để tiếp tục rèn luyện."
  action={<Button size="sm" variant="primary">Gia hạn ngay</Button>}
/>
```

---

### 6. Bảo Vệ Tuyến Đường ([`ProtectedRoute.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/ProtectedRoute.tsx))

#### 🎯 Vai trò & Đặc điểm
- Là component bọc (Route Wrapper) đóng vai trò lá chắn phân quyền cao nhất của toàn bộ hệ thống định tuyến Client-side.
- **Xử lý bất đồng bộ Hydration**: Kiểm tra cờ `hasHydrated` từ Zustand Store trước khi đưa ra quyết định chuyển hướng, khắc phục hoàn toàn lỗi bị chuyển hướng sai về trang Login khi người dùng F5 / reload lại trang.
- **Tương thích LINE In-App Browser (LIFF)**: Tự động phát hiện trình duyệt trong ứng dụng LINE để điều hướng người dùng qua cơ chế xác thực LINE LIFF thuận tiện.
- **Kiểm tra vai trò (`allowedRoles`)**: Chuyển hướng về `/login` nếu chưa đăng nhập, hoặc chuyển về `/` nếu tài khoản không đủ thẩm quyền truy cập.

#### ⚙️ Bảng Props (`ProtectedRouteProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `allowedRoles` | `Role[]` | Bắt buộc | Mảng các vai trò được phép truy cập (`['admin', 'trainer', 'staff', 'owner', 'member']`) |
| `children` | `ReactNode` | Bắt buộc | Các component / màn hình được bảo vệ bên trong |

#### 💡 Ví dụ sử dụng trong `AppRoutes`:
```tsx
import ProtectedRoute from '@/components/shared/ProtectedRoute'

<Route
  path="/trainer/*"
  element={
    <ProtectedRoute allowedRoles={['trainer']}>
      <TrainerLayout />
    </ProtectedRoute>
  }
/>
```

---

### 7. Yêu Cầu Gói Tập ([`SubscriptionRequired.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/SubscriptionRequired.tsx))

#### 🎯 Vai trò & Đặc điểm
- Route Guard chuyên biệt dành riêng cho phân hệ **Hội viên (Member)**.
- Đảm bảo hội viên chỉ có thể truy cập vào các tính năng tập luyện (Xem bài tập, Đặt lịch PT, Quét mã QR check-in) khi **đang sở hữu ít nhất một gói tập còn hiệu lực** (`hasActiveSub === true`).
- Nếu hội viên chưa có gói hoặc gói đã hết hạn: Tự động chuyển hướng sang trang mua gói [`/member/subscription/setup`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/pages/member/subscription/SubscriptionSetupPage.tsx).
- Xử lý các tình huống lỗi mạng/mất kết nối server với thông báo [`PageErrorState`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/PageUI.tsx) kèm nút "Thử lại" hoặc "Đăng xuất".

#### 💡 Ví dụ sử dụng:
```tsx
import SubscriptionRequired from '@/components/shared/SubscriptionRequired'

// Trong React Router:
<Route element={<SubscriptionRequired />}>
  <Route path="workout/plan" element={<WorkoutPlanPage />} />
  <Route path="workout/sessions" element={<WorkoutSessionsPage />} />
  <Route path="check-in" element={<CheckInPage />} />
</Route>
```

---

### 8. Bộ Vòng Xoay Tải Trang (Spinner Suite - [`Spinner.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/Spinner.tsx))

Cung cấp 3 cấp độ Loader đồng bộ với Design System:

1. **`Spinner`**: Vòng xoay đơn lẻ, nhận thuộc tính kích thước pixel (`size`, mặc định 24px).
2. **`PageLoader`**: Vòng xoay 36px màu xanh lục, căn giữa khối với chiều cao tối thiểu `minHeight="60vh"`. Dùng làm fallback cho `React.Suspense` bên trong các trang lazy-load.
3. **`FullScreenLoader`**: Vòng xoay 44px phủ kín 100% màn hình nền đen `#080e0b`. Dùng làm fallback khi khởi động ứng dụng hoặc xác thực phiên đăng nhập ban đầu.

#### 💡 Ví dụ sử dụng:
```tsx
import { Spinner, PageLoader, FullScreenLoader } from '@/components/shared/Spinner'
import { Suspense, lazy } from 'react'

const ExercisesPage = lazy(() => import('./ExercisesPage'))

// 1. Fallback trong Suspense
<Suspense fallback={<PageLoader minHeight="70vh" />}>
  <ExercisesPage />
</Suspense>

// 2. Icon loading nhỏ
<Spinner size={16} className="text-emerald-400" />
```

---

### 9. Bộ Lọc Khoảng Ngày Cho Chủ Phòng Tập ([`OwnerDateRangeFilter.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/OwnerDateRangeFilter.tsx))

#### 🎯 Vai trò & Đặc điểm
- Component lọc khoảng thời gian (Từ ngày `from` ➔ Đến ngày `to`) thiết kế riêng cho các báo cáo doanh thu, thống kê hiệu suất nhân viên và hóa đơn giao dịch của Chủ phòng tập (Owner).
- Tự động giới hạn ngày `to` không được nhỏ hơn ngày `from`, mặc định chặn chọn ngày trong tương lai (`maxTo`).
- Nút "Tải dữ liệu" tích hợp sẵn trạng thái loading xoay tròn.

#### ⚙️ Bảng Props (`OwnerDateRangeFilterProps`)

| Prop | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `from` | `string` | Bắt buộc | Ngày bắt đầu (`yyyy-MM-dd`) |
| `to` | `string` | Bắt buộc | Ngày kết thúc (`yyyy-MM-dd`) |
| `onFromChange` | `(val: string) => void` | Bắt buộc | Callback khi đổi ngày bắt đầu |
| `onToChange` | `(val: string) => void` | Bắt buộc | Callback khi đổi ngày kết thúc |
| `onLoad` | `() => void` | Bắt buộc | Callback khi nhấn nút Lọc/Tải dữ liệu |
| `loading` | `boolean` | `false` | Trạng thái đang tải dữ liệu |
| `maxTo` | `string` | Ngày hiện tại | Giới hạn ngày tối đa được phép chọn |

#### 💡 Ví dụ sử dụng:
```tsx
import { OwnerDateRangeFilter } from '@/components/shared/OwnerDateRangeFilter'

<OwnerDateRangeFilter
  from={dateRange.from}
  to={dateRange.to}
  onFromChange={(from) => setDateRange((prev) => ({ ...prev, from }))}
  onToChange={(to) => setDateRange((prev) => ({ ...prev, to }))}
  onLoad={fetchRevenueReports}
  loading={isFetching}
/>
```

---

### 10. Phân Trang Cho Chủ Phòng Tập ([`OwnerPagination.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/OwnerPagination.tsx))

#### 🎯 Vai trò & Đặc điểm
- Là wrapper tái sử dụng component [`Pagination`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Pagination.tsx) gốc, giúp chuẩn hóa giao diện phân trang trong toàn bộ các bảng quản lý của Owner (Danh sách nhân viên, Hóa đơn, Báo cáo tài chính).

---

## IV. Bảng Tra Cứu Toàn Bộ Mã Nguồn & Exports

### 1. Thư Mục UI Core (`client/src/components/ui`)

| Nhóm Chức Năng | Thành Phần Export | File Nguồn |
| :--- | :--- | :--- |
| **Buttons & Links** | `Button`, `ButtonLink`, `ButtonAnchor`, `ButtonContent`, `getButtonClasses`, `normalizeButtonSize` | [`Button.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Button.tsx) |
| **Form Controls** | `Input`, `getInputClasses`, `normalizeInputSize` | [`Input.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Input.tsx) |
| | `Textarea`, `getTextareaClasses` | [`Textarea.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Textarea.tsx) |
| | `FormField` | [`FormField.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/FormField.tsx) |
| | `Checkbox`, `getCheckboxClasses` | [`Checkbox.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Checkbox.tsx) |
| | `Switch`, `getSwitchClasses` | [`Switch.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Switch.tsx) |
| | `Select` | [`Select.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Select.tsx) |
| **Date & Time** | `DatePickerInput` | [`DatePickerInput.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/DatePickerInput.tsx) |
| | `DateTimePickerInput` | [`DateTimePickerInput.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/DateTimePickerInput.tsx) |
| **Search & Filtering** | `SearchInput` | [`SearchInput.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/SearchInput.tsx) |
| | `FilterDropdown` | [`FilterDropdown.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/FilterDropdown.tsx) |
| | `SearchToolbar` | [`SearchToolbar.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/SearchToolbar.tsx) |
| **Containers & Cards** | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | [`Card.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Card.tsx) |
| | `StatCard` | [`StatCard.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/StatCard.tsx) |
| **Data Tables & Pagination** | `Table`, `TableContainer`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell` | [`Table.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Table.tsx) |
| | `ResponsiveTable` | [`ResponsiveTable.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/ResponsiveTable.tsx) |
| | `Pagination` | [`Pagination.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Pagination.tsx) |
| **Badges & Feedback** | `Badge`, `getBadgeClasses`, `normalizeBadgeSize` | [`Badge.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Badge.tsx) |
| | `StatusBadge` | [`StatusBadge.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/StatusBadge.tsx) |
| | `Modal` | [`Modal.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/Modal.tsx) |
| | `ConfirmDialog` | [`ConfirmDialog.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/ConfirmDialog.tsx) |
| **Page Layout & Utils** | `Page`, `PageHeader`, `PageSkeleton`, `PageEmptyState`, `PageErrorState` | [`PageUI.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/PageUI.tsx) |
| | `LanguageSwitcher` | [`LanguageSwitcher.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/ui/LanguageSwitcher.tsx) |

---

### 2. Thư Mục Shared Components (`client/src/components/shared`)

| Nhóm Chức Năng | Thành Phần Export | File Nguồn |
| :--- | :--- | :--- |
| **Bố Cục & Điều Hướng** | `Sidebar` (Menu chính phân quyền, Hover Expand, Owner switch mode) | [`Sidebar.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/Sidebar.tsx) |
| | `Topbar` (Thanh tiện ích Avatar, CTA gói tập, Đa ngôn ngữ, Thông báo) | [`Topbar.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/Topbar.tsx) |
| | `BottomNav` (Thanh điều hướng đáy Mobile, Nút Check-in QR trung tâm) | [`BottomNav.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/BottomNav.tsx) |
| **Hệ Thống Thông Báo** | `NotificationBell` (Chuông thông báo, Polling 20s, Realtime Toast) | [`NotificationBell.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/NotificationBell.tsx) |
| | `NotificationToast`, `NotificationAlert`, `NotificationPanel` | [`NotificationUI.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/NotificationUI.tsx) |
| **Bảo Mật Tuyến Đường** | `ProtectedRoute` (Phân quyền theo vai trò, chống F5 redirect sai, LINE LIFF) | [`ProtectedRoute.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/ProtectedRoute.tsx) |
| | `SubscriptionRequired` (Bảo vệ tính năng tập luyện, yêu cầu gói tập hiệu lực) | [`SubscriptionRequired.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/SubscriptionRequired.tsx) |
| **Hiệu Ứng Tải Trang** | `Spinner`, `PageLoader`, `FullScreenLoader` | [`Spinner.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/Spinner.tsx) |
| **Bộ Lọc & Báo Cáo** | `OwnerDateRangeFilter` (Lọc khoảng ngày báo cáo doanh thu & hiệu suất) | [`OwnerDateRangeFilter.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/OwnerDateRangeFilter.tsx) |
| | `OwnerPagination` (Wrapper phân trang cho Owner modules) | [`OwnerPagination.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/OwnerPagination.tsx) |
| | `Page`, `PageHeader`, `PageSkeleton`, `PageEmptyState`, `PageErrorState` | [`PageUI.tsx`](file:///c:/Users/An/Documents/IT4549-ITSS/gym-management-system/client/src/components/shared/PageUI.tsx) |
