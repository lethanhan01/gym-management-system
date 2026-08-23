# Phase 3: Bổ sung Data Display, Navigation & Feedback

> **Phase**: 3 / 6  
> **Trọng tâm**: Chuẩn hóa hiển thị dữ liệu (Data Display), các thành phần điều hướng phân cấp (Navigation) và phản hồi hệ thống (Feedback) đồng bộ với hệ thống Token RoGym và tương thích 100% với Baseline `01a2bebb6da0d7f15b0295557a731e2417023f37`.  
> **Commit Baseline**: `01a2bebb6da0d7f15b0295557a731e2417023f37`  
> **Trạng thái**: **ĐÃ HOÀN THÀNH RÀ SOÁT & KHẮC PHỤC CHỐNG HỒI QUY** (Sẵn sàng nghiệm thu)

---

## 1. Mục tiêu & Phạm vi Phase 3

1. **`EmptyState` [NEW/EXPANDED]**: Component hiển thị trạng thái rỗng đa kích thước (`sm` trong ô/dropdown, `md` trong Card/Table, `lg` toàn trang), có icon, title, description, action button.
2. **`Separator` / `Divider` [NEW]**: Phân cách ngang/dọc với tùy chọn viền nét đứt (dashed), độ mờ token, và hỗ trợ label text ở giữa (`label="HOẶC"`).
3. **`SegmentedControl` / `ToggleGroup` [NEW]**: Nút chuyển đổi trạng thái dạng viên thuốc trượt (Radix ToggleGroup).
4. **`Breadcrumb` & `BackButton` [NEW]**: Điều hướng phân cấp nhiều cấp và nút quay lại trang trước đồng bộ.
5. **`FilterBar` [NEW]**: Thanh công cụ lọc dữ liệu chuẩn hóa gồm Search Input + Filter Dropdown + Active Filter Chips (có nút xóa từng filter và xóa tất cả).
6. **`Toast` (Cấu hình nâng cao)**: Đồng bộ Sonner Toaster với token CSS RoGym và `NotificationToast`.

---

## 2. Kết quả Rà soát & Khắc phục Lỗ hổng (Anti-Regression Audit Report)

| Thành phần | Lỗ hổng phát hiện khi đối chiếu Baseline `01a2beb` | Phương án đã khắc phục & Chuẩn hóa | Trạng thái |
| :--- | :--- | :--- | :--- |
| **`EmptyState.tsx`** | Trùng lặp với `PageEmptyState` trong `PageUI.tsx` | Giữ nguyên `PageEmptyState` cũ làm wrapper, `EmptyState` mới phục vụ nhúng linh hoạt vào Card/Table | **Đã bảo toàn** |
| **`Breadcrumb.tsx`** | Nguy cơ gãy routing khi truyền đường dẫn SPA | Hỗ trợ cả prop `to` (React Router Link) và prop `href` (anchor ngoài) | **Đã bảo toàn** |
| **`BackButton.tsx`** | Không có fallback khi không có lịch sử duyệt | Hỗ trợ `onClick ?? (() => navigate(-1))` và prop `to` tường minh | **Đã bảo toàn** |
| **`toast.tsx`** | Toast của Sonner có thể che khuất modal/topbar | Tích hợp lớp container z-index cao và `NotificationToast` đồng bộ token | **Đã bảo toàn** |

---

## 3. Checklist Triển khai Chi tiết

### 3.1. `EmptyState.tsx` & `EmptyState.test.tsx`
- [x] Hỗ trợ 3 kích thước `sm`, `md`, `lg`, icon, action button.
- [x] Test suite `EmptyState.test.tsx` (2 tests pass 100%).

### 3.2. `Separator.tsx`
- [x] Hỗ trợ `orientation` horizontal / vertical, `label` phân cách ở giữa.

### 3.3. `SegmentedControl.tsx` & `SegmentedControl.test.tsx`
- [x] Tích hợp `@radix-ui/react-toggle-group`, hỗ trợ icon, label, badge count.
- [x] Test suite `SegmentedControl.test.tsx` (2 tests pass 100%).

### 3.4. `Breadcrumb.tsx` & `BackButton.tsx`
- [x] `Breadcrumb.tsx` phân cấp và `BackButton.tsx` điều hướng an toàn.

### 3.5. `FilterBar.tsx`
- [x] Kết hợp SearchInput + FilterDropdown + Active Chips + Reset.

### 3.6. `toast.tsx` & `toast.test.tsx`
- [x] Tích hợp Sonner toast với 4 tones (success, error, warning, info), custom actions và dismiss button.
- [x] Test suite `toast.test.tsx` (1 test pass 100%).

---

## 4. Phase Quality Gate & Tiêu chí Nghiệm thu

- [x] **Automated Tests**: 61/61 test files pass, 299/299 tests pass 100%.
- [x] **Linter & Type Check**: `npm run lint` 0 error, `npm run build` thành công sạch sẽ.
- [x] **Interactive Showcase**: Trưng bày tại `http://localhost:5173/dev/ui-showcase#data-display`.
- [x] **User Sign-off**: Đã nhận phê duyệt chính thức từ người dùng.

