# 3. Đặc tả các chức năng

Phần này đặc tả các use case cấp chức năng theo danh sách UC01-UC21. Mọi use case thao tác dữ liệu nội bộ đều yêu cầu người dùng đã đăng nhập, JWT hợp lệ và thỏa RBAC tương ứng; các use case công khai gồm đăng nhập, quên/đặt lại mật khẩu và member tự đăng ký online. Các thao tác tạo/sửa/xóa dữ liệu quan trọng phải ghi audit log theo quy ước trong Architecture.md và Database.md.

---

## 3.1 Đặc tả Use Case UC01 - Đăng nhập

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC01 |
| **Tên Use case** | Đăng nhập |
| **Tác nhân** | Member, Trainer, Staff, Owner |
| **Tiền điều kiện** | Người dùng đã có tài khoản trong hệ thống, tài khoản chưa bị xóa và đã xác thực email nếu đang ở trạng thái yêu cầu xác thực |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Người dùng | Mở màn hình đăng nhập và nhập email, mật khẩu |
| 2 | Hệ thống | Kiểm tra định dạng email, độ dài mật khẩu và rate limit |
| 3 | Hệ thống | Xác thực email/mật khẩu, kiểm tra `users.status='active'` và `deleted_at IS NULL` |
| 4 | Hệ thống | Tạo JWT chứa `userId`, role/group và các định danh liên quan (`memberId`, `staffId` nếu có) |
| 5 | Hệ thống | Điều hướng người dùng tới dashboard phù hợp với role: member, trainer, staff hoặc owner |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Hệ thống | Email hoặc mật khẩu sai định dạng -> hiển thị lỗi nhập liệu |
| 3a | Hệ thống | Sai thông tin đăng nhập, tài khoản chưa verify, bị khóa hoặc đã bị xóa -> trả lỗi xác thực chung và ghi audit thất bại |
| 3b | Người dùng | Chọn "Quên mật khẩu" -> chuyển sang UC03 |

### Dữ liệu đầu vào

| Trường | Bắt buộc | Ràng buộc |
|--------|----------|-----------|
| `email` | Có | Đúng định dạng email |
| `password` | Có | Tối thiểu 8 ký tự |

### Hậu điều kiện
Người dùng đăng nhập thành công có JWT hợp lệ trên client. Audit log ghi nhận lần đăng nhập thành công hoặc thất bại.

---

## 3.2 Đặc tả Use Case UC02 - Đăng xuất

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC02 |
| **Tên Use case** | Đăng xuất |
| **Tác nhân** | Member, Trainer, Staff, Owner |
| **Tiền điều kiện** | Người dùng đã đăng nhập |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Người dùng | Chọn chức năng đăng xuất |
| 2 | Client | Gọi endpoint đăng xuất và xóa JWT/token khỏi storage |
| 3 | Hệ thống | Ghi audit hành động đăng xuất và trả thông báo thành công |
| 4 | Client | Điều hướng người dùng về màn hình đăng nhập hoặc trang public |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Hệ thống | JWT đã hết hạn hoặc không hợp lệ -> client vẫn xóa token cục bộ và coi người dùng đã thoát phiên |

### Hậu điều kiện
Phiên đăng nhập trên client kết thúc. Với JWT stateless v1.0, server không blacklist token; token phía client phải được xóa.

---

## 3.3 Đặc tả Use Case UC03 - Quên mật khẩu - Đặt lại mật khẩu

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC03 |
| **Tên Use case** | Quên mật khẩu - Đặt lại mật khẩu |
| **Tác nhân** | Member, Trainer, Staff, Owner |
| **Tiền điều kiện** | Người dùng có email đã đăng ký trong hệ thống |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Người dùng | Chọn "Quên mật khẩu" và nhập email |
| 2 | Hệ thống | Sinh OTP `purpose='password_reset'`, hash OTP, đặt TTL 10 phút và gửi qua email hoặc log dev placeholder |
| 3 | Người dùng | Nhập email, OTP và mật khẩu mới |
| 4 | Hệ thống | Kiểm tra OTP còn hạn, chưa dùng, khớp với email và mật khẩu mới đạt yêu cầu |
| 5 | Hệ thống | Cập nhật `password_hash`, xóa OTP reset còn hiệu lực của user và ghi audit |
| 6 | Người dùng | Đăng nhập lại bằng mật khẩu mới |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Hệ thống | Email không tồn tại -> vẫn trả thông báo trung tính để tránh dò tài khoản |
| 2b | Hệ thống | Người dùng yêu cầu OTP quá số lần cho phép -> trả thông báo rate limit hoặc thông báo trung tính theo anti-enumeration |
| 4a | Hệ thống | OTP sai, hết hạn hoặc đã dùng -> từ chối đặt lại mật khẩu |
| 4b | Hệ thống | Mật khẩu mới không đủ mạnh -> yêu cầu nhập lại |

### Dữ liệu đầu vào

| Trường | Bắt buộc | Ràng buộc |
|--------|----------|-----------|
| `email` | Có | Đúng định dạng email |
| `otp` | Có khi reset | OTP 6 chữ số, còn hạn |
| `newPassword` | Có khi reset | Tối thiểu 8 ký tự, tuân thủ chính sách mật khẩu |

