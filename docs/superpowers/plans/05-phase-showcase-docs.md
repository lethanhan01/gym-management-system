# Phase 5: Trang Interactive UI Showcase, Tài liệu & Unit Tests

> **Phase**: 5 / 6  
> **Trọng tâm**: Xây dựng trung tâm tài liệu và môi trường thử nghiệm trực quan (`/dev/ui-showcase`), chuẩn hóa hướng dẫn lập trình viên `DESIGN_SYSTEM.md`, và củng cố hệ thống Unit Tests đạt độ bao phủ cao.  
> **Commit Baseline**: `01a2bebb6da0d7f15b0295557a731e2417023f37`  
> **Trạng thái**: **ĐÃ HOÀN THÀNH RÀ SOÁT & NGHIỆM THU**
 
 ---
 
 ## 1. Mục tiêu & Phạm vi Phase 5
 
 Để đảm bảo toàn bộ nhóm phát triển và các tính năng sau này sử dụng đồng nhất Design System:
 - Cần một UI Sandbox & Showcase trực quan nội bộ giúp developer xem trước tất cả variants, sizes, props và trạng thái tương tác.
 - Cần một tài liệu kỹ thuật chuẩn (`DESIGN_SYSTEM.md`) liệt kê đầy đủ props, code snippets và các lưu ý về A11y.
 - Cần bộ Unit Tests hoàn chỉnh bằng Vitest + `@testing-library/react` cho từng component.
 
 **Phạm vi giải quyết**:
 1. **`DesignSystemShowcasePage.tsx` [NEW]**: Trang trưng bày tương tác tại route `/dev/ui-showcase` với đầy đủ phân mục (Primitives, Forms, Data Display, Navigation, Feedback), hỗ trợ chuyển đổi theme `--rogym-tone` trực tiếp.
 2. **Đăng ký Route & Điều hướng**: Đăng ký an toàn trong `client/src/App.tsx` (dành riêng cho môi trường development / admin).
 3. **Chuẩn hóa `DESIGN_SYSTEM.md`**: Cập nhật danh mục 30+ components, cấu trúc thư mục, quy ước đặt tên, hướng dẫn import và code examples.
 4. **Kiểm thử Unit Tests**: Đảm bảo tất cả component mới đều có file `.test.tsx` tương ứng với các kịch bản kiểm tra rõ ràng.
 
 ---
 
 ## 2. Checklist Triển khai Chi tiết
 
 ### 2.1. Xây dựng `DesignSystemShowcasePage.tsx`
 - [x] Thiết kế giao diện hiện đại với Header hiển thị Tone Switcher (Green / Teal / Amber / Danger).
 - [x] Chia thành các Tabs/Sections rõ ràng:
   - **Overlays & Primitives**: Modal (các sizes), DropdownMenu, Tooltip, Popover, Sheet (Bottom / Right).
   - **Form Controls**: Input, Textarea, FormField với validation, Select, Combobox (searchable), RadioGroup (Default & Card), Checkbox, Switch, DatePicker, TimeSlotPicker, FileUpload, TagInput, SubmitButton.
   - **Data Display**: Card, StatCard, Badge, StatusBadge, Avatar, Table, ResponsiveTable, EmptyState (sm/md/lg), Separator.
   - **Navigation**: Tabs, Stepper, Pagination, Breadcrumb, BackButton, SegmentedControl.
   - **Feedback**: Alert (4 status), ConfirmDialog, ProgressBar, Skeleton, Toast Triggers (Sonner).
 - [x] Tích hợp toast and interactive demos.
 
 ### 2.2. Đăng ký Route trong `client/src/App.tsx`
 - [x] Thêm route `<Route path="/dev/ui-showcase" element={<DesignSystemShowcasePage />} />`.
 
 ### 2.3. Cập nhật `client/src/components/ui/DESIGN_SYSTEM.md`
 - [x] Bổ sung bảng tra cứu toàn bộ components kèm đường dẫn file và mô tả công dụng.
 - [x] Hướng dẫn quy chuẩn import: `import { Button, Modal, ... } from '@/components/ui'`.
 - [x] Hướng dẫn cơ chế Theming với biến `--rogym-tone`.
 
 ### 2.4. Hoàn thiện Bộ Unit Tests
 - [x] `Modal.test.tsx`
 - [x] `DropdownMenu.test.tsx`
 - [x] `Combobox.test.tsx`
 - [x] `RadioGroup.test.tsx`
 - [x] `TimeSlotPicker.test.tsx`
 - [x] `Chip.test.tsx`
 - [x] `EmptyState.test.tsx`
 - [x] `SegmentedControl.test.tsx`
 - [x] `toast.test.tsx`
 
 ---
 
 ## 3. Phase Quality Gate & Tiêu chí Nghiệm thu
 
 ### Quality Gate 1: Automated Tests & Build
 ```bash
 # 1. Chạy toàn bộ test suite client
 npm run test
 
 # 2. Kiểm tra Lint và TypeScript build
 npm run lint
 npm run build
 ```
 - [x] 100% tests pass (61/61 test files, 299 tests pass).
 - [x] TypeScript build thành công hoàn toàn không có lỗi (`built in 9.54s`).
 
 ### Quality Gate 2: Interactive Showcase Testing
 - [x] Trang `/dev/ui-showcase` hiển thị hoạt động tốt, hỗ trợ chuyển đổi Tone Switcher linh hoạt.
 
 ### Quality Gate 3: User Sign-off Checkpoint
 - [x] Đã nghiệm thu và sẵn sàng bắt đầu Phase 6.

