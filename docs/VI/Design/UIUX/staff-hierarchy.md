# STAFF ROLE - SCREEN HIERARCHY

## 1. Staff Dashboard

- KPI cards: check-in hôm nay, gói sắp hết hạn, feedback open, thiết bị hỏng.
- Widgets: đăng ký mới gần đây, yêu cầu maintenance mới.
- Quick actions: đăng ký hội viên, gia hạn gói, quản lý phòng, thiết bị, feedback.

## 2. Đăng ký hội viên tại quầy

### 2.1 Registration Form

- Fields: họ tên, phone, email, DOB, address.
- Optional: chọn primary trainer.
- Package selector: chỉ hiện package active và chưa deleted.
- Validation: duplicate email/phone, format input.

### 2.2 Payment Step

- Tổng tiền.
- Payment methods: cash, bank card, e-wallet.
- Payment status.
- Retry hoặc cancel nếu fail.

### 2.3 Registration Success

- Member code tự sinh.
- Email tài khoản / verify đã gửi.
- Receipt preview / print.
- Note: member có thể check-in trước khi verify online nếu staff đã xác minh offline.

### 2.4 Existing Member Lookup

- Search theo email/phone/member code.
- Gợi ý chuyển sang flow gia hạn nếu đã tồn tại.

## 3. Quản lý gói của hội viên

### 3.1 Subscription List

- Danh sách subscriptions theo hội viên.
- Cột: package, start date, end date, status, payment status.
- Actions: renew, cancel, view history.

### 3.2 Renew Package

- Chọn gói mới hoặc cùng gói cũ.
- Hiển thị rule start_date: active ngay hoặc pending nối tiếp.
- Payment step.
- Success receipt/email.

### 3.3 Cancel Package

- Warning: mất quyền truy cập ngay, không hoàn tiền.
- Confirmation dialog.
- Kết quả: cancelled hoặc active gói pending tiếp theo nếu có.

## 4. Quản lý feedback

### 4.1 Feedback Inbox

- Tabs: open, in_progress, resolved, rejected.
- Cột: type, subject, severity, created_at, SLA badge, status.
- Filters: type, severity, status.
- Action: mở chi tiết.

### 4.2 Feedback Detail

- Member info.
- Nội dung phản hồi.
- Subject reference staff/equipment/service.
- Internal notes.
- Actions: receive, mark in_progress, resolve, reject.

### 4.3 Reject Dialog

- Bắt buộc nhập lý do nội bộ.
- Save reject action.

## 5. Quản lý phòng tập

### 5.1 Room List

- Cột: room code, room name, capacity, description.
- Search/filter.
- Actions: add, edit, delete.

### 5.2 Add/Edit Room

- Fields: room code, room name, max capacity, description.
- Validation: room code unique.

### 5.3 Delete Room Confirmation

- Dependency check với equipment / training sessions.
- Double confirm hard delete.

## 6. Quản lý thiết bị

### 6.1 Equipment List

- Cột: equipment code, name, room, import date, warranty until, status.
- Filters: active, broken, repairing, retired.
- Search: code/name.
- Actions: add, edit, report issue, retire/delete.

### 6.2 Add/Edit Equipment

- Fields: room, name, import date, warranty until.
- Validation: required fields, warranty >= import date.

### 6.3 Report Issue

- Equipment summary.
- Problem description.
- Kết quả: tạo maintenance log, equipment -> broken.
- Notify technician queue.

### 6.4 Retire/Delete Confirmation

- Check unresolved maintenance logs.
- Khuyên dùng retired thay vì hard delete.
- Double confirm.

## 7. Technician screens (sub-role thuộc staff)

### 7.1 Maintenance Dashboard

- New reported issues.
- Repairing items.
- Failed repairs / retired items.
- Priority theo created time / severity nếu map.

### 7.2 Maintenance Detail

- Equipment info.
- Issue description.
- Reporter info.
- Timeline: reported -> repairing -> resolved/failed.
- Actions: accept repair, mark resolved, mark failed.

### 7.3 Repair Result Dialog

- Resolved -> equipment active.
- Failed -> equipment retired.

## 8. Profile / Account

- Thông tin cá nhân.
- Đổi mật khẩu.
- Đăng xuất.
