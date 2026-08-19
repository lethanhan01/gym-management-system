# HƯỚNG DẪN VẬN HÀNH & TRIỂN KHAI: LINE RICH MENU & LIFF PT BOOKING

- **Tài liệu:** Sổ tay vận hành hệ thống đặt lịch PT qua LINE Official Account (Runbook)
- **Hệ thống:** Gym Management System (RoGym)
- **Phiên bản:** 1.0.0
- **Ngày phát hành:** 19/08/2026

---

## 1. TỔNG QUAN KIẾN TRÚC & CÁC VÙNG CHẠM (TAP ZONES)

Hệ thống cung cấp trải nghiệm đặt lịch và tương tác hội viên thông qua **LINE Rich Menu** cố định ở đáy màn hình chat LINE OA và ứng dụng web **LIFF (LINE Front-end Framework)**.

### 1.1. Cấu trúc Rich Menu (2500 x 843 px)

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│                 │                 │                 │                 │
│     LỊCH TẬP    │   ĐẶT LỊCH PT   │     CHECK-IN    │      HỒ SƠ      │
│                 │                 │                 │                 │
│    (Calendar)   │   (Calendar+)   │    (Scan QR)    │     (Profile)   │
│                 │                 │                 │                 │
│   Zone 1 (0px)  │  Zone 2 (625px) │ Zone 3 (1250px) │ Zone 4 (1875px) │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
 <─── 625 px ────><─── 625 px ────><─── 625 px ────><─── 625 px ────>
 <───────────────────────────── 2500 px ─────────────────────────────>
```

### 1.2. Bảng ánh xạ Canonical URLs

| Vùng (Zone) | Tọa độ (x, y, w, h) | Canonical URI Action | Đích đến & Hành vi trải nghiệm |
| :--- | :--- | :--- | :--- |
| **1. Lịch tập** | `0, 0, 625, 843` | `https://liff.line.me/<LIFF_ID>?redirect=/member/workout/sessions` | Mở trang Lịch tập (`WorkoutSchedulePage`), xem Calendar buổi tập sắp tới. |
| **2. Đặt lịch** | `625, 0, 625, 843` | `https://liff.line.me/<LIFF_ID>?redirect=%2Fmember%2Fworkout%2Fsessions%3Fbook%3D1` | Tự động bung modal Đặt lịch (`BookPtSessionModal`) với PT phụ trách. |
| **3. Check-in** | `1250, 0, 625, 843` | `https://liff.line.me/<LIFF_ID>?redirect=/member/check-in` | Mở trang QR Check-in (`CheckInPage`) sẵn sàng quét mã camera vào phòng tập. |
| **4. Hồ sơ** | `1875, 0, 625, 843` | `https://liff.line.me/<LIFF_ID>?redirect=/member/profile` | Mở trang Thông tin cá nhân, xem chi tiết gói tập & PT. |

### 1.3. Nguyên lý Duy trì trạng thái Persistent Rich Menu khi gửi Push Message
 Trên LINE Platform thật, việc gửi **Push Message / Flex Message** không làm ẩn hay mất Rich Menu khi menu được thiết lập làm Default Rich Menu (`/user/all/richmenu/{richMenuId}`) với thuộc tính `selected: true`.
- **Cơ chế hoạt động:**
  - Tin nhắn Push/Flex mới sẽ xuất hiện trôi ở dòng thời gian phía trên.
  - Rich Menu 4 vùng vẫn ghim cố định ở chân ứng dụng LINE di động.
  - Người dùng có thể nhấn nút Chat Bar ở góc dưới ("Mở menu RoGym" / "Thu gọn menu") để mở/xếp gọn Rich Menu để nhường chỗ cho bàn phím nhắn tin.

---

## 2. CẤU HÌNH TRÊN LINE DEVELOPERS CONSOLE

