# Hướng dẫn test Module 5 (Staff) & Module 6 (Facility) bằng Postman

## Mục tiêu
Hướng dẫn nhanh cách kiểm thử các endpoint liên quan đến Module 5 (Staff) và Module 6 (Facility) bằng Postman: lấy token, cấu hình environment, ví dụ request, và cách chạy bộ test.

## Chuẩn bị
- Cài Postman (Windows/Mac/Linux).
- Biết `BASE_URL` của API (ví dụ `http://localhost:3000` hoặc staging).

## Thiết lập Environment
Tạo một Environment mới trong Postman với các biến sau:
- `BASE_URL` — ví dụ `http://localhost:3000`
- `AUTH_TOKEN` — (để trống; sẽ set sau khi đăng nhập)

Sử dụng header chung cho requests:
- `Authorization: Bearer {{AUTH_TOKEN}}`
- `Content-Type: application/json`

## Lấy token (Auth)
1. Tạo request `POST {{BASE_URL}}/auth/login`.
2. Body (JSON) ví dụ:

```json
{
  "email": "owner@gym.local",
  "password": "password123"
}
```

3. Gửi request → response chứa `accessToken` (hoặc `token`).
4. Copy giá trị token và gán vào biến environment `AUTH_TOKEN` (Postman có thể extract tự động bằng script test).

Ví dụ script Test để tự set biến (`Tests` tab):

```javascript
const body = pm.response.json();
if (body && body.data && body.data.accessToken) {
  pm.environment.set('AUTH_TOKEN', body.data.accessToken);
}
```

Cấu trúc trả về có thể khác; điều chỉnh key theo implementation (`data.token`, `accessToken`, ...).

## Các requests chuẩn (ví dụ)

Lưu ý: tất cả đường dẫn dưới đây bắt đầu từ `{{BASE_URL}}`.

### Module 5 — Staff
- GET /staff
  - Mục đích: lấy danh sách nhân viên
  - Method: `GET {{BASE_URL}}/staff`

- POST /staff
  - Mục đích: tạo staff mới (owner only)
  - Method: `POST {{BASE_URL}}/staff`
  - Body ví dụ:

```json
{
  "email": "nv.test@gym.local",
  "fullName": "Nguyen Van Test",
  "phone": "0901111222",
  "position": "pt",
  "groupIds": ["3"]
}
```

- GET /staff/:id
  - Mục đích: xem chi tiết staff
  - Method: `GET {{BASE_URL}}/staff/{{staffId}}`

- POST /staff/:id/schedules
  - Mục đích: tạo lịch làm việc cho staff
  - Method: `POST {{BASE_URL}}/staff/{{staffId}}/schedules`
  - Body ví dụ:

```json
{
  "shift": "morning",
  "workDate": "2026-06-01"
}
```

### Module 6 — Facility (Rooms / Equipment / Maintenance)
- GET /rooms
  - `GET {{BASE_URL}}/rooms`

- POST /rooms
  - Method: `POST {{BASE_URL}}/rooms`
  - Body ví dụ:

```json
{
  "name": "Yoga Studio 2",
  "roomType": "Yoga",
  "capacity": 20,
  "description": "Tầng 3"
}
```

- GET /equipment
  - `GET {{BASE_URL}}/equipment`

- POST /equipment
  - Method: `POST {{BASE_URL}}/equipment`
  - Body ví dụ:

```json
{
  "roomId": "1",
  "name": "Treadmill X3 Pro",
  "importDate": "2025-06-15",
  "warrantyUntil": "2027-06-15"
}
```

- POST /equipment/:id/maintenance-logs
  - Mục đích: báo hỏng thiết bị
  - Method: `POST {{BASE_URL}}/equipment/{{equipmentId}}/maintenance-logs`
  - Body ví dụ:

```json
{
  "description": "Máy kêu to, chạy rung",
  "reportedByStaffId": "2"
}
```

## Chạy test hàng loạt (Collection Runner)
1. Gom các request trên thành một Collection trong Postman, tách theo folder `Module 5` và `Module 6`.
2. Sử dụng Collection Runner để chạy một folder hoặc toàn bộ Collection.
3. Chú ý: cần set biến `AUTH_TOKEN` trước khi chạy; có thể thêm một request `Auth → Set token` ở đầu collection để tự động khai báo token trước các request khác.

## Kiểm tra lỗi & status code
- 200/201/204: thành công
- 400: validation error (kiểm tra body/query)
- 401: unauthorized (kiểm tra token)
- 403: forbidden (kiểm tra quyền RBAC)
- 404: resource not found
- 409: conflict (duplicate / business rule)

## Ghi chú về export collection và ignore
- Nếu export Postman collection/environment, đặt file export vào `docs/Design/API/postman_collections/`.
- Repository đã cấu hình `.gitignore` để bỏ qua exports trong thư mục này, tránh commit file export tự động.

---

Nếu bạn muốn, mình có thể: export một sample collection từ hướng dẫn này (JSON) vào `docs/Design/API/postman_collections/` (file sẽ bị ignore), hoặc thêm scripts mẫu để tự extract token và chạy tests tự động.
