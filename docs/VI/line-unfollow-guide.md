# Hướng dẫn Hủy Follow (Block) ROGYM trên LINE và Cơ chế Xử lý Hệ thống

Tài liệu này hướng dẫn chi tiết cách hội viên hủy follow (block) tài khoản LINE Official Account của **ROGYM**, giải thích cơ chế hệ thống tự động xử lý khi nhận sự kiện `unfollow`, cũng như hướng dẫn Developer/Tester cách thử nghiệm sự kiện này trên môi trường phát triển.

---

## 1. Tổng quan Tích hợp LINE & ROGYM

Hệ thống Quản lý Phòng Gym (ROGYM) tích hợp với LINE Messaging API để gửi các thông báo quan trọng đến hội viên:
- **Nhắc lịch tập PT**: Thông báo trước 30 phút và khi buổi tập bắt đầu.
- **Nhắc gia hạn gói tập**: Cảnh báo khi gói tập chuẩn bị hết hạn.
- **Thông báo Check-in**: Xác nhận lượt điểm danh vào phòng tập thành công.
- **Truy cập nhanh (Rich Menu)**: Cho phép mở ứng dụng hội viên, đặt lịch tập, check-in qua LIFF.

Khi hội viên hủy follow tài khoản LINE của ROGYM, hệ thống cần tự động ngắt kết nối `lineId` để bảo vệ quyền riêng tư và đảm bảo không gửi thông báo không mong muốn.

---

## 2. Hướng dẫn dành cho Hội viên (Thao tác trên ứng dụng LINE)

### 2.1 Các bước Hủy follow (Block) trên ứng dụng LINE Mobile

> [!NOTE]  
> Trên ứng dụng LINE, việc **Hủy follow** một Official Account (Tài khoản chính thức) được thực hiện thông qua tính năng **Block (Khóa)** tài khoản đó.

1. **Mở ứng dụng LINE** trên điện thoại di động.
2. Tìm và chọn khung chat với **ROGYM** (Official Account).
3. Nhấp vào biểu tượng **Menu ≡** (hoặc bánh răng ⚙️ Cài đặt) ở góc trên bên phải màn hình chat.
4. Chọn **Block (Khóa / 🔕)** tài khoản ROGYM.
5. Xác nhận thao tác **Block**.

---

### 2.2 Tác động sau khi Hủy follow / Block

- **Ngừng nhận thông báo**: Hội viên sẽ không nhận được bất kỳ tin nhắn tự động nào (nhắc lịch tập, nhắc gia hạn, check-in) qua LINE.
- **Tự động Hủy liên kết**: Hệ thống RoGym sẽ nhận sự kiện từ LINE Webhook và ngay lập tức gỡ liên kết `lineId` khỏi tài khoản hội viên trên hệ thống RoGym.
- **Không ảnh hưởng tài khoản RoGym**: Tài khoản hội viên, thông tin gói tập và lịch tập đã đặt trên Web App vẫn được giữ nguyên đầy đủ.

---

### 2.3 Hướng dẫn Kết nối lại (Re-follow & Link Account)

Nếu hội viên muốn tiếp tục nhận thông báo qua LINE sau khi đã hủy follow:
1. Mở ứng dụng LINE → Chọn **Friends (Bạn bè)** → Tìm kiếm hoặc xem danh sách **Blocked accounts (Tài khoản đã khóa)**.
2. Chọn **ROGYM** và nhấn **Unblock (Bỏ khóa)**.
3. Nhấn **Add (Thêm bạn / Follow lại)** tài khoản ROGYM.
4. Truy cập lại Web App RoGym, vào trang **Hồ sơ (Profile)** và chọn **Đăng nhập / Liên kết LINE** để khôi phục đồng bộ.

---

## 3. Cơ chế Xử lý Tự động phía Backend (RoGym System)

Khi hội viên thực hiện thao tác Block/Unfollow trên LINE, quy trình xử lý của hệ thống diễn ra như sau:

```mermaid
sequenceDiagram
    autonumber
    actor Member as Hội viên (LINE App)
    participant LINE as LINE Platform
    participant Server as RoGym Backend (NestJS)
    participant DB as Database (PostgreSQL)

    Member->>LINE: Chọn Block / Hủy follow ROGYM
    LINE->>Server: Gửi Webhook Event (type: "unfollow", userId: "LINE_USER_ID")
    Server->>Server: Xác thực Signature (HMAC-SHA256)
    Server->>DB: UPDATE "User" SET "lineId" = NULL WHERE "lineId" = LINE_USER_ID
    DB-->>Server: Trả về số dòng cập nhật (count)
    Server->>Server: Ghi log "LINE user unfollowed; unlinked N user(s)"
```

### Chi tiết xử lý tại `LineMessagingService`:
- Khi webhook nhận được event type `unfollow`:
  ```typescript
  if (event.type === 'unfollow') {
    const result = await this.prisma.user.updateMany({
      where: { lineId: lineUserId, deletedAt: null },
      data: { lineId: null },
    })
    if (result.count > 0) {
      this.logger.log(`LINE user ${lineUserId} unfollowed; unlinked ${result.count} app user(s)`)
    }
    return
  }
  ```

---

## 4. Hướng dẫn dành cho Developer & Tester (Kiểm thử Giả lập trên LINE Mock)

Để kiểm thử tính năng nhận sự kiện `unfollow` mà không cần tài khoản LINE Official thực tế, Developer và Tester có thể sử dụng môi trường **LINE Mock Server** của dự án.

### 4.1 Thử nghiệm qua Giao diện Dev (LINE Mock Inbox Page)

1. Mở trình duyệt và truy cập trang Dev LINE Mock: `http://localhost:5173/dev/line-mock-inbox`.
2. Trên bảng điều khiển (Control Panel), chọn **Simulate Event**.
3. Chọn sự kiện **Unfollow**.
4. Kiểm tra danh sách tin nhắn / sự kiện để xác nhận sự kiện `unfollow` đã được gửi đi.
5. Kiểm tra cơ sở dữ liệu hoặc trang Hồ sơ để xác nhận trường `lineId` của user thử nghiệm (`LINE_MOCK_USER_ID`) đã chuyển về `null`.

### 4.2 Thử nghiệm qua API endpoint

Gửi request HTTP POST đến endpoint mock webhook:

```http
POST http://localhost:3000/api/line-messaging/mock/event
Content-Type: application/json

{
  "type": "unfollow"
}
```

**Response mong đợi (200 OK):**
```json
{
  "data": {
    "processedEvents": 1,
    "enabled": true
  }
}
```

---

## 5. Tổng kết & Câu hỏi Thường gặp (FAQ)

| Câu hỏi | Trả lời |
| --- | --- |
| **Hủy follow LINE có làm mất tài khoản RoGym không?** | Không. Tài khoản RoGym và dữ liệu gói tập của bạn hoàn toàn không bị ảnh hưởng. |
| **Tại sao trên LINE không thấy nút "Unfollow" mà chỉ thấy "Block"?** | Với các Official Account trên LINE, nút "Block" chính là thao tác Hủy follow / Dừng theo dõi. |
| **Khi hủy follow, tôi có đặt được lịch tập nữa không?** | Bạn vẫn đặt lịch tập bình thường trên Web App RoGym, nhưng sẽ không nhận được tin nhắn nhắc nhở qua LINE. |
