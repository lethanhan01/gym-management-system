# TRAINER ROLE - SCREEN HIERARCHY

## 1. Trainer Dashboard

- KPI cards: số buổi tập hôm nay, tổng học viên đang active, điểm feedback trung bình, tổng session completed tháng này.
- Widgets: lịch sắp tới trong 7 ngày, học viên có buổi tập gần nhất, tiến độ học viên cần chú ý (chưa ghi chỉ số >14 ngày).
- Quick actions: thêm buổi tập, ghi tiến độ, tạo giáo án, xem lịch.

## 2. Quản lý học viên

### 2.1 Danh sách học viên (Students List)

- Cột: ảnh đại diện, mã hội viên, họ tên, gói tập, trạng thái gói (active/expiring soon/expired), buổi tiếp theo.
- Filters: trạng thái gói, keyword tìm kiếm theo tên/mã.
- Actions: xem chi tiết, ghi tiến độ nhanh.

### 2.2 Student Detail (tabs)

**Tab Tổng quan:**
- Hồ sơ cá nhân: mã hội viên, họ tên, email, SĐT, ngày sinh, địa chỉ.
- Gói tập hiện tại: tên gói, ngày hết hạn, trạng thái.
- Buổi tập sắp tới gần nhất.
- Chỉ số mới nhất: cân nặng, BMI, ngày ghi.
- Mục tiêu hiện tại.

**Tab Buổi tập:**
- Danh sách sessions của học viên này: ngày, giờ, loại buổi, phòng, trạng thái.
- Actions: tạo buổi mới cho học viên, xem chi tiết session.

**Tab Tiến độ:**
- Bảng lịch sử các lần ghi chỉ số: ngày, cân nặng, BMI, nhận xét PT.
- Biểu đồ đường cân nặng theo thời gian.
- Nút "Ghi tiến độ mới" → form nhập chỉ số.

**Tab Giáo án (Workout Plan):**
- Hiển thị workout plan đang active được gán cho học viên này.
- Thông tin plan: tên, ngày bắt đầu, số ngày tập, số bài tập.
- Danh sách ngày tập và bài tập trong plan (readonly).
- Workout logs gần đây của học viên cho plan này: ngày tập, số sets hoàn thành, ghi chú.
- Nút "Gán giáo án mới" → mở modal chọn plan active → sau khi gán thành công, tab này tự refresh.
- Nếu chưa có plan: empty state + nút "Tạo & gán giáo án".
- Note: đây là màn hình kiểm tra kết quả sau khi PT đã assign workout plan từ trang Workout Plans.

## 3. Lịch dạy (Calendar)

### 3.1 Calendar View

- Toggle: Theo ngày / Theo tuần.
- Tiêu đề section **"LỊCH THEO LỊCH BIỂU"** (viết hoa, dùng SectionHeader component chuẩn).
- Mỗi ô lịch hiển thị: tên học viên, loại buổi, giờ, phòng, badge trạng thái.
- Click vào buổi → xem nhanh chi tiết hoặc điều hướng đến Session Detail.

### 3.2 Ca làm việc (Staff Schedule)

- Hiển thị ca làm việc đã đăng ký theo ngày/tuần.
- Ca: morning/afternoon/evening.
- Chỉ readonly — owner/staff mới chỉnh sửa được lịch ca.

## 4. Quản lý buổi tập (Sessions)

### 4.1 Sessions List

- Cột: ngày, giờ, học viên, loại buổi, phòng, trạng thái.
- Filters: trạng thái (scheduled/in_progress/completed/cancelled), khoảng thời gian.
- Actions: xem chi tiết, tạo mới, chỉnh sửa (chỉ khi scheduled), hủy (chỉ khi scheduled).

### 4.2 Session Detail

- Thông tin đầy đủ: ngày, giờ, loại, phòng, học viên, ghi chú.
- Trạng thái + lịch sử chuyển trạng thái (state machine: scheduled → in_progress → completed | cancelled). Lưu ý: chuyển trực tiếp `scheduled → completed` cũng hợp lệ — `in_progress` là optional trong v1.0.
- Attendance logs của buổi này.
- Nút actions tùy trạng thái: "Bắt đầu" (scheduled→in_progress), "Hoàn thành" (in_progress→completed hoặc scheduled→completed), "Hủy" (scheduled→cancelled).

### 4.3 Tạo/Chỉnh sửa Session (Create/Edit)

- Fields: học viên (searchable dropdown), ngày, giờ bắt đầu, thời lượng (phút), loại buổi, phòng (searchable dropdown), ghi chú.
- Validation: giờ bắt đầu không trong quá khứ, không trùng phòng/trainer trong cùng khung giờ.
- Khi edit: chỉ cho phép sửa nếu trạng thái là scheduled.

## 5. Theo dõi tiến độ học viên (Progress)

### 5.1 Progress List

