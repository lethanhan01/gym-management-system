# MEMBER ROLE - SCREEN HIERARCHY

## 1. Member Dashboard

- **Card gói tập**: tên gói hiện tại, ngày hết hạn, trạng thái (active/expiring/expired). Nút "Xem gói" → /member/current-package. Nếu sắp hết hạn (≤7 ngày): hiện badge cảnh báo + nút "Gia hạn ngay".
- **Card giáo án hôm nay**: tên workout plan đang active, hôm nay tập gì (tên ngày tập). Nút "Bắt đầu tập" → /member/workout. Nếu chưa có plan: "Chưa có giáo án, liên hệ PT để được gán giáo án".
- **Card tiến độ**: cân nặng mới nhất, BMI, % tiến độ so với mục tiêu. Nút "Xem chi tiết" → /member/progress-chart.
- **Thông báo (Notification)**: nhắc lịch tập, nhắc gia hạn gói, phản hồi được xử lý. Empty state nếu không có thông báo mới.
- **Quick links**: Gói tập / Lịch tập / Tiến độ / Giáo án / Phản hồi.

## 2. Quản lý gói tập

### 2.1 Gói hiện tại (Current Package)

- Thông tin gói: tên gói, giá, thời hạn, ngày bắt đầu, ngày hết hạn, trạng thái.
- Quyền lợi gói (nếu có mô tả).
- Nút "Gia hạn" → /member/renew-package.
- Nút "Mua gói mới" → /member/buy-package.
- Subscription status badge: pending / active / expired / cancelled.

### 2.2 Mua gói mới (Buy Package)

- Danh sách gói tập đang active.
- Mỗi gói: tên, thời hạn, giá (+ VAT), quyền lợi.
- Chọn gói → xác nhận → chọn phương thức thanh toán (cash/bank/e-wallet).
- Hiển thị giá gốc + VAT 8% + tổng cộng.
- Submit → tạo subscription pending + payment record.
- Thành công: toast "Đã ghi nhận thanh toán, gói sẽ được kích hoạt sau khi xác nhận".

### 2.3 Gia hạn gói (Renew Package)

- Hiển thị gói cũ đang active hoặc đã expired.
- Rule hiển thị: subscription mới start_date = ngày hôm nay nếu gói cũ expired, hoặc ngày kế tiếp sau end_date nếu gói cũ còn active (nối tiếp).
- Chọn gói mới (có thể cùng gói cũ hoặc gói khác).
- Thanh toán → tương tự Buy Package.

### 2.4 Lịch sử gói tập (Package History)

- Danh sách tất cả subscriptions theo thời gian giảm dần.
- Cột: tên gói, ngày bắt đầu, ngày hết hạn, trạng thái, số tiền đã thanh toán.
- Actions: xem chi tiết subscription, xem hóa đơn.

## 3. Lịch tập / Buổi tập

### 3.1 Lịch sử check-in (Attendance History)

- Cột: ngày, giờ check-in, phòng, session liên quan (nếu có).
- Filter: khoảng thời gian (tuần này / tháng này / tất cả).
- Empty state: "Chưa có lần check-in nào."

### 3.2 Danh sách buổi tập cá nhân (Session History)

- Cột: ngày, giờ, loại buổi, PT phụ trách, phòng, trạng thái.
- Tabs hoặc filter: sắp tới / đã hoàn thành / đã hủy.
- Click vào buổi: xem thông tin chi tiết (readonly).
- Empty state: "Chưa có buổi tập nào được lên lịch."

## 4. Theo dõi tiến độ

### 4.1 Biểu đồ tiến độ (Progress Chart)

- Biểu đồ đường cân nặng theo thời gian.
- Đường mục tiêu so sánh.
- Filter: 1 tháng / 3 tháng / 6 tháng / tất cả.
- Bảng tóm tắt: cân nặng đầu, cân nặng hiện tại, thay đổi tổng, BMI hiện tại.

### 4.2 Nhật ký tiến độ (Progress Log)

- Danh sách các lần ghi chỉ số.
- Cột: ngày ghi, cân nặng, BMI, body fat %, nhận xét PT.
- Sort: mới nhất lên đầu.
- Empty state: "Chưa có dữ liệu tiến độ. PT của bạn sẽ cập nhật sau buổi tập."

## 5. Giáo án cá nhân (Workout)

### 5.1 Xem giáo án được gán (My Plan)

