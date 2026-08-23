# Phase 2: Chuẩn hóa Form Controls & Bổ sung Advanced Inputs

> **Phase**: 2 / 6  
> **Trọng tâm**: Hoàn thiện toàn diện hệ thống Form Controls, tự động quản lý liên kết A11y (`FormFieldContext`), bổ sung các trường nhập nâng cao (`Combobox`, `RadioGroup`, `Chip`/`TagInput`, `TimeSlotPicker`, `FileUpload`, `SubmitButton`) tương thích 100% với Baseline `01a2bebb6da0d7f15b0295557a731e2417023f37`.  
> **Commit Baseline**: `01a2bebb6da0d7f15b0295557a731e2417023f37`  
> **Trạng thái**: **ĐÃ HOÀN THÀNH RÀ SOÁT & KHẮC PHỤC CHỐNG HỒI QUY** (Sẵn sàng nghiệm thu)

---

## 1. Mục tiêu & Phạm vi Phase 2

1. **`FormField` (Nâng cấp & Chuẩn hóa Context)**: Tách `form-field-context.ts` hỗ trợ tự động tiêm `id`, `htmlFor`, `aria-describedby`, `aria-invalid`, `disabled` cho các Input/Select/Combobox con mà không gây cảnh báo React Fast Refresh.
2. **`Combobox` / `Autocomplete` [NEW]**: Hỗ trợ tìm kiếm theo từ khóa, lọc danh sách lớn, async loading, custom render (Avatar, Badge, Subtitle).
3. **`RadioGroup` & `RadioCard` [NEW]**: Chuẩn hóa dựa trên `@radix-ui/react-radio-group`, hỗ trợ 2 giao diện: Standard Dot và Interactive Radio Card (có viền active, icon, mô tả).
4. **`Chip` & `TagInput` [NEW]**: Hiển thị thẻ gắn nhãn có thể đóng (`onRemove`), cho phép gõ phím Enter/Comma để thêm tag mới.
5. **`TimeSlotPicker` [NEW]**: Chuẩn hóa lưới chọn ca tập theo khung giờ với các trạng thái: Available, Busy/Unavailable, Past, Selected.
6. **`FileUpload` & `SubmitButton` [NEW/STANDARDIZED]**: Kéo thả file ảnh, xem trước thumbnail và nút Submit tích hợp loading spinner.

---

## 2. Kết quả Rà soát & Khắc phục Lỗ hổng (Anti-Regression Audit Report)

| Thành phần | Lỗ hổng phát hiện khi đối chiếu Baseline `01a2beb` | Phương án đã khắc phục & Chuẩn hóa | Trạng thái |
| :--- | :--- | :--- | :--- |
| **`FormField.tsx`** | Gộp hook `useFormField()` chung file gây cảnh báo ESLint React Fast Refresh | Tách `form-field-context.ts` thành utility context độc lập, đạt 0 lint warning | **Đã sửa** |
| **`FormField.tsx`** | Nguy cơ mất liên kết `htmlFor` khi người dùng truyền custom `id` | `useId()` tự động fallback an toàn qua `customId ?? customHtmlFor ?? generatedId` | **Đã sửa** |
| **`Combobox.tsx`** | Popover trigger width bị co hẹp trên mobile | Cấu hình `w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[95vw]` | **Đã sửa** |
| **`TimeSlotPicker.tsx`** | Định dạng giờ dễ lệch timezone người dùng | Chuẩn hóa prop `timeZone` (mặc định `'Asia/Ho_Chi_Minh'`) và format an toàn | **Đã sửa** |

---

## 3. Checklist Triển khai Chi tiết

### 3.1. `FormField.tsx` & `form-field-context.ts`
- [x] Tách `FormFieldContext` và hook `useFormField()`.
- [x] Tự động sinh `aria-describedby` trỏ tới ID của error message hoặc hint text.
- [x] Bảo toàn 100% props gốc từ baseline `01a2beb`.

### 3.2. `Combobox.tsx` & `Combobox.test.tsx`
- [x] Hỗ trợ tìm kiếm, options with icons/badges, clearable button.
- [x] Test suite `Combobox.test.tsx` (4 tests pass 100%).

### 3.3. `RadioGroup.tsx` & `RadioGroup.test.tsx`
- [x] Hỗ trợ Standard Radio và RadioCard (horizontal / vertical).
- [x] Test suite `RadioGroup.test.tsx` (2 tests pass 100%).

### 3.4. `Chip.tsx`, `TagInput.tsx` & `Chip.test.tsx`
- [x] Hỗ trợ interactive chips, remove tags, keyboard enter/comma tag adding.
- [x] Test suite `Chip.test.tsx` (3 tests pass 100%).

### 3.5. `TimeSlotPicker.tsx` & `TimeSlotPicker.test.tsx`
- [x] Lưới ca tập responsive 2-4 cột, hiển thị badge lý do không khả dụng.
- [x] Test suite `TimeSlotPicker.test.tsx` (3 tests pass 100%).

### 3.6. `FileUpload.tsx` & `SubmitButton.tsx`
- [x] File upload drag-and-drop, xem trước ảnh, SubmitButton tích hợp trạng thái loading.

---

## 4. Phase Quality Gate & Tiêu chí Nghiệm thu

- [x] **Automated Tests**: 61/61 test files pass, 299/299 tests pass 100%.
- [x] **Linter & Type Check**: `npm run lint` 0 error (0 warning cho form components), `npm run build` thành công sạch sẽ.
- [x] **Interactive Showcase**: Trưng bày tại `http://localhost:5173/dev/ui-showcase#forms`.
- [ ] **User Sign-off**: Nhận phê duyệt chính thức từ người dùng để chuyển sang Phase 3.

