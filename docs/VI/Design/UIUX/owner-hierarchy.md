# OWNER ROLE - SCREEN HIERARCHY

## 1. Owner Dashboard

- KPI cards: doanh thu, hội viên mới, tỷ lệ gia hạn, hiệu suất PT.
- Snapshot: active members, active packages, feedback open, thiết bị hỏng/đang sửa.
- Widgets: giao dịch gần đây, feedback mới, maintenance alerts.
- Quick actions: quản lý nhân sự, nhóm quyền, gói tập, báo cáo.

## 2. Quản lý nhân sự

### 2.1 Staff List

- Danh sách staff active.
- Cột: staff code, họ tên, email, phone, position, status.
- Filter: position, trạng thái, keyword.
- Actions: xem chi tiết, thêm mới, chỉnh sửa, cho thôi việc/soft delete.

### 2.2 Add/Edit Staff

- Fields: họ tên, email, phone, position (pt/manager/receptionist/technician).
- Hiển thị staff_code tự sinh sau khi tạo.
- Gán nhóm quyền mặc định hoặc nhiều group cùng lúc.
- Thiết lập lịch làm việc: ngày, ca, bulk insert theo tháng/pattern.
- Validation: email/phone unique, không trùng ca trong cùng ngày.

### 2.3 Staff Detail

- Hồ sơ staff, trạng thái verify/login.
- Danh sách group đang thuộc.
- Lịch làm việc.
- Nếu là PT: số buổi completed, feedback avg.
- Actions: edit, đổi nhóm quyền, soft delete.

## 3. Quản lý nhóm quyền / RBAC

### 3.1 Group List

- Danh sách group: owner, staff, trainer, member (+ custom nếu cho phép).
- Cột: tên nhóm, số thành viên, số permissions.
- Action: mở chi tiết group.

### 3.2 Assign Group To User

- Chọn user/staff.
- Danh sách group hiện có.
- Current assigned groups.
- Actions: assign, remove, save.

### 3.3 Manage Users In Group

- Header group info.
- Danh sách thành viên hiện tại.
- Search theo staff code/user.
- Actions: thêm thành viên, loại bỏ thành viên.

### 3.4 Manage Permissions For Group

- Permission catalog theo module: auth, members, subscriptions, training, progress, rooms, equipment, packages, staff, reports.
- Checkbox matrix cho từng quyền.
- Warning: cập nhật áp dụng ngay cho toàn bộ thành viên nhóm.
- Actions: save, reset.

## 4. Cấu hình gói tập

### 4.1 Package List

- Cột: package code, tên gói, duration days, price, status, deleted state.
- Filters: active/inactive/deleted.
- Actions: create, edit, deactivate, soft delete.

### 4.2 Create/Edit Package

- Fields: tên gói, thời hạn ngày, giá VND, quyền lợi.
- package_code do server sinh.
- Validation: tên không trùng, duration_days > 0, price >= 0, không số thập phân.
- Actions: save, cancel.

### 4.3 Deactivate/Delete Package Dialog

- Deactivate: ẩn khỏi đăng ký mới nhưng gói cũ vẫn hoạt động.
- Soft delete: block nếu còn subscription active/pending tham chiếu.
- Confirmation + impact note.

## 5. Báo cáo thống kê

### 5.1 Report Selector

- Chọn loại báo cáo: doanh thu, hội viên mới, tỷ lệ gia hạn, hiệu suất nhân viên.
- Inputs: from date, to date.
- Action: generate.

### 5.2 Revenue Report

- Line chart theo ngày.
- KPI tổng doanh thu.
- Bảng giao dịch thành công.
- Export: PDF/Excel/CSV.

### 5.3 New Members Report

- Bar chart theo ngày.
- Bảng số lượng đăng ký mới.

### 5.4 Renewal Rate Report

- Pie chart renewed vs churned.
- Ghi chú công thức tính.

### 5.5 Staff Performance Report

- Ranking table theo PT.
- Metrics: completed sessions, average feedback.
- Chart hỗ trợ.

### 5.6 No Data / Error State

- Empty state: không có dữ liệu trong range.
- Error state: lỗi tính toán, thông báo chung.

## 6. Quản lý phòng tập

### 6.1 Room List

- Cột: room code, room name, capacity, description.
- Actions: add, edit, delete.

### 6.2 Add/Edit Room

- Fields: mã phòng, tên phòng, sức chứa tối đa, mô tả.
- Validation: room code unique.

### 6.3 Delete Room Confirmation

- Block nếu còn equipment.room_id hoặc training_sessions.room_id chưa kết thúc.
- Double confirm hard delete.

## 7. Quản lý thiết bị (overview quyền owner)

### 7.1 Equipment List

- Cột: equipment code, tên, room, import date, warranty until, status.
- Filter: active/broken/repairing/retired.
- Search: code/name.
- Actions: add, edit, report issue, retire/delete.

### 7.2 Equipment Detail / Maintenance Timeline

- Thông tin thiết bị.
- Lịch sử maintenance logs.
- Trạng thái hiện tại.

## 8. Tổng quan feedback

### 8.1 Feedback List

- Tabs: open, in_progress, resolved, rejected.
- Cột: type, subject, severity, created_at, SLA badge, status.
- Filters: type, severity, status.

### 8.2 Feedback Detail

- Member info.
- Nội dung phản hồi.
- Đối tượng tham chiếu staff/equipment/service.
- Internal note + trạng thái xử lý.

## 9. Profile / Account

- Thông tin cá nhân.
- Đổi mật khẩu.
- Đăng xuất.