- Hiển thị workout plan đang active được PT gán.
- Thông tin plan: tên plan, ngày bắt đầu, PT tạo/gán.
- Danh sách ngày tập: mỗi ngày có tên + danh sách bài tập (tên, sets/reps/weight mục tiêu).
- Nút **"Tập ngay"** ở đầu trang → /member/workout (WorkoutSessionPage).
- Nếu chưa có plan: empty state "Bạn chưa được gán giáo án. Liên hệ PT của bạn."

### 5.2 Buổi tập hôm nay (Workout Session)

- Tự động xác định ngày tập phù hợp dựa trên lịch plan và lần tập gần nhất.
- Hiển thị danh sách bài tập trong ngày: tên, mục tiêu (sets × reps × weight).
- Với mỗi bài tập: input thực tế (reps thực hiện, weight thực dùng, thời gian).
- Ghi chú tổng buổi tập (optional).
- Nút "Lưu buổi tập" → POST /workout-logs.
- Sau khi lưu thành công: navigate về /member/workout-history.
- Validation: phải điền ít nhất 1 set cho mỗi bài tập.

### 5.3 Lịch sử tập luyện (Workout History)

- Danh sách các buổi tập đã log.
- Cột: ngày tập, tên plan, số bài tập hoàn thành, ghi chú.
- Click vào buổi: xem chi tiết sets/reps thực hiện.
- Sort: mới nhất lên đầu.
- Filter: khoảng thời gian.
- Edit log: chỉ cho phép sửa trong vòng 24 giờ sau khi log.

## 6. Phản hồi (Feedback)

### 6.1 Gửi phản hồi (Send Feedback)

- Fields: loại phản hồi (thiết bị / nhân viên / dịch vụ), nội dung (bắt buộc), đối tượng tham chiếu (conditional — `type=staff` → chọn nhân viên cụ thể; `type=equipment` → chọn thiết bị cụ thể; `type=service` → không có subject). DB enforce bằng check constraint.
- Validation: loại và nội dung không được bỏ trống.
- Submit → POST /feedback → toast "Phản hồi đã gửi thành công."
- Điều hướng: sau submit → /member/my-feedback.

### 6.2 Phản hồi của tôi (My Feedback)

- Danh sách phản hồi đã gửi.
- Cột: ngày gửi, loại, nội dung tóm tắt, trạng thái (open / in_progress / resolved / rejected).
- Badge màu theo trạng thái: open (vàng), in_progress (xanh dương), resolved (xanh lá), rejected (đỏ).
- Click vào phản hồi: xem chi tiết + lịch sử xử lý (nếu có phản hồi từ staff).
- Empty state: "Bạn chưa gửi phản hồi nào."

## 7. Hồ sơ cá nhân (Profile)

- Thông tin cá nhân: họ tên, email (readonly), SĐT, ngày sinh, địa chỉ.
- Họ tên/SĐT/ngày sinh/địa chỉ có thể tự cập nhật.
- Đổi mật khẩu (chỉ hiển thị nếu tài khoản có passwordHash — LINE-only user thì ẩn phần này).
- Đăng xuất.

## 8. Đăng ký (Onboarding — public routes)

### 8.1 Đăng ký tại quầy (RegisterPage)

- Dành cho staff thực hiện hộ hoặc màn hình kiosk.
- Flow: điền thông tin → chọn gói → thanh toán → thành công.
- Tạo User + Member + Subscription + Payment trong 1 transaction.

### 8.2 Tự đăng ký online (RegisterOnline)

- Member tự đăng ký.
- Flow: điền thông tin → gửi → verify email → đăng nhập.
- Không tạo subscription ngay (tự chọn gói sau khi đăng nhập).

### 8.3 Xác minh email (VerifyEmail / VerifyEmailPage)

- Nhập OTP hoặc click link từ email.
- Sau verify: tự redirect đến /login.

### 8.4 Thanh toán (Payment / PaymentPage)

- Hiển thị thông tin đơn hàng, số tiền, phương thức thanh toán: `cash` (tiền mặt), `bank_card` (chuyển khoản/thẻ ngân hàng), `ewallet` (ví điện tử).
- Kết quả: success → RegisterSuccess; failed → retry.

### 8.5 Đăng ký thành công (RegisterSuccess)

- Tóm tắt thông tin tài khoản.
- Mã hội viên.
- Hướng dẫn bước tiếp theo (tải app / đến quầy lấy thẻ / v.v.).
- Nút "Đăng nhập" → /login.