### Hậu điều kiện
Mật khẩu được cập nhật an toàn, OTP đã dùng bị vô hiệu hóa, người dùng có thể đăng nhập bằng mật khẩu mới.

---

## 3.4 Đặc tả Use Case UC04 - Quản lý hồ sơ và thông tin cá nhân

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC04 |
| **Tên Use case** | Quản lý hồ sơ và thông tin cá nhân |
| **Tác nhân** | Member, Trainer, Staff, Owner |
| **Tiền điều kiện** | Người dùng đã đăng nhập và có profile tương ứng với vai trò |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Người dùng | Mở trang hồ sơ cá nhân |
| 2 | Hệ thống | Hiển thị thông tin tài khoản (`email`, `fullName`, `phone`, avatar, trạng thái) và profile theo vai trò |
| 3 | Người dùng | Chỉnh sửa các trường được phép như họ tên, số điện thoại, địa chỉ, ngày sinh hoặc avatar |
| 4 | Hệ thống | Validate dữ liệu, kiểm tra trùng số điện thoại/email nếu có thay đổi |
| 5 | Hệ thống | Lưu thay đổi vào `users`, `members` hoặc `staff` theo vai trò và ghi audit |
| 6 | Người dùng | Nếu cần, chọn "Đổi mật khẩu", nhập mật khẩu hiện tại và mật khẩu mới |
| 7 | Hệ thống | Xác thực mật khẩu hiện tại, cập nhật `password_hash` mới và ghi audit đổi mật khẩu |

### Phân quyền theo vai trò

| Vai trò | Phạm vi cập nhật |
|---------|------------------|
| Member | Cập nhật hồ sơ cá nhân, địa chỉ, ngày sinh, số điện thoại, avatar; đổi mật khẩu |
| Trainer | Cập nhật thông tin cá nhân của staff/trainer, số điện thoại, avatar; đổi mật khẩu |
| Staff | Cập nhật thông tin cá nhân, số điện thoại, avatar; đổi mật khẩu |
| Owner | Cập nhật hồ sơ owner, số điện thoại, avatar; đổi mật khẩu; có thể cập nhật user/staff khác qua UC15/UC16 |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 4a | Hệ thống | Số điện thoại đã tồn tại hoặc sai định dạng -> thông báo lỗi |
| 5a | Hệ thống | Người dùng cố sửa trường hệ thống như `userId`, `memberCode`, `staffCode`, `status` khi không có quyền -> từ chối |
| 7a | Hệ thống | Mật khẩu hiện tại sai hoặc mật khẩu mới không hợp lệ -> không cập nhật mật khẩu |

### Hậu điều kiện
Thông tin cá nhân được cập nhật trong phạm vi cho phép; dữ liệu định danh hệ thống không bị người dùng tự ý thay đổi.

---

## 3.5 Đặc tả Use Case UC05 - Đăng ký hội viên mới

UC05 có hai luồng: UC05A do Staff đăng ký tại quầy và UC05B do Member tự đăng ký online. Nếu người đăng ký chọn gói tập ngay trong quá trình tạo tài khoản, hệ thống chuyển tiếp sang UC06 để tạo subscription và thanh toán.

### 3.5.1 UC05A - Staff đăng ký tại quầy

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC05A |
| **Tên Use case** | Staff đăng ký hội viên tại quầy |
| **Tác nhân** | Staff |
| **Tiền điều kiện** | Staff đã đăng nhập và có quyền `member.create`; gói tập muốn đăng ký đang `active` nếu đăng ký gói ngay |

#### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Staff | Mở màn hình đăng ký hội viên mới |
| 2 | Staff | Nhập thông tin: họ tên, email, số điện thoại, ngày sinh, địa chỉ và thông tin khởi tạo tài khoản |
| 3 | Hệ thống | Validate dữ liệu, kiểm tra email/phone chưa tồn tại |
| 4 | Hệ thống | Tạo `users` trạng thái `pending_verification`, tạo `members` và sinh `member_code` dạng `MEM-YYYY-XXXXXX` |
| 5 | Hệ thống | Gửi OTP/link xác thực email cho hội viên |
| 6 | Staff | Nếu hội viên mua gói tại quầy, chuyển sang UC06 để tạo subscription và ghi nhận thanh toán |

#### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | Email hoặc số điện thoại đã tồn tại -> từ chối tạo hội viên |
| 4a | Hệ thống | Không sinh được `member_code` sau số lần retry -> báo lỗi hệ thống |
| 6a | Staff | Hội viên chưa chọn gói -> chỉ lưu tài khoản hội viên, trạng thái chưa có subscription active |

#### Hậu điều kiện
Hội viên mới được tạo, có mã hội viên và cần xác thực email trước khi sử dụng đầy đủ dịch vụ.

### 3.5.2 UC05B - Member tự đăng ký online

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC05B |
| **Tên Use case** | Member tự đăng ký online |
| **Tác nhân** | Khách truy cập / Member mới |
| **Tiền điều kiện** | Khách truy cập chưa có tài khoản trùng email/phone trong hệ thống |

#### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Khách truy cập | Mở form đăng ký online |
| 2 | Khách truy cập | Nhập email, mật khẩu, họ tên, số điện thoại, ngày sinh, địa chỉ và có thể chọn gói tập |
| 3 | Hệ thống | Validate dữ liệu, kiểm tra mật khẩu và kiểm tra email/phone chưa tồn tại |
| 4 | Hệ thống | Tạo `users`, `members`, sinh `member_code`, tạo OTP verify email |
| 5 | Hệ thống | Nếu có `packageId`, tạo subscription `pending` theo UC06 và chờ thanh toán/xác thực |
| 6 | Member mới | Xác thực email bằng OTP/link và tiếp tục thanh toán nếu đã chọn gói |

#### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | Dữ liệu không hợp lệ hoặc mật khẩu yếu -> yêu cầu nhập lại |
| 3b | Hệ thống | Email/phone đã tồn tại -> hướng dẫn đăng nhập hoặc quên mật khẩu |
| 5a | Hệ thống | Gói được chọn không tồn tại, inactive hoặc đã soft delete -> không tạo subscription |

#### Hậu điều kiện
Tài khoản hội viên online được tạo. Nếu có chọn gói, subscription ở trạng thái `pending` cho tới khi thanh toán và điều kiện kích hoạt hoàn tất.

---

## 3.6 Đặc tả Use Case UC06 - Đăng ký gói tập mới

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC06 |
| **Tên Use case** | Đăng ký gói tập mới |
| **Tác nhân** | Member, Staff |
| **Tiền điều kiện** | Member tồn tại, tài khoản hợp lệ; gói tập đang `active`; Member không có subscription `active` hoặc `pending` chặn đăng ký mới |

### Điều kiện được phép đăng ký gói mới

| Trường hợp | Mô tả |
|------------|-------|
| Đăng ký hội viên mới | Hội viên vừa được tạo ở UC05 và chưa có gói active |
| Hết hạn chưa gia hạn | Gói cũ đã `expired`, không còn subscription active hoặc pending |
| Sau khi hủy gói | Gói cũ đã `cancelled`, member cần mua lại gói mới |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Member/Staff | Chọn hội viên và gói tập muốn đăng ký |
| 2 | Hệ thống | Hiển thị danh sách gói `packages.status='active'`, giá, thời hạn ngày và quyền lợi |
| 3 | Member/Staff | Xác nhận đăng ký gói mới |
| 4 | Hệ thống | Kiểm tra member không có subscription `active` hoặc `pending`, gói chưa bị xóa và còn active |
| 5 | Hệ thống | Tạo `subscriptions` trạng thái `pending`, tính `startDate`, `endDate` theo `durationDays` |
| 6 | Member/Staff | Thực hiện hoặc ghi nhận thanh toán bằng tiền mặt, thẻ, ví điện tử hoặc tài khoản thanh toán đã lưu |
| 7 | Hệ thống | Khi payment `success`, kích hoạt subscription nếu ngày bắt đầu đã tới; nếu chưa tới ngày bắt đầu thì giữ `pending` cho cron kích hoạt |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 4a | Hệ thống | Member còn gói active hoặc pending -> không cho đăng ký gói mới, gợi ý UC07 gia hạn/hủy theo trạng thái hiện tại |
| 4b | Hệ thống | Gói inactive hoặc deleted -> yêu cầu chọn gói khác |
| 6a | Hệ thống | Thanh toán thất bại hoặc thiếu mã giao dịch khi phương thức không phải tiền mặt -> subscription vẫn pending hoặc bị hủy theo cron nếu quá hạn |
| 7a | Scheduler | Subscription pending chưa thanh toán sau thời gian cấu hình -> tự động hủy pending |

### Hậu điều kiện
Một subscription mới được tạo và liên kết với member. Gói chỉ trở thành `active` sau khi thanh toán thành công và thỏa điều kiện ngày bắt đầu.

---

## 3.7 Đặc tả Use Case UC07 - Gia hạn / Hủy gói tập

UC07 gồm UC07A gia hạn gói tập và UC07B hủy gói tập. Cả Member và Staff đều có thể thực hiện trong phạm vi quyền/ownership tương ứng.

### 3.7.1 UC07A - Gia hạn gói tập

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC07A |
| **Tên Use case** | Gia hạn gói tập |
| **Tác nhân** | Member, Staff |
| **Tiền điều kiện** | Member có subscription hiện tại còn thông tin để gia hạn; gói liên quan chưa bị xóa; người thực hiện có quyền `subscription.create` hoặc là chính member |

#### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Member/Staff | Mở chi tiết gói hiện tại và chọn "Gia hạn" |
| 2 | Hệ thống | Hiển thị thông tin gói, ngày kết thúc hiện tại, giá và phương thức thanh toán |
| 3 | Member/Staff | Xác nhận gia hạn và chọn phương thức thanh toán |
| 4 | Hệ thống | Tạo subscription mới nối tiếp sau `endDate` của subscription hiện tại, trạng thái `pending` |
| 5 | Member/Staff | Hoàn tất thanh toán |
| 6 | Hệ thống | Ghi payment; subscription mới được active khi tới `startDate` hoặc khi gói cũ không còn chiếm slot active |

#### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 4a | Hệ thống | Subscription gốc không tồn tại hoặc đã bị xóa -> báo lỗi |
| 4b | Hệ thống | Đã có subscription pending cho lần gia hạn -> không tạo trùng |
| 5a | Hệ thống | Payment thất bại -> giữ pending hoặc hủy theo quy trình unpaid pending |

#### Hậu điều kiện
Subscription gia hạn được tạo, lịch sử gói của member thể hiện cả gói hiện tại và gói nối tiếp.

### 3.7.2 UC07B - Hủy gói tập

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC07B |
| **Tên Use case** | Hủy gói tập |
| **Tác nhân** | Member, Staff |
| **Tiền điều kiện** | Subscription cần hủy đang `active` hoặc `pending`; người thực hiện có quyền hoặc là chính member |

#### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Member/Staff | Mở gói hiện tại hoặc gói pending và chọn "Hủy gói" |
| 2 | Hệ thống | Hiển thị cảnh báo về việc không hoàn tiền trong v1.0 và yêu cầu xác nhận |
| 3 | Member/Staff | Nhập lý do hủy nếu có và xác nhận |
| 4 | Hệ thống | Cập nhật `subscriptions.status='cancelled'`, ghi `cancelledAt` và audit |
| 5 | Hệ thống | Nếu tồn tại subscription pending đã thanh toán và đủ điều kiện cascade, kích hoạt subscription kế tiếp theo rule hiện hành |

#### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Người dùng | Không xác nhận -> không thay đổi dữ liệu |
| 4a | Hệ thống | Subscription đã `expired` hoặc `cancelled` -> không cho hủy lại |
| 5a | Hệ thống | Không có subscription pending kế tiếp -> member chuyển sang trạng thái không có gói active |

#### Hậu điều kiện
Gói bị hủy không còn cho phép check-in hoặc đặt lịch mới. Member có thể đăng ký gói mới theo UC06.

---

## 3.8 Đặc tả Use Case UC08 - Xem gói tập hiện tại và lịch sử

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC08 |
| **Tên Use case** | Xem gói tập hiện tại và lịch sử |
| **Tác nhân** | Member |
| **Tiền điều kiện** | Member đã đăng nhập và có profile hội viên |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Member | Mở trang "Gói tập hiện tại" |
| 2 | Hệ thống | Truy vấn subscription `active` hoặc `pending` của chính member và hiển thị gói, ngày bắt đầu, ngày kết thúc, trạng thái thanh toán |
| 3 | Member | Mở trang "Lịch sử gói tập" |
| 4 | Hệ thống | Hiển thị danh sách subscription theo thời gian gồm `pending`, `active`, `expired`, `cancelled` và các payment liên quan |
| 5 | Member | Chọn một bản ghi để xem chi tiết gói, hóa đơn/thanh toán và trạng thái |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Hệ thống | Không có gói active/pending -> hiển thị trạng thái chưa có gói và gợi ý đăng ký UC06 |
| 4a | Hệ thống | Lịch sử rỗng -> hiển thị empty state |
| 5a | Hệ thống | Member cố xem subscription của người khác -> từ chối theo ownership guard |

### Hậu điều kiện
Member nắm được trạng thái gói hiện tại, ngày hết hạn, lịch sử đăng ký và thanh toán của chính mình.

---

## 3.9 Đặc tả Use Case UC09 - Quản lý hội viên

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC09 |
| **Tên Use case** | Quản lý hội viên |
| **Tác nhân** | Staff |
| **Tiền điều kiện** | Staff đã đăng nhập và có quyền `member.read`, `member.update` hoặc `member.delete` tùy thao tác |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Staff | Mở màn hình quản lý hội viên |
| 2 | Hệ thống | Hiển thị danh sách hội viên có phân trang, tìm kiếm theo mã hội viên, họ tên, email, số điện thoại và filter trạng thái |
| 3 | Staff | Chọn một hội viên để xem chi tiết hồ sơ, gói tập, trainer phụ trách, lịch sử thanh toán và tiến độ liên quan |
| 4 | Staff | Cập nhật thông tin cho phép như họ tên, phone, địa chỉ, ngày sinh hoặc gán trainer |
| 5 | Hệ thống | Validate dữ liệu, cập nhật `users`, `members`, `primary_trainer_id` nếu có và ghi audit |
| 6 | Staff | Khi cần, xóa/ngưng hoạt động hội viên theo quy trình soft delete |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Hệ thống | Không tìm thấy hội viên -> hiển thị danh sách rỗng |
| 4a | Hệ thống | Phone/email trùng hoặc trainer không tồn tại/không phải trainer -> báo lỗi |
| 6a | Hệ thống | Hội viên có dữ liệu lịch sử -> soft delete `members`/`users`, giữ audit và lịch sử cần thiết |

### Hậu điều kiện
Thông tin hội viên được quản lý tập trung, Staff có thể hỗ trợ đăng ký/gia hạn, gán trainer và xử lý hồ sơ tại quầy.

---

