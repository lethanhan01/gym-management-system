# RoGym Design System & Component Reference

Tài liệu hướng dẫn toàn diện về kiến trúc Design Tokens, quy chuẩn lập trình và danh mục đầy đủ các component thuộc `@/components/ui`.

---

## 1. Kiến trúc Single Source of Truth

Hệ thống UI tuân thủ phân lớp nghiêm ngặt:

1. **`tokens.css`** là **Single Source of Truth**:
   - Định nghĩa toàn bộ color palette, backgrounds, text colors, borders, shadows, typography và motion variables dưới dạng CSS custom properties (`--rogym-*`).
2. **`tailwind.config.js`** là **Alias Layer**:
   - Ánh xạ các `--rogym-*` solid color tokens sang namespace `colors.rogym.*` cho Tailwind CSS utilities.
   - Cung cấp font family aliases (`body`, `display`, `vietnam`, `anton`).
3. **`token-values.ts`** là **JS Consumer Layer**:
   - Cung cấp giá trị hex tương ứng cho các thư viện render JS/Canvas (như Recharts) mà không thể consume CSS variables trực tiếp.
4. **UI Components (`src/components/ui/*`)**:
   - **Tất cả các trang và vai trò (Member, Trainer, Staff, Owner) đều sử dụng chung Single Source of Truth từ `@/components/ui`**.
   - Các file `TrainerUI.tsx`, `OwnerUI.tsx`, `StaffUI.tsx`, `MemberUI.tsx` đóng vai trò Facade Re-export để đảm bảo tính tương thích ngược 100%.

---

## 2. Danh mục Toàn diện UI Components (`@/components/ui`)

### 2.1. Buttons & Actions
| Component | Mô tả & Props chính |
| :--- | :--- |
| **`Button`** | Nút bấm chuẩn với các biến thể: `primary`, `secondary`, `danger`, `outline-white`, `outline-green`, `dark`, `text-accent`, `text-muted`, `icon`. Kích thước: `xs`, `sm`, `default` (md), `lg`, `xl`, `compact`, `hero`. Hỗ trợ `loading`, `leftIcon`, `rightIcon`, `fullWidth`. |
| **`ButtonLink`** | Nút liên kết nội bộ `react-router-dom` với giao diện đồng bộ `Button`. |
| **`ButtonAnchor`** | Nút liên kết thẻ `<a>` ngoài. |
| **`SubmitButton`** | Nút submit form tiêu chuẩn với `type="submit"`, `loading`, `disabled`, `form`. |
| **`BackButton`** | Nút quay lại trang trước (`navigate(-1)` hoặc `to` cụ thể), hỗ trợ text hoặc `iconOnly`. |

### 2.2. Form Controls & Inputs
| Component | Mô tả & Props chính |
| :--- | :--- |
| **`FormField`** | Khung bọc input tự động liên kết `label`, `required`, `hint`, `error` và tiêm ngữ cảnh `FormFieldContext` (`id`, `aria-describedby`, `aria-invalid`) vào component con. |
| **`Input`** | Ô nhập văn bản hỗ trợ `leftIcon`, `rightIcon`, `showPasswordToggle`, `clearable`, `loading`, `error`. |
| **`Textarea`** | Ô nhập nhiều dòng tự động co giãn theo giao diện RoGym. |
| **`Select`** | Dropdown chọn đơn Radix Select với portal, chevron và item check indicator. |
| **`Combobox`** | Ô tìm kiếm và chọn tự động (Searchable Autocomplete), hỗ trợ async filtering, avatars, badges, và clear button. |
| **`RadioGroup` & `RadioCard`** | Nhóm radio chọn duy nhất. Hỗ trợ cả Radio Dot tròn cổ điển lẫn Radio Card (thẻ chọn có viền sáng, icon, title, description, badge). |
| **`Checkbox`** | Hộp kiểm chọn với trạng thái hover và checked màu brand teal. |
| **`Switch`** | Nút gạt bật/tắt (Toggle) với animation chuyển đổi mượt mà. |
| **`DatePickerInput`** | Ô chọn ngày tích hợp lịch Popover (react-day-picker) và tự parse chuỗi ngày tháng gõ tay. |
| **`DateTimePickerInput`** | Ô chọn ngày và giờ kết hợp. |
| **`TimeSlotPicker`** | Lưới chọn ca tập thông minh (hiển thị trạng thái Available, Busy, Past, Selected, badges nguyên nhân). |
| **`FileUpload`** | Vùng kéo thả tải tệp / ảnh lên, hỗ trợ xem trước (preview thumbnail), tiến trình tải lên và chế độ ảnh đại diện tròn (`variant="avatar"`). |
| **`Chip` & `TagInput`** | Thẻ tag tương tác chọn / xóa (`Chip`) và ô nhập đa thẻ (`TagInput`) với phím Enter / Backspace. |