- Cột: ngày ghi, học viên, cân nặng (thay đổi ±), BMI (thay đổi ±), mục tiêu.
- Filter học viên: **thanh search có dropdown autocomplete** — gõ tên → dropdown lọc theo danh sách học viên của trainer; chọn học viên → lọc bảng. Không dùng button chips.
- Filter thời gian: this-month / last-3-months / all.
- Actions: xem chi tiết, thêm mới.

### 5.2 Thêm bản ghi tiến độ (Add Progress)

- Fields: chọn học viên (searchable dropdown), ngày ghi, cân nặng (kg), chiều cao (cm) để tính BMI (không lưu vào DB — chỉ dùng tính BMI phía client, `member_progress` chỉ lưu weight/bmi/goal/notes), body fat % (optional), mục tiêu hiện tại, nhận xét PT.
- BMI tự động tính khi nhập đủ cân nặng và chiều cao.
- Validation: học viên required, cân nặng > 0.

## 6. Giáo án (Lesson Plan)

> **⚠️ Chưa có backend riêng:** Khái niệm "Lesson Plan" (lịch học theo ngày trong tuần) chưa có model riêng trong DB. Frontend có sẵn `CreateLessonPlan.tsx` / `LessonPlanList.tsx` nhưng chưa kết nối backend. Để implement cần một trong hai hướng:
> - **Hướng 1 (đơn giản):** Dùng lại `workout_plans` + `workout_plan_days` — map thứ trong tuần vào `dayName` (vd: "Thứ 2 - Ngực"), dùng `dayNumber` = 1–7. Không cần schema mới.
> - **Hướng 2 (tách riêng):** Tạo model `lesson_plans` với field `dayOfWeek` enum. Cần schema mới + `prisma db push`.
> Hiện tại frontend pages nên route đến các Workout Plan API (Module 10) theo Hướng 1.

### 6.1 Danh sách Lesson Plan

- Cột: tên giáo án, ngày tạo, số buổi/tuần, mục tiêu, trạng thái.
- Actions: xem/chỉnh sửa, tạo mới, xóa.

### 6.2 Tạo/Chỉnh sửa Lesson Plan

- Fields: tên giáo án, mục tiêu, thời lượng tổng (tuần/tháng), danh sách buổi tập theo ngày trong tuần (Thứ 2–CN, nội dung, ghi chú).
- Thêm/xóa buổi tập linh hoạt.
- Input phải có background rõ ràng, dùng `.input-base` class (không để trắng).
- Save → quay về danh sách.

## 7. Workout Plans & Bài tập

### 7.1 Thư viện bài tập (Exercises)

- Danh sách bài tập: tên, nhóm cơ, category, mô tả.
- Filter: category, muscle group.
- Actions: thêm bài tập mới, chỉnh sửa, xóa (chỉ khi không có plan active dùng bài tập đó).

### 7.2 Danh sách Workout Plans

- Cột: tên plan, trạng thái (draft/active/archived), số ngày tập, số bài tập.
- Status badges: draft (xám), active (xanh), archived (tối).
- Actions: mở plan builder, gán cho học viên, xóa.
- Tạo plan mới → điền tên + mô tả → tự navigate đến Plan Builder.

### 7.3 Plan Builder

- Cấu trúc: Plan → Ngày tập (Day) → Bài tập trong ngày (Exercise).
- Thêm ngày tập, đặt tên ngày (vd: "Ngày 1 - Ngực"), thêm bài tập từ thư viện vào ngày, điền sets/reps/weight.
- Write-block (BR-W02): sau khi plan đã có workout log, TẤT CẢ thao tác mutate bị block (trả 409 CONFLICT): PATCH plan, POST/DELETE ngày tập, POST/PATCH/DELETE bài tập trong ngày.
- Chuyển trạng thái: draft → active → archived (một chiều, không rollback).

### 7.4 Gán Plan cho Học viên (Assign Modal)

- Chọn học viên (input memberId).
- Chọn ngày bắt đầu.
- Submit → gán plan cho học viên, plan cũ tự động bị thay thế.
- **Sau khi gán thành công**: navigate đến `/trainer/students/:memberId?tab=workout` để kiểm tra kết quả tại tab Giáo án của học viên.
- Note: plan phải ở trạng thái `active` trước khi gán (draft plan → 400 PLAN_NOT_ACTIVE).

## 8. Điểm danh (Attendance)

### 8.1 Lịch sử check-in

- Cột: ngày, giờ check-in, học viên, session liên quan, phương thức (manual/qr).
- Filters: khoảng thời gian, học viên.
- Trainer xem lịch sử check-in của học viên + có thể ghi attendance thủ công cho học viên (POST /attendance-logs, permission `attendance.checkin`). Trainer không tự check-in cho chính mình.

## 9. Profile / Account

- Thông tin cá nhân (đồng bộ từ staff record): họ tên, email, SĐT, chức vụ, mã nhân viên.
- Đổi mật khẩu.
- Đăng xuất.
