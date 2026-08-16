# RoGym Frontend Component Architecture & Design Conventions

Tài liệu này là **quy chuẩn thiết kế và kiến trúc component chính thức** của hệ sinh thái Frontend RoGym.
Mọi component (bao gồm UI primitives trong `@/components/ui/`, shared components và domain components) **bắt buộc** phải tuân thủ nghiêm ngặt bộ tiêu chuẩn này.

> **Mô hình Chuẩn mực Tham chiếu (Gold Standard Reference)**:
> Component [`Button.tsx`](./src/components/ui/Button.tsx) và stylesheet [`buttons.css`](./src/styles/components/buttons.css) là khuôn mẫu hoàn chỉnh thể hiện đầy đủ 6 trụ cột tiêu chuẩn dưới đây.

---

## 1. 6 Trụ cột Tiêu chuẩn Bắt buộc (The 6 Mandatory Pillars)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ROGYM COMPONENT STANDARDS                          │
├───────────────────┬────────────────────┬────────────────────────────────┤
│ 1. Architecture   │ 2. Mobile-First    │ 3. Touch & Motion Engine       │
│ & TypeScript      │ & Responsive       │ (Anti-Sticky Hover, :active)   │
├───────────────────┼────────────────────┼────────────────────────────────┤
│ 4. Zero-CLS       │ 5. Accessibility   │ 6. RoGym Design Tokens         │
│ Loading Contract  │ & Keyboard (A11y)  │ (100% Token Compliance)        │
└───────────────────┴────────────────────┴────────────────────────────────┘
```

---

### Pillar 1: Kiến trúc TypeScript & API Pattern

Mọi component phải tuân thủ cấu trúc file tiêu chuẩn sau:

1. **Explicit TypeScript Interfaces**:
   - `export type <Component>Variant = ...`
   - `export type <Component>Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | ...`
   - `export interface Base<Component>Props { ... }`: Chứa toàn bộ prop đặc thù của RoGym (`variant`, `size`, `loading`, `leftIcon`, `rightIcon`, `fullWidth`, `mobileFull`, `truncate`...).
   - `export interface <Component>Props extends HTMLAttributes<...>, Base<Component>Props { ... }`: Kế thừa đầy đủ thuộc tính HTML native.
2. **Tách biệt Logic Tính Class (`get<Component>Classes`)**:
   - Class name generation phải nằm trong một pure helper function `get<Component>Classes(...)` dùng hàm `cn()` từ `@/lib/utils`.
   - Cho phép các component khác tái sử dụng logic class mà không cần mount DOM element.
3. **Chuẩn hóa Kích thước (`normalize<Component>Size`)**:
   - Nếu component hỗ trợ các alias cũ (ví dụ: `compact`, `hero`, `default`), bắt buộc có helper `normalize<Component>Size()` để ánh xạ về tập size chuẩn (`xs` | `sm` | `md` | `lg` | `xl`).
4. **Content & Slot Helper tách biệt (`<Component>Content`)**:
   - Nếu component có xử lý icon slots, loading spinner hoặc responsive text wrapping, hãy tách thành sub-component render riêng (`<Component>Content`) để dùng chung cho các wrapper variants (`Button`, `ButtonLink`, `ButtonAnchor`, v.v.).
5. **forwardRef & displayName Bắt buộc**:
   - Mọi interactive hoặc renderable component đều phải bọc qua `forwardRef` để hỗ trợ refs (form focus, focus trapping, measurement).
   - Bắt buộc có `<Component>.displayName = '<Component>'`.
6. **Export đầy đủ từ `src/components/ui/index.ts`**:
   - Export cả Component, Sub-components, Props types, Variant types, Size types và Class helper function.

---

### Pillar 2: Responsive & Mobile-First Contract

1. **Chuẩn kích thước Chạm (WCAG Touch Target)**:
   - Mọi phần tử tương tác độc lập (Button, Input, Select trigger, Checkbox hit area, Switch, Pagination item, Dropdown trigger) **bắt buộc** đạt chiều cao tối thiểu **44px** trên màn hình cảm ứng mobile (hoặc tối thiểu 38px có tap-area mở rộng).
2. **Chống méo nút / Control trong Flexbox Layout (`flex-shrink: 0`)**:
   - Mọi nút bấm, icon button, badge, input append/prepend items phải có `flex-shrink: 0` để khi container bị co hẹp trên mobile, control không bị bẹp dúm hoặc méo tỷ lệ.
3. **Responsive Padding & Spacing**:
   - Áp dụng nguyên tắc Mobile-First: padding nhỏ hơn ở màn hình mobile (<640px) và tự động mở rộng ở tablet/desktop (>=640px).
   - Ví dụ: `padding: 0.625rem 1.125rem` trên mobile $\rightarrow$ `padding: 0.75rem 1.5rem` trên desktop (`sm:`).
4. **Line-height & Text Wrapping An toàn**:
   - Không đặt `line-height: 1` cho các phần tử chứa văn bản tiếng Việt có khả năng xuống dòng trên mobile. Bắt buộc dùng `line-height: 1.25` đến `1.5` để khi text rớt 2 dòng không bị dính chữ.
5. **Responsive Helper Props tiêu chuẩn**:
   - `fullWidth?: boolean`: Mở rộng 100% chiều ngang trên mọi kích thước.
   - `mobileFull?: boolean`: Mở rộng 100% chiều ngang trên mobile (<640px) và tự co về `auto` trên desktop (>=640px).
   - `truncate?: boolean`: Cho phép cắt ngắn text dài kèm dấu ba chấm (`...`) khi bị tràn khung chứa.
   - `responsiveIconOnly?: boolean`: Tự động ẩn nhãn chữ trên mobile và chỉ giữ lại icon để tiết kiệm diện tích.

---

### Pillar 3: Touch & Motion Engine (Anti-Sticky Hover & Tactile Feedback)

1. **Loại bỏ hiện tượng "Sticky Hover" trên Màn hình Cảm ứng**:
   - **Tuyệt đối không** kích hoạt hiệu ứng sweep animation hay màu hover vĩnh viễn trên thiết bị di động.
   - Bắt buộc bọc các quy tắc `:hover` trong media query:
     ```css
     @media (hover: hover) and (pointer: fine) {
       .rogym-btn:hover {
         /* Hiệu ứng hover cho chuột/trackpad */
       }
     }
     ```
2. **Phản hồi Chạm Xúc giác (:active Tap Feedback)**:
   - Trên thiết bị cảm ứng, người dùng cần nhận biết ngay khi ngón tay chạm vào control. Bắt buộc bổ sung trạng thái `:active:not(:disabled)`:
     ```css
     .rogym-btn:active {
       transform: scale(0.98);
     }
     ```
3. **Tắt độ trễ thao tác chạm (`touch-action: manipulation`)**:
   - Thêm `touch-action: manipulation;` để trình duyệt loại bỏ độ trễ 300ms (double-tap to zoom) khi người dùng thao tác trên điện thoại.
4. **Tôn trọng Reduced Motion**:
   - Mọi animation/transition phải tự động giảm thiểu hoặc tắt khi người dùng bật chế độ `prefers-reduced-motion: reduce`.

---

### Pillar 4: Trạng thái Loading & Khế ước Chống Giật Layout (Zero CLS)

1. **Zero Cumulative Layout Shift (CLS = 0)**:
   - Khi chuyển sang trạng thái `loading={true}`, kích thước tổng thể (width, height) của component **không được phép bị giật hoặc thay đổi đột ngột**.
   - Spinner loading phải tự động thay thế vị trí của `leftIcon` (nếu có) hoặc chèn vào vị trí xác định với kích thước tỷ lệ tương ứng theo size của component (`xs`: 12px, `sm`: 14px, `md`: 16px, `lg/xl`: 20px).
2. **Khóa Tương tác Tuyệt đối khi Loading / Disabled**:
   - Khi `loading={true}` hoặc `disabled={true}`, component phải bị vô hiệu hóa hoàn toàn:
     - Thêm `pointer-events-none` và `cursor-not-allowed`.
     - Thêm `opacity: 0.5`.
     - Với thẻ `<Link>` hoặc `<a>`: Gán `tabIndex={-1}`, `to="#"`, `href={undefined}` và chặn sự kiện click `e.preventDefault(); e.stopPropagation();`.

---

### Pillar 5: Trợ năng & Điều hướng Bàn phím (Accessibility - A11y)

1. **ARIA Attributes Đầy đủ**:
   - Khi `loading={true}`: Tự động gán `aria-busy="true"`.
   - Khi `disabled={true}`: Tự động gán `aria-disabled="true"`.
   - Khi component là icon-only (không có text hiển thị): **Bắt buộc** phải truyền `aria-label`.
   - Form inputs / dialogs: Liên kết `aria-describedby` với error message hoặc helper text.
2. **Focus Ring Rõ ràng (`focus-visible`)**:
   - Bắt buộc có đường viền focus ring nổi bật (`--rogym-teal` hoặc `--rogym-green`) khi người dùng điều hướng bằng phím Tab.
   - Không được xóa `outline` mà không có focus ring thay thế.
3. **Khả năng Điều hướng Bàn phím hoàn chỉnh**:
   - Hỗ trợ các phím chuẩn: `Tab` (chuyển focus), `Enter` / `Space` (kích hoạt), `Escape` (đóng popup/modal), `Arrow keys` (lựa chọn danh sách).

---

### Pillar 6: RoGym Design Tokens Compliance (100% Token Chuẩn)

1. **Tuyệt đối Không Dùng Style Trực tiếp**:
   - Cấm `style={{ ... }}`, thẻ `<style>`, hoặc thao tác `element.style`.
2. **Không Dùng Mã Màu Tùy ý trong Code**:
   - Cấm các class như `bg-[#06c384]`, `text-[rgba(...)]`.
   - Bắt buộc sử dụng CSS Variables `--rogym-*` hoặc class ngữ nghĩa đã được định nghĩa trong `src/styles/globals.css` và `src/styles/components/`.
3. **Quy tắc Đặt tên Class (BEM + is-*)**:
   - Block: `.rogym-{component}`
   - Element: `.rogym-{component}__{element}`
   - Modifier: `.rogym-{component}--{modifier}` (ví dụ: `.rogym-btn--primary`, `.rogym-card--compact`)
   - Dynamic State: `.rogym-{component}.is-{state}` (ví dụ: `.is-active`, `.is-open`, `.is-loading`)
   - Semantic Data: `[data-tone="*"]`, `[data-status="*"]`

---

## 2. Khuôn mẫu Cấu trúc Code Chuẩn (Component Reference Template)

Dưới đây là mẫu code chuẩn mực tuân thủ toàn bộ 6 trụ cột (tham chiếu từ `Button.tsx`):

```tsx
import { cn } from '@/lib/utils'
import {
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
} from 'react'

/* 1. Types & Variants */
export type ComponentVariant = 'default' | 'elevated' | 'outline' | 'glass'
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'default' | 'compact'

export interface BaseComponentProps {
  variant?: ComponentVariant
  size?: ComponentSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  mobileFull?: boolean
  truncate?: boolean
}

/* 2. Size Normalization */
export function normalizeComponentSize(size: ComponentSize = 'default'): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  switch (size) {
    case 'xs': return 'xs'
    case 'sm':
    case 'compact': return 'sm'
    case 'lg': return 'lg'
    case 'xl': return 'xl'
    case 'md':
    case 'default':
    default: return 'md'
  }
}

/* 3. Class Computation Helper */
export function getComponentClasses({
  variant = 'default',
  size = 'default',
  fullWidth,
  mobileFull,
  truncate,
  className,
}: BaseComponentProps & { className?: string }) {
  const normalizedSize = normalizeComponentSize(size)

  return cn(
    'rogym-component',
    variant === 'elevated' && 'rogym-component--elevated',
    variant === 'outline' && 'rogym-component--outline',
    variant === 'glass' && 'rogym-component--glass',
    normalizedSize === 'xs' && 'rogym-component--xs',
    normalizedSize === 'sm' && 'rogym-component--sm',
    normalizedSize === 'md' && 'rogym-component--md',
    normalizedSize === 'lg' && 'rogym-component--lg',
    normalizedSize === 'xl' && 'rogym-component--xl',
    fullWidth && 'rogym-component--full',
    mobileFull && 'rogym-component--mobile-full',
    truncate && 'rogym-component--truncate',
    className
  )
}

/* 4. Content Slot Renderer (Zero CLS) */
export function ComponentContent({
  size = 'default',
  leftIcon,
  rightIcon,
  loading,
  children,
}: BaseComponentProps & { children?: ReactNode }) {
  const normalizedSize = normalizeComponentSize(size)

  if (loading) {
    return (
      <>
        <span className={cn('animate-spin rounded-full border-current border-t-transparent shrink-0',
          normalizedSize === 'xs' ? 'h-3 w-3 border-[1.5px]' :
          normalizedSize === 'sm' ? 'h-3.5 w-3.5 border-2' :
          normalizedSize === 'lg' || normalizedSize === 'xl' ? 'h-5 w-5 border-2' : 'h-4 w-4 border-2'
        )} aria-hidden="true" />
        {children}
      </>
    )
  }

  return (
    <>
      {leftIcon && <span className="inline-flex shrink-0 items-center" aria-hidden="true">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="inline-flex shrink-0 items-center" aria-hidden="true">{rightIcon}</span>}
    </>
  )
}

/* 5. Main Component Export with forwardRef */
export interface ComponentProps extends HTMLAttributes<HTMLDivElement>, BaseComponentProps {}

export const MyComponent = forwardRef<HTMLDivElement, ComponentProps>(
  ({ variant = 'default', size = 'default', leftIcon, rightIcon, loading, fullWidth, mobileFull, truncate, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-busy={loading ? 'true' : undefined}
        className={getComponentClasses({ variant, size, fullWidth, mobileFull, truncate, className })}
        {...props}
      >
        <ComponentContent size={size} leftIcon={leftIcon} rightIcon={rightIcon} loading={loading}>
          {children}
        </ComponentContent>
      </div>
    )
  }
)
MyComponent.displayName = 'MyComponent'
```

---

## 3. Bảng Tiêu chí Đánh giá Chất lượng Component (Quality Rubric Checklist)

Mọi component mới hoặc được sửa đổi đều phải vượt qua 12 câu hỏi kiểm tra sau:

| # | Tiêu chí Kiểm tra | Trạng thái |
|---|---|:---:|
| 1 | Component có dùng `forwardRef` và khai báo `displayName` tường minh không? | [ ] |
| 2 | Component có tách riêng `get<Name>Classes()` và export từ `ui/index.ts` không? | [ ] |
| 3 | Mọi phần tử có thể bấm/chạm có đạt touch target tối thiểu **44px** trên mobile không? | [ ] |
| 4 | Các nút/control trong flex container có được gắn `flex-shrink: 0` chống méo không? | [ ] |
| 5 | Padding và khoảng cách có co giãn theo mobile-first (`px-3 sm:px-4`) không? | [ ] |
| 6 | Typography có `line-height >= 1.25` chống dính chữ khi rớt 2 dòng tiếng Việt không? | [ ] |
| 7 | Hiệu ứng hover có được bọc trong `@media (hover: hover) and (pointer: fine)` không? | [ ] |
| 8 | Thiết bị cảm ứng có phản hồi chạm `:active` (`scale(0.98)` / tap feedback) không? | [ ] |
| 9 | Trạng thái `loading` có đảm bảo **Zero Layout Shift (CLS = 0)** không làm giật kích thước không? | [ ] |
| 10 | Khi `disabled` hoặc `loading`, sự kiện click/touch có bị chặn triệt để (kể cả Link/Anchor) không? | [ ] |
| 11 | Component có đầy đủ `aria-busy`, `aria-disabled`, `aria-label`, `focus-visible` không? | [ ] |
| 12 | 100% màu sắc, radius, shadow và font sử dụng Token RoGym (không inline style, không hardcoded hex)? | [ ] |

---

## 4. Lộ trình Đồng bộ Hệ thống UI (4-Phase Synchronization Plan)

| Giai đoạn | Danh mục Component | Trọng tâm Chuẩn hóa |
|---|---|---|
| **Giai đoạn 1** | `Input`, `Textarea`, `Checkbox`, `Switch`, `FormField`, `SearchInput`, `Badge`, `StatusBadge`, `StatCard` | Touch target 44px, slot icon/clear, focus ring, zero CLS, mobile-first spacing. |
| **Giai đoạn 2** | `Select`, `FilterDropdown`, `DatePickerInput`, `DateTimePickerInput`, `LanguageSwitcher` | Popover viewport protection trên mobile, Radix touch item height, clean calendar picker. |
| **Giai đoạn 3** | `Card`, `Modal`, `ConfirmDialog`, `Table`, `ResponsiveTable`, `Pagination`, `PageUI` | Full screen/bottom sheet trên mobile, sticky header tables, responsive card view. |
| **Giai đoạn 4** | `PackagePicker`, `MemberUI`, `TrainerUI`, `StaffUI`, `OwnerUI`, Domain UI components | Đồng bộ role facades, package cards, and business workflow components. |

---

## 5. Quy chuẩn Bắt buộc về Thanh Tìm kiếm (Search Toolbar Mandate)

1. **Tuyệt đối cấm viết ad-hoc search input**:
   - Nghiêm cấm viết markup thủ công `<div className="relative..."><Search .../><input .../></div>` trên các màn hình dashboard/danh sách.
2. **Bắt buộc dùng `SearchToolbar`**:
   - Mọi thanh tìm kiếm có lọc hoặc action đều phải dùng `SearchToolbar` (hoặc Role UI Facade tương ứng như `MemberSearchToolbar`, `TrainerSearchToolbar`, `StaffSearchToolbar`, `OwnerSearchToolbar`).
   - Đảm bảo chuẩn chiều cao 44px (`size="md"`), debounce tự động 300ms, nút clear, responsive flex layout (`auto` hoặc `row`), và container card đồng nhất trên toàn hệ thống.
3. **`SearchInput` chỉ dùng cho trường hợp standalone**:
   - Chỉ sử dụng `SearchInput` độc lập khi nhúng trong các layout form đặc thù (ví dụ: quét mã check-in trực tiếp). Mọi danh sách lọc đều phải đi qua `SearchToolbar`.