## 3.10 Đặc tả Use Case UC10 - Quản lý giáo án / workout plan

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC10 |
| **Tên Use case** | Quản lý giáo án / workout plan |
| **Tác nhân** | Trainer |
| **Tiền điều kiện** | Trainer đã đăng nhập, có quyền workout plan; member đích thuộc phạm vi quản lý hoặc được phép gán |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Trainer | Mở module Workout Plan và tạo plan mới |
| 2 | Trainer | Nhập tên, mô tả, thêm ngày tập, thêm bài tập từ thư viện và thiết lập target sets/reps/weight/duration/rest |
| 3 | Hệ thống | Lưu plan ở trạng thái `draft` hoặc `active` tùy thao tác |
| 4 | Trainer | Chọn member cụ thể và gán workout plan với `startDate` và ghi chú |
| 5 | Hệ thống | Kiểm tra plan có ít nhất một ngày tập, bài tập hợp lệ và member tồn tại |
| 6 | Hệ thống | Tạo `member_workout_plans` active; assignment cũ của member chuyển sang `replaced` nếu cần |
| 7 | Trainer | Quản lý plan sau khi tạo: xem, sửa metadata, ngày tập, bài tập hoặc gỡ assignment khi còn được phép |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Trainer | Không tìm thấy bài tập phù hợp -> tạo/import bài tập mới nếu có quyền |
| 5a | Hệ thống | Plan chưa active hoặc chưa có ngày tập -> không cho gán |
| 6a | Hệ thống | Member không thuộc phạm vi trainer quản lý -> từ chối theo ownership/permission |
| 7a | Hệ thống | Plan đã có workout log thực tế -> hạn chế sửa/xóa cấu trúc để bảo toàn lịch sử |

### Hậu điều kiện
Workout plan được lưu và có thể được gán cho member. Member nhìn thấy plan được giao trên dashboard/lịch tập của mình.

---

## 3.11 Đặc tả Use Case UC11 - Quản lý buổi tập / lịch tập

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC11 |
| **Tên Use case** | Quản lý buổi tập / lịch tập |
| **Tác nhân** | Trainer |
| **Tiền điều kiện** | Trainer đã đăng nhập; member có subscription active tại thời điểm buổi tập; member đã được gán workout plan phù hợp |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Trainer | Mở lịch tập và chọn member mình phụ trách |
| 2 | Hệ thống | Hiển thị workout plan assignment active và các ngày tập có thể lên lịch |
| 3 | Trainer | Chọn `assignmentId`, `planDayId`, phòng tập, `startTime`, `endTime` |
| 4 | Hệ thống | Validate thời gian, phòng, trainer không overlap và member có gói active tại ngày tập |
| 5 | Hệ thống | Tạo `training_sessions` trạng thái `scheduled` |
| 6 | Trainer | Cập nhật lịch, đổi phòng/giờ hoặc hủy buổi tập trong khung thời gian cho phép |
| 7 | Trainer | Khi buổi tập diễn ra, cập nhật trạng thái `in_progress` hoặc `completed` nếu cần |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Hệ thống | Member chưa có workout plan active -> yêu cầu gán plan trước theo UC10 |
| 4a | Hệ thống | Phòng hoặc trainer bị trùng lịch -> báo lỗi và gợi ý chọn slot khác |
| 4b | Hệ thống | Member không có subscription active tại ngày tập -> yêu cầu đăng ký/gia hạn gói trước |
| 6a | Hệ thống | Buổi tập đã bắt đầu hoặc hết hạn hủy -> không cho đổi/hủy theo rule |

### Hậu điều kiện
Lịch tập của member và trainer được cập nhật, buổi tập liên kết với workout plan cụ thể để member có thể theo dõi và ghi nhận kết quả.

---

## 3.12 Đặc tả Use Case UC12 - Theo dõi và ghi nhận buổi tập

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC12 |
| **Tên Use case** | Theo dõi và ghi nhận buổi tập |
| **Tác nhân** | Member |
| **Tiền điều kiện** | Member đã đăng nhập; có subscription active khi check-in/đặt lịch; có workout plan assignment active khi ghi workout log |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Member | Mở lịch tập để xem các buổi `scheduled`, `in_progress`, `completed`, `cancelled` |
| 2 | Member | Đến phòng tập và check-in bằng QR/thẻ hoặc nhờ Staff check-in thủ công |
| 3 | Hệ thống/Thiết bị | Ghi `attendance_logs`, kiểm tra member có subscription active và không có attendance đang mở |
| 4 | Member | Sau buổi tập, mở workout plan/ngày tập được giao và nhập kết quả từng bài tập, thời lượng, ghi chú |
| 5 | Hệ thống | Lưu `workout_logs` và `workout_log_sets` theo assignment/day hợp lệ |
| 6 | Member | Xem lịch sử buổi tập, attendance và kết quả workout gần đây |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | Không có subscription active -> từ chối check-in và hướng dẫn đăng ký/gia hạn gói |
| 3b | Hệ thống | Đã có attendance log đang mở -> không mở thêm log trùng |
| 4a | Hệ thống | Member chưa có plan active -> hiển thị empty state, gợi ý liên hệ trainer hoặc tự tạo plan nếu được phép |
| 5a | Member | Sửa workout log trong cửa sổ 24 giờ; sau thời hạn hệ thống từ chối sửa |

### Hậu điều kiện
Attendance và workout log của member được ghi nhận. Trainer/Owner có thể dùng dữ liệu này để theo dõi tiến độ và báo cáo hiệu suất.