### 2.3. Overlays, Dialogs & Menus (Radix UI Native)
| Component | Mô tả & Props chính |
| :--- | :--- |
| **`Modal`** | Hộp thoại thông báo / form dựa trên Radix Dialog. Hỗ trợ Focus Trap, Portal, Scroll Lock, phím ESC, các kích cỡ (`sm`, `md`, `lg`, `xl`, `2xl`, `full`), tiêu đề, description, headerActions, và footer. |
| **`ConfirmDialog`** | Hộp thoại xác nhận nhanh (Danger hoặc Primary), có icon cảnh báo và nút xác nhận / hủy. |
| **`DropdownMenu`** | Menu thả xuống dựa trên Radix DropdownMenu. Hỗ trợ `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`. |
| **`Tooltip`** | Gợi ý khi hover vào icon hoặc nút bấm với mũi tên chỉ hướng và độ trễ tùy chỉnh. |
| **`Popover`** | Cửa sổ popup nội dung tùy ý gắn với phần tử neo (Anchor). |
| **`Sheet`** | Ngăn kéo trượt (Drawer / Slide-over) từ 4 hướng (`right`, `bottom`, `left`, `top`), tối ưu cho trải nghiệm xem chi tiết trên Mobile & LIFF. |

### 2.4. Data Display & Structure
| Component | Mô tả & Props chính |
| :--- | :--- |
| **`Card`** | Thẻ chứa nội dung với các biến thể `default`, `glass`, `interactive`, `compact`, `elevated`, `ribbon`. Đi kèm `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. |
| **`StatCard`** | Thẻ thống kê số liệu kinh doanh / tiến độ với icon, giá trị chính và % tăng trưởng. |
| **`Table` & `ResponsiveTable`** | Bảng dữ liệu chuẩn hóa với `TableHeader`, `TableBody`, `TableRow`, `TableCell` hoặc bảng cấu hình động theo `ColumnDef`. |
| **`Pagination`** | Bộ phân trang với chuyển trang, số trang và responsive. |
| **`Badge` & `StatusBadge`** | Huy hiệu trạng thái với các tones: `accent`, `success`, `warning`, `danger`, `info`, `muted`. |
| **`Avatar` & `AvatarGroup`** | Ảnh đại diện cá nhân kèm trạng thái `online`, `busy`, `offline` và nhóm avatar xếp lớp (`AvatarGroup`). |
| **`EmptyState`** | Giao diện hiển thị trạng thái rỗng với 3 kích thước: `sm` (trong dropdown/cell), `md` (trong Card/Table), `lg` (toàn trang), có icon, title, description, nút hành động. |
| **`Separator`** | Đường kẻ phân cách ngang/dọc, hỗ trợ nhãn chữ ở giữa (`label`). |

### 2.5. Navigation & Layout
| Component | Mô tả & Props chính |
| :--- | :--- |
| **`Page`** | Bộ khung trang chuẩn (`Page`, `PageHeader`, `PageSkeleton`, `PageEmptyState`, `PageErrorState`). |
| **`Breadcrumb`** | Đường dẫn phân cấp điều hướng (`BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`). |
| **`Tabs`** | Chuyển đổi tab nội dung dựa trên Radix Tabs (hỗ trợ `default`, `pills`, `underline`). |
| **`SegmentedControl`** | Nút gạt chuyển đổi trạng thái dạng viên thuốc (Pill toggle) cho chế độ xem Grid/List, chọn chu kỳ. |
| **`Accordion`** | Danh sách mở rộng/thu gọn (collapsible FAQ / chi tiết). |
| **`Stepper`** | Thanh tiến trình các bước quy trình (ngang hoặc dọc). |
| **`FilterBar` & `FilterDropdown`** | Thanh công cụ tìm kiếm và lọc dữ liệu tích hợp Filter Chips. |

### 2.6. Feedback & Toasts
| Component | Mô tả & Props chính |
| :--- | :--- |
| **`Alert`** | Khung thông báo với tones `success`, `warning`, `error`, `info`, `neutral` và các variants `default`, `subtle`, `outline`. |
| **`ProgressBar`** | Thanh tiến độ với nhãn % và màu sắc theo tone. |
| **`Skeleton`** | Khối placeholder loading (`Skeleton`, `SkeletonText`, `SkeletonCircle`). |
| **`toast`** | Hàm gọi Toast Sonner chuẩn hóa với màu token RoGym: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`. |

---

## 3. Quy tắc Override với `--rogym-tone` Hook

Các component như `Alert`, `Accordion`, `Tabs`, `Stepper`, `ProgressBar`, `Avatar`, `Chip`, `Badge` hỗ trợ CSS variable hook `--rogym-tone` để component cha hoặc trang có thể ghi đè màu chủ đạo cục bộ mà không cần can thiệp logic nội bộ:

### Cú pháp nội bộ trong UI component
```tsx
// Fallback luôn trỏ về token --rogym-green (không có khoảng trắng trong Tailwind arbitrary value)
className="text-[var(--rogym-tone,var(--rogym-green))] focus-visible:ring-[var(--rogym-tone,var(--rogym-green))]"
```

### Cách consumer override
```tsx
// Ghi đè màu sang Amber cho một Alert cụ thể
<Alert
  tone="success"
  style={{ '--rogym-tone': '#f59e0b' } as React.CSSProperties}
  title="Cảnh báo quan trọng"
>
  Nội dung thông báo
</Alert>
```

---

## 4. Trang Trải nghiệm UI Showcase Nội bộ

Hệ thống cung cấp trang Dev Showcase tại route:
👉 **`http://localhost:5173/dev/ui-showcase`**

Dành riêng cho developers để xem trực tiếp, tương tác thử nghiệm tất cả các component, variants, sizes, tone hook, và responsive layout.