### 2.1. Messaging API Channel
1. Truy cập [LINE Developers Console](https://developers.line.biz/).
2. Chọn **Messaging API Channel** của RoGym.
3. Trong tab **Messaging API**:
   - **Webhook URL:** Điền URL công khai của backend: `https://<your-domain>/api/v1/line/webhook`
   - **Use webhook:** Bật `Enabled`.
   - **Auto-reply messages:** Tắt `Disabled` trên LINE Official Account Manager để bot tự xử lý.
   - **Channel access token (long-lived):** Nhấn *Issue* và copy token vào file `server/.env`.
4. Trong tab **Basic settings**:
   - Copy `Channel ID` và `Channel secret` vào file `server/.env`.

### 2.2. LINE Front-end Framework (LIFF) App
1. Chuyển sang tab **LIFF** trên Channel Console và nhấn **Add**.
2. Thiết lập thông số:
   - **LIFF app name:** `RoGym Member App`
   - **Size:** `Full` (toàn màn hình webview trên di động)
   - **Endpoint URL:** `https://<your-frontend-domain>/liff`
   - **Scopes:** Bật `profile` và `openid`.
   - **Bot link feature:** Chọn `Normal` (hoặc `Aggressive` nếu muốn nhắc follow OA).
3. Copy **LIFF ID** (dạng `xxxxxxx-xxxxxxx`) vào cả `client/.env` (`VITE_LIFF_ID`) và `server/.env` (`LINE_LIFF_ID` / `LINE_LIFF_URL`).

---

## 3. CẤU HÌNH BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

### 3.1. Backend (`server/.env`)
```env
# Database & Auth
DATABASE_URL="postgresql://user:password@localhost:5432/gym_db?schema=public"
JWT_SECRET="your-secure-jwt-secret"

# LINE Messaging & LIFF Configuration
LINE_MESSAGING_ENABLED="true"
LINE_MOCK_ENABLED="false"
LINE_CHANNEL_ID="<YOUR_LINE_CHANNEL_ID>"
LINE_CHANNEL_SECRET="<YOUR_LINE_CHANNEL_SECRET>"
LINE_CHANNEL_ACCESS_TOKEN="<YOUR_LINE_CHANNEL_ACCESS_TOKEN>"
LINE_LIFF_URL="https://liff.line.me/<YOUR_LIFF_ID>"
LINE_MESSAGE_LOCALE="vi" # 'vi' hoặc 'ja'
LINE_REMINDER_MINUTES="30"
```

### 3.2. Frontend (`client/.env`)
```env
VITE_API_URL="https://<your-domain>/api/v1"
VITE_LIFF_ID="<YOUR_LIFF_ID>"
VITE_LIFF_MOCK="false"
```

---

## 4. QUY TRÌNH ĐỒNG BỘ RICH MENU LÊN LINE (AUTOMATION)

Hệ thống đã tích hợp sẵn script tự động hóa TypeScript để đồng bộ Rich Menu lên LINE Messaging API.

### 4.1. Kiểm tra trước khi đồng bộ (Dry Run)
Chạy lệnh dry-run để kiểm tra cấu hình và định dạng JSON payload mà không gửi request ra ngoài (mặc định ngôn ngữ tiếng Nhật `ja`):

```powershell
cd server
# Mặc định tiếng Nhật (ja)
npm run line:sync-rich-menu -- --dry-run

# Tùy chọn tiếng Nhật hoặc tiếng Việt
npm run line:sync-rich-menu -- --dry-run --locale ja
npm run line:sync-rich-menu -- --dry-run --locale vi
```

### 4.2. Đồng bộ Menu & Upload ảnh lên LINE thật
Chạy lệnh đồng bộ chính thức:

```powershell
cd server
# Đồng bộ Rich Menu tiếng Nhật làm mặc định
npm run line:sync-rich-menu -- --locale ja
```

Script sẽ tự động thực hiện 3 bước:
1. `POST https://api.line.me/v2/bot/richmenu` -> Khởi tạo menu 4 zones với nhãn tiếng Nhật (`RoGymメニュー`, `スケジュール`, `PT予約`, `チェックイン`, `マイページ`).
2. `POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content` -> Upload ảnh Rich Menu chuẩn (`docs/assets/line/rich-menu-template-ja.png` hoặc file tùy chọn với cờ `--image <path>`).
3. `POST https://api.line.me/v2/bot/user/all/richmenu/{richMenuId}` -> Kích hoạt menu làm mặc định cho tất cả follower của Official Account.

---

## 5. BẢNG MÃ LỖI NGHIỆP VỤ & PHẢN HỒI UX (BR-01 -> BR-10)

| Mã lỗi HTTP & Code | Tình huống phát sinh | Hành vi người dùng / Giao diện |
| :--- | :--- | :--- |
| `400 NO_PRIMARY_TRAINER` | Hội viên chưa được gán PT phụ trách | Modal hiển thị cảnh báo màu vàng, vô hiệu hóa chọn slot và hướng dẫn liên hệ lễ tân chọn PT. |
| `400 INVALID_DURATION` | Thời lượng buổi tập khác 60 phút | Hệ thống khóa cố định khung giờ 60 phút/buổi. |
| `400 INVALID_BOOKING_TIME` | Đặt lịch trước < 5 phút hoặc vượt quá 7 ngày | Thông báo thời gian đặt lịch nằm ngoài khoảng cho phép (5 phút - 7 ngày). |
| `400 BOOKING_LIMIT_EXCEEDED` | Đã có >= 3 lịch hẹn đang chờ | Toast cảnh báo hội viên đã đạt hạn mức tối đa 3 lịch hẹn đang chờ. |
| `400 LATE_CANCELLATION` | Hội viên bấm hủy lịch khi < 2 giờ trước giờ tập | Giao diện ẩn nút Hủy, hiển thị cảnh báo: *"Buổi tập diễn ra trong vòng 2 giờ tới. Vui lòng liên hệ trực tiếp PT để được hỗ trợ."* |
| `409 MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION` | Hội viên chưa có gói tập `active` vào ngày tập | Modal hiển thị hộp thoại hướng dẫn gia hạn kèm nút CTA dẫn thẳng sang trang Gói tập (`/member/membership`). |
| `409 TRAINER_TIME_OVERLAP` | PT bị trùng lịch (Race condition do 2 user đặt cùng lúc) | Toast thông báo: *"Khung giờ này vừa được đặt bởi người khác"* và tự động làm mới lại danh sách slot trống. |
| `409 MEMBER_TIME_OVERLAP` | Hội viên trùng lịch tập khác trong khung giờ | Toast thông báo hội viên đã có buổi tập khác trong khung giờ này. |
| `409 NO_ROOM_AVAILABLE` | Toàn bộ phòng tập đều kín chỗ trong khung giờ đó | Toast thông báo: *"Không còn phòng tập trống trong khung giờ này"*. |

---

## 6. KỊCH BẢN KIỂM THỬ NGHIỆM THU (SMOKE TEST CHECKLIST)

Dành cho Đội ngũ QA / Vận hành kiểm thử trên môi trường Staging và thiết bị di động thật:

- [ ] **1. Xác thực Rich Menu hiển thị:** Mở ứng dụng LINE, vào chat của RoGym OA, kiểm tra Rich Menu 4 vùng hiển thị rõ ràng, sắc nét.
- [ ] **2. Kiểm tra Zone 1 (Lịch tập):** Bấm "LỊCH TẬP" -> Mở LIFF webview tại `/member/workout/sessions`, hiển thị đúng lịch tập và danh sách buổi tập.
- [ ] **3. Kiểm tra Zone 2 (Đặt lịch):** Bấm "ĐẶT LỊCH PT" -> Mở LIFF kèm tham số `?book=1`, modal đặt lịch tự động mở. Chọn 1 slot trống trong 7 ngày tới -> Bấm Xác nhận. Buổi tập được tạo ngay lập tức (`201 Created`).
- [ ] **4. Kiểm tra LINE Push Message:** Ngay sau khi đặt lịch, hội viên nhận được tin nhắn LINE Push thông báo chi tiết (thời gian, PT, phòng tập) kèm nút QuickReply "Xem chi tiết". Bấm nút QuickReply -> Mở đúng chi tiết buổi tập đó.
- [ ] **5. Kiểm tra Zone 3 (Check-in):** Bấm "CHECK-IN" -> Mở trang `/member/attendance` hiển thị mã QR hội viên để quét tại phòng tập.
- [ ] **6. Kiểm tra Zone 4 (Hồ sơ):** Bấm "HỒ SƠ" -> Mở trang `/member/profile` hiển thị thông tin hội viên, gói tập và PT phụ trách.
- [ ] **7. Kiểm tra Hủy lịch >= 2 giờ:** Mở chi tiết buổi tập cách thời điểm hiện tại trên 2 tiếng -> Nhấn "Hủy lịch hẹn" -> Nhập lý do -> Xác nhận. Buổi tập chuyển sang trạng thái `cancelled`, nhận tin nhắn LINE báo đã hủy.
- [ ] **8. Kiểm tra Chặn hủy lịch < 2 giờ:** Mở chi tiết buổi tập diễn ra trong vòng 2 giờ tới -> Nút Hủy bị ẩn, hiển thị thông báo hướng dẫn liên hệ trực tiếp PT.
- [ ] **9. Kiểm tra Tự động nhắc lịch (Cron Reminders):** Trước giờ tập 30 phút và 0 phút, hệ thống tự động gửi tin nhắn LINE nhắc lịch và bắn In-app Notification.