---

## 3.13 Đặc tả Use Case UC13 - Gửi phản hồi

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC13 |
| **Tên Use case** | Gửi phản hồi |
| **Tác nhân** | Member |
| **Tiền điều kiện** | Member đã đăng nhập và có profile hội viên |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Member | Mở màn hình gửi phản hồi |
| 2 | Hệ thống | Hiển thị form gồm loại phản hồi `service`, `staff`, `equipment`, mức độ `low`, `medium`, `high` và nội dung |
| 3 | Member | Nhập nội dung, chọn đối tượng liên quan nếu phản hồi về nhân viên hoặc thiết bị |
| 4 | Hệ thống | Validate type-subject, kiểm tra đối tượng tham chiếu tồn tại |
| 5 | Hệ thống | Tạo `feedback` trạng thái `open`, lưu severity và thời điểm tạo |
| 6 | Member | Xem phản hồi trong danh sách "Phản hồi của tôi" |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 4a | Hệ thống | Nội dung rỗng hoặc loại phản hồi không khớp đối tượng -> báo lỗi |
| 4b | Hệ thống | Member cố tạo phản hồi cho hội viên khác -> từ chối theo ownership |
| 6a | Member | Xóa phản hồi của chính mình nếu còn trong phạm vi được phép |

### Hậu điều kiện
Feedback được ghi nhận và sẵn sàng cho Staff xử lý. Member có thể theo dõi trạng thái xử lý.

---

## 3.14 Đặc tả Use Case UC14 - Xử lý phản hồi

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC14 |
| **Tên Use case** | Xử lý phản hồi |
| **Tác nhân** | Staff |
| **Tiền điều kiện** | Staff đã đăng nhập và có quyền `feedback.read`, `feedback.handle` |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Staff | Mở danh sách phản hồi với filter theo type, severity, status, overdue, người xử lý hoặc đối tượng liên quan |
| 2 | Hệ thống | Hiển thị feedback, SLA badge và chi tiết member/đối tượng liên quan |
| 3 | Staff | Nhận xử lý hoặc gán phản hồi cho nhân viên phụ trách |
| 4 | Staff | Cập nhật trạng thái `in_progress` khi bắt đầu xử lý |
| 5 | Staff | Nhập ghi chú kết quả và chuyển trạng thái `resolved` hoặc `rejected` |
| 6 | Hệ thống | Lưu trạng thái mới, `handledByStaffId`, `handledAt`, ghi audit và cập nhật SLA |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | Feedback đã đóng hoặc đã được gán -> không cho gán trùng |
| 5a | Hệ thống | Thiếu `resolutionNote` khi resolved/rejected -> yêu cầu nhập ghi chú |
| 5b | Hệ thống | Chuyển trạng thái không hợp lệ -> từ chối theo state machine |

### Hậu điều kiện
Phản hồi được phân công và xử lý có trạng thái rõ ràng. Dữ liệu phản hồi có thể dùng cho báo cáo chất lượng dịch vụ và đánh giá nhân sự.

---

## 3.15 Đặc tả Use Case UC15 - Quản lý nhân sự

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC15 |
| **Tên Use case** | Quản lý nhân sự |
| **Tác nhân** | Owner |
| **Tiền điều kiện** | Owner đã đăng nhập và có quyền quản lý nhân sự |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Owner | Mở module quản lý nhân sự |
| 2 | Hệ thống | Hiển thị danh sách staff/trainer có phân trang, tìm kiếm, filter vị trí và trạng thái |
| 3 | Owner | Tạo nhân sự mới với email, họ tên, phone, position và group quyền ban đầu |
| 4 | Hệ thống | Tạo `users` trạng thái `pending_verification`, tạo `staff`, sinh `staff_code` và gửi invite/OTP |
| 5 | Owner | Cập nhật thông tin nhân sự, position hoặc nhóm quyền khi cần |
| 6 | Owner | Tạo/xóa lịch làm việc theo ca (`morning`, `afternoon`, `evening`) và ngày làm việc |
| 7 | Owner | Xóa/ngưng hoạt động nhân sự theo chính sách soft delete hoặc quy ước hiện hành của service |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | Email đã tồn tại hoặc groupId không tồn tại -> từ chối tạo |
| 6a | Hệ thống | Trùng lịch `(staffId, shift, workDate)` -> rollback batch lịch làm việc |
| 7a | Hệ thống | Nhân sự đã bị xóa hoặc thao tác ảnh hưởng owner cuối cùng -> từ chối theo ràng buộc bảo toàn quyền quản trị |

### Hậu điều kiện
Nhân sự, lịch làm việc và tài khoản liên quan được cập nhật. Nhân sự mới cần xác thực email trước khi đăng nhập.

---

