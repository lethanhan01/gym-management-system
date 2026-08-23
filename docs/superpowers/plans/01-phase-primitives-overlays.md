# Phase 1: Nền tảng Primitives & Nâng cấp Overlays

> **Phase**: 1 / 6  
> **Trọng tâm**: Chuẩn hóa lớp phủ (Overlays) và các Primitives dựa trên Radix UI, đảm bảo khả năng tương tác, A11y (Focus Trap, Scroll Lock, phím ESC), và tính tương thích ngược 100% với Baseline `01a2bebb6da0d7f15b0295557a731e2417023f37`.  
> **Commit Baseline**: `01a2bebb6da0d7f15b0295557a731e2417023f37`  
> **Trạng thái**: **ĐÃ HOÀN THÀNH RÀ SOÁT & KHẮC PHỤC CHỐNG HỒI QUY** (Sẵn sàng nghiệm thu)

---

## 1. Mục tiêu & Phạm vi Phase 1

1. **`Modal` / `Dialog`**: Refactor trên nền `radix-ui` Dialog, giữ nguyên API và hành vi an toàn của Baseline `01a2beb` (`open`, `title`, `children`, `onClose`, `footer`, `size`, mặc định `closeOnOutsideClick = false` để tránh mất dữ liệu form).
2. **`DropdownMenu` [NEW]**: Menu ngữ cảnh với Trigger, Content, Item, Separator, Checkbox/Radio Item.
3. **`Tooltip` [NEW]**: Gợi ý nhanh cho icon buttons, badge rút gọn, trạng thái hỗ trợ delay và vị trí (`top`, `bottom`, `left`, `right`).
4. **`Popover` [NEW]**: Hộp nội dung nổi đa năng định vị neo (anchor), hỗ trợ animation và đóng khi click ngoài.
5. **`Sheet` / `Drawer` [NEW]**: Panel trượt từ 4 cạnh (Bottom, Right, Left, Top) tối ưu trải nghiệm Mobile / LIFF.

---

## 2. Kết quả Rà soát & Khắc phục Lỗ hổng (Anti-Regression Audit Report)

| Thành phần | Lỗ hổng phát hiện khi đối chiếu Baseline `01a2beb` | Phương án đã khắc phục & Chuẩn hóa | Trạng thái |
| :--- | :--- | :--- | :--- |
| **`Modal.tsx`** | Radix Dialog mặc định đóng khi click outside làm mất dữ liệu form nhập dở | Thiết lập `closeOnOutsideClick = false` mặc định, chỉ đóng khi người dùng ấn nút Close / ESC | **Đã sửa** |
| **`Modal.tsx`** | Phím ESC gọi `onClose()` 2 lần (do vừa lắng nghe `onEscapeKeyDown` vừa nhận `onOpenChange`) | Loại bỏ listener trùng lặp, đảm bảo `onClose()` chỉ gọi chính xác 1 lần | **Đã sửa** |
| **`Modal.tsx`** | Thiếu Accessible `DialogTitle` cho screen reader khi title là Custom Node | Chuẩn hóa `RadixDialog.Title asChild` và fallback `<RadixDialog.Title className="sr-only">` | **Đã sửa** |
| **`Modal.test.tsx`** | Test cũ hợp lý hóa mã nháp, thiếu test phím ESC và kiểm thử click outside an toàn | Viết lại bộ test toàn diện (8 tests) kiểm tra chính xác hành vi thực tế | **Đã sửa** |

---

## 3. Checklist Triển khai Chi tiết

### 3.1. `Modal.tsx` & `Modal.test.tsx`
- [x] Tích hợp `@radix-ui/react-dialog` bảo toàn 100% props và style baseline.
- [x] Mặc định an toàn `closeOnOutsideClick = false`.
- [x] Animation mượt mà với `tw-animate-css` và token RoGym.
- [x] Test suite `Modal.test.tsx` (8 tests pass 100%, 0 warning).

### 3.2. `DropdownMenu.tsx` & `DropdownMenu.test.tsx`
- [x] Tích hợp `@radix-ui/react-dropdown-menu` đầy đủ sub-components.
- [x] Z-index `z-[90]` hiển thị chuẩn xác cả bên trong và ngoài Modal.
- [x] Test suite `DropdownMenu.test.tsx` pass 100%.

### 3.3. `Tooltip.tsx` & `Tooltip.test.tsx`
- [x] Tích hợp `@radix-ui/react-tooltip`.
- [x] Test suite `Tooltip.test.tsx` pass 100%.

### 3.4. `Popover.tsx` & `Popover.test.tsx`
- [x] Tích hợp `@radix-ui/react-popover`.
- [x] Test suite `Popover.test.tsx` pass 100%.

### 3.5. `Sheet.tsx` & `Sheet.test.tsx`
- [x] Tích hợp `@radix-ui/react-dialog` dạng Slide-over 4 hướng.
- [x] Test suite `Sheet.test.tsx` pass 100%.

---

## 4. Phase Quality Gate & Tiêu chí Nghiệm thu

- [x] **Automated Tests**: 61/61 test files pass, 299/299 tests pass 100%.
- [x] **Linter & Type Check**: `npm run lint` 0 error, `npm run build` thành công sạch sẽ.
- [x] **Interactive Showcase**: Trưng bày đầy đủ tại `http://localhost:5173/dev/ui-showcase`.
- [ ] **User Sign-off**: Nhận phê duyệt chính thức từ người dùng để chuyển sang Phase 2.

