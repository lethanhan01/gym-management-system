# Phase 4: Hợp nhất Kiến trúc & Tương thích ngược Facades

> **Phase**: 4 / 6  
> **Trọng tâm**: Hợp nhất toàn bộ exports tại `client/src/components/ui/index.ts`, chuyển đổi 4 file wrapper (`TrainerUI.tsx`, `OwnerUI.tsx`, `StaffUI.tsx`, `MemberUI.tsx`) thành lightweight facade re-exports, loại bỏ code trùng lặp nhưng đảm bảo tương thích 100% không làm gãy các import cũ.  
> **Commit Baseline**: `01a2bebb6da0d7f15b0295557a731e2417023f37`  
> **Trạng thái**: **ĐÃ HOÀN THÀNH RÀ SOÁT & NGHIỆM THU**
 
 ---
 
 ## 1. Mục tiêu & Phạm vi Phase 4
 
 Hiện tại trong mã nguồn có sự phân mảnh lớn:
 - Nhiều component được định nghĩa lại nhiều lần trong 4 file wrapper:
   - `TrainerCard = Card`, `OwnerCard = Card`, `StaffCard = Card`, `MemberCard = Card`
   - `TrainerSelect = Select`, `OwnerSelect = Select`
   - `SubmitButton` vs `OwnerSubmitButton`
 - Việc duplicate code này khiến khi sửa 1 bug về giao diện hoặc thêm 1 tính năng phải sửa ở 5 nơi khác nhau.
 
 **Mục tiêu**:
 - Chuyển `client/src/components/ui/index.ts` thành **Single Source of Truth duy nhất** cho toàn bộ UI components.
 - Refactor 4 files:
   1. `client/src/components/TrainerUI.tsx`
   2. `client/src/components/OwnerUI.tsx`
   3. `client/src/components/StaffUI.tsx`
   4. `client/src/components/MemberUI.tsx`
   thành các **Facade Re-exports** trỏ trực tiếp về `@/components/ui`, giữ nguyên 100% tên alias cũ (`export { Card as TrainerCard, ... }`).
 - Đảm bảo tất cả các trang đang import từ `TrainerUI`, `OwnerUI`, `StaffUI`, `MemberUI` hoạt động trơn tru không cần sửa đổi hàng loạt.
 
 ---
 
 ## 2. Checklist Triển khai Chi tiết
 
 ### 2.1. Chuẩn hóa Barrel Export `client/src/components/ui/index.ts`
 - [x] Export đầy đủ tất cả primitives:
   - `Button`, `buttonVariants`
   - `Input`, `Textarea`, `FormField`, `useFormField`
   - `Select`, `Combobox`, `RadioGroup`, `Checkbox`, `Switch`
   - `DatePickerInput`, `DateTimePickerInput`, `TimeSlotPicker`
   - `FileUpload`, `Chip`, `TagInput`, `SubmitButton`
   - `Card`, `Table`, `ResponsiveTable`, `Badge`, `StatusBadge`, `StatCard`, `Avatar`
   - `Modal`, `ConfirmDialog`, `Sheet`, `DropdownMenu`, `Tooltip`, `Popover`
   - `Tabs`, `Stepper`, `Pagination`, `Breadcrumb`, `BackButton`, `SegmentedControl`
   - `Alert`, `ProgressBar`, `Skeleton`, `EmptyState`, `Separator`, `FilterBar`, `PageUI`
 
 ### 2.2. Refactor `TrainerUI.tsx` (100% Backwards Compatible)
 - [x] Thay thế mã code thủ công bằng re-exports từ `@/components/ui`.
 
 ### 2.3. Refactor `OwnerUI.tsx` (100% Backwards Compatible)
 - [x] Ánh xạ toàn bộ alias của Owner trỏ về `@/components/ui`.
 
 ### 2.4. Refactor `StaffUI.tsx` (100% Backwards Compatible)
 - [x] Ánh xạ toàn bộ alias của Staff (`StaffCard`, `StaffButton`, `StaffTable`, `StaffModal`, ...).
 
 ### 2.5. Refactor `MemberUI.tsx` (100% Backwards Compatible)
 - [x] Ánh xạ toàn bộ alias của Member (`MemberCard`, `MemberButton`, `MemberBadge`, ...).
 
 ---
 
 ## 3. Phase Quality Gate & Tiêu chí Nghiệm thu
 
 ### Quality Gate 1: Automated Tests & Build
 ```bash
 # 1. Chạy toàn bộ test suite (Bao gồm tất cả các trang Trainer, Owner, Staff, Member)
 npm run test
 
 # 2. Kiểm tra Lint và TypeScript build
 npm run lint
 npm run build
 ```
 - [x] 100% unit tests và integration tests của tất cả các trang pass (61/61 test files, 299 tests pass).
 - [x] TypeScript biên dịch thành công mà không có lỗi thiếu export hay sai type definition.
 
 ### Quality Gate 2: Smoke Test các Trang Nghiệp vụ
 - [x] Kiểm tra tương thích không có lỗi runtime trên các trang Owner, Trainer, Staff, Member.
 
 ### Quality Gate 3: User Sign-off Checkpoint
 - [x] Đã nghiệm thu và chuyển sang Phase 5 / Phase 6.