## 3.16 Đặc tả Use Case UC16 - Quản lý phân quyền người dùng

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC16 |
| **Tên Use case** | Quản lý phân quyền người dùng |
| **Tác nhân** | Owner |
| **Tiền điều kiện** | Owner đã đăng nhập và có quyền `rbac.manage`, `user.read`, `user.update` theo thao tác |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Owner | Mở module RBAC/Users |
| 2 | Hệ thống | Hiển thị danh mục permission, group hệ thống (`owner`, `staff`, `trainer`, `member`) và group tùy chỉnh |
| 3 | Owner | Tạo hoặc cập nhật group tùy chỉnh, mô tả và bộ permission |
| 4 | Hệ thống | Validate tên group, permission code và lưu `groups`, `group_permissions` |
| 5 | Owner | Xem danh sách users và gán/gỡ group cho từng user |
| 6 | Hệ thống | Cập nhật `user_groups`, đảm bảo user vẫn còn ít nhất một group |
| 7 | Owner | Cập nhật trạng thái user hoặc soft delete user nếu cần và được phép |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | Tên group trùng hoặc sai format -> báo lỗi |
| 4a | Hệ thống | Permission code không tồn tại -> từ chối lưu |
| 5a | Hệ thống | Gỡ group cuối cùng của user -> từ chối với `USER_NEEDS_AT_LEAST_ONE_GROUP` |
| 7a | Hệ thống | User tự xóa chính mình hoặc xóa owner cuối cùng -> từ chối |

### Hậu điều kiện
Quyền truy cập của người dùng được cập nhật theo nhóm quyền. Các thay đổi nhạy cảm được ghi audit.

---

## 3.17 Đặc tả Use Case UC17 - Quản lý phòng tập

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC17 |
| **Tên Use case** | Quản lý phòng tập |
| **Tác nhân** | Owner, Staff |
| **Tiền điều kiện** | Người thực hiện đã đăng nhập và có quyền `room.manage` |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Owner/Staff | Mở chức năng quản lý phòng tập |
| 2 | Hệ thống | Hiển thị danh sách phòng với mã phòng, tên, loại phòng, sức chứa, mô tả và thống kê liên quan |
| 3 | Owner/Staff | Tạo phòng mới hoặc cập nhật thông tin phòng hiện có |
| 4 | Hệ thống | Validate `roomCode`, tên, sức chứa; auto-generate mã `RM-XXX` nếu cần |
| 5 | Owner/Staff | Xóa phòng khi không còn sử dụng |
| 6 | Hệ thống | Kiểm tra ràng buộc thiết bị và buổi tập đang/ sắp diễn ra trước khi hard delete |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 4a | Hệ thống | Mã phòng trùng, sức chứa không hợp lệ hoặc body rỗng -> báo lỗi |
| 6a | Hệ thống | Phòng còn thiết bị hoặc session chưa kết thúc -> không cho xóa |
| 6b | Owner/Staff | Hủy xác nhận xóa -> không thay đổi dữ liệu |

### Hậu điều kiện
Danh sách phòng tập được cập nhật. Phòng hợp lệ có thể được dùng khi gán thiết bị hoặc lập lịch buổi tập.

---

## 3.18 Đặc tả Use Case UC18 - Quản lý thiết bị và bảo trì

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC18 |
| **Tên Use case** | Quản lý thiết bị và bảo trì |
| **Tác nhân** | Owner, Staff, Technician |
| **Tiền điều kiện** | Người thực hiện đã đăng nhập; có quyền `equipment.manage`, `maintenance.report`, `maintenance.resolve` theo thao tác |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Owner/Staff | Mở danh sách thiết bị, filter theo phòng, trạng thái, bảo hành, tìm kiếm theo mã/tên |
| 2 | Owner/Staff | Thêm thiết bị mới với phòng, tên, ngày nhập, ngày bảo hành |
| 3 | Hệ thống | Sinh `equipmentCode`, validate ngày nhập/bảo hành, lưu thiết bị trạng thái `active` |
| 4 | Owner/Staff | Khi phát hiện hỏng, tạo maintenance log với mô tả sự cố |
| 5 | Hệ thống | Tạo `maintenance_logs.status='reported'` và chuyển thiết bị sang `broken` |
| 6 | Technician | Chuyển log sang `repairing` khi bắt đầu sửa |
| 7 | Technician | Kết thúc bảo trì bằng `resolved` để thiết bị về `active`, hoặc `failed` để thiết bị chuyển `retired` |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | `warrantyUntil < importDate` hoặc `importDate` ở tương lai -> báo lỗi |
| 4a | Hệ thống | Thiết bị đã có maintenance log mở -> không tạo log mới |
| 7a | Hệ thống | Chuyển trạng thái bảo trì sai thứ tự hoặc log đã đóng -> từ chối |
| 7b | Owner | Force delete thiết bị chỉ khi thỏa quyền và hiểu rằng lịch sử maintenance có thể mất vĩnh viễn |

### Hậu điều kiện
Trạng thái thiết bị và nhật ký bảo trì phản ánh đúng vòng đời `active`, `broken`, `repairing`, `active/retired`.

---

## 3.19 Đặc tả Use Case UC19 - Quản lý gói tập

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC19 |
| **Tên Use case** | Quản lý gói tập |
| **Tác nhân** | Owner |
| **Tiền điều kiện** | Owner đã đăng nhập và có quyền `package.manage` |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Owner | Mở module quản lý gói tập |
| 2 | Hệ thống | Hiển thị danh sách gói, filter trạng thái, thời hạn, giá, tìm kiếm theo tên/mã gói |
| 3 | Owner | Tạo gói mới với tên, thời hạn ngày, giá VND, quyền lợi, cờ `includesPt` nếu có |
| 4 | Hệ thống | Validate `durationDays`, `price`, sinh `packageCode` nếu cần và lưu trạng thái `active`/`inactive` |
| 5 | Owner | Cập nhật metadata gói, bật/tắt trạng thái active/inactive hoặc xóa mềm gói |
| 6 | Hệ thống | Kiểm tra subscription đang `active` hoặc `pending` trước khi đổi giá/thời hạn hoặc xóa mềm |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 4a | Hệ thống | Giá không hợp lệ, thời hạn ngoài khoảng cho phép, mã gói trùng -> báo lỗi |
| 5a | Hệ thống | Gói inactive không hiển thị cho member đăng ký mới nhưng subscription cũ vẫn chạy tới hết hạn |
| 6a | Hệ thống | Gói còn subscription active/pending -> chặn xóa hoặc chặn sửa giá/thời hạn |

### Hậu điều kiện
Danh mục gói tập được cập nhật. Chỉ gói `active`, chưa soft delete mới hiển thị cho đăng ký mới.

---

## 3.20 Đặc tả Use Case UC20 - Báo cáo thống kê

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC20 |
| **Tên Use case** | Báo cáo thống kê |
| **Tác nhân** | Owner |
| **Tiền điều kiện** | Owner đã đăng nhập và có quyền `report.view` |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Owner | Mở trang báo cáo thống kê |
| 2 | Owner | Chọn loại báo cáo, khoảng ngày `from`, `to` và bộ lọc bổ sung nếu có |
| 3 | Hệ thống | Validate khoảng ngày, không cho `from > to` hoặc `to` vượt quá ngày hiện tại |
| 4 | Hệ thống | Truy vấn dữ liệu và tính toán báo cáo theo loại được chọn |
| 5 | Hệ thống | Hiển thị biểu đồ, bảng số liệu và tổng hợp chính |
| 6 | Owner | Xuất báo cáo PDF/Excel/CSV nếu chức năng export được bật |

### Danh sách báo cáo chính

| Báo cáo | Dữ liệu / công thức chính |
|---------|----------------------------|
| Doanh thu | Tổng `payments.amount` với `status='success'` trong khoảng ngày, breakdown theo ngày và phương thức |
| Hội viên mới | Số `members` tạo mới trong khoảng ngày, loại trừ soft-deleted |
| Tỷ lệ gia hạn | `renewed / eligible`, trong đó eligible là member có gói hết hạn trong range |
| Gói bán chạy | Số subscription theo từng package và doanh thu tương ứng |
| Hiệu suất trainer/staff | Số session completed, giờ dạy/làm việc và dữ liệu feedback liên quan |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 3a | Hệ thống | Khoảng ngày sai định dạng hoặc vượt ngày hiện tại -> báo lỗi |
| 4a | Hệ thống | Không có dữ liệu -> hiển thị trạng thái rỗng thay vì lỗi |
| 4b | Hệ thống | Lỗi aggregation DB -> log chi tiết server-side và hiển thị thông báo chung |

### Hậu điều kiện
Owner có dữ liệu tổng hợp để theo dõi doanh thu, tăng trưởng hội viên, tình hình gia hạn và hiệu quả vận hành.

---

## 3.21 Đặc tả Use Case UC21 - Đánh giá hiệu suất nhân viên

| Thông tin | Chi tiết |
|-----------|----------|
| **Mã Use case** | UC21 |
| **Tên Use case** | Đánh giá hiệu suất nhân viên |
| **Tác nhân** | Owner |
| **Tiền điều kiện** | Owner đã đăng nhập; có dữ liệu nhân sự, lịch làm việc, buổi tập, attendance hoặc feedback trong khoảng đánh giá |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 1 | Owner | Mở trang đánh giá hiệu suất nhân viên |
| 2 | Owner | Chọn khoảng ngày và nhân viên hoặc xem toàn bộ danh sách |
| 3 | Hệ thống | Tổng hợp dữ liệu theo nhân viên: số buổi tập completed, tổng giờ, lịch làm việc, attendance và phản hồi liên quan |
| 4 | Hệ thống | Sắp xếp/ranking nhân viên theo KPI mặc định hoặc bộ lọc owner chọn |
| 5 | Owner | Mở chi tiết một nhân viên để xem breakdown theo ngày, session, feedback và thông tin liên quan |
| 6 | Owner | Ghi nhận kết quả đánh giá ngoài hệ thống hoặc dùng dữ liệu để ra quyết định phân ca, khen thưởng, đào tạo |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|-----|---------------|-----------|
| 2a | Hệ thống | Khoảng ngày không hợp lệ -> yêu cầu chọn lại |
| 3a | Hệ thống | Nhân viên đã soft delete hoặc không có dữ liệu trong range -> hiển thị thông báo không có dữ liệu |
| 5a | Hệ thống | StaffId không tồn tại -> báo lỗi không tìm thấy |

### Hậu điều kiện
Owner có cái nhìn chi tiết về hiệu suất từng nhân viên/trainer, phục vụ quản trị vận hành và cải thiện chất lượng dịch vụ.

---