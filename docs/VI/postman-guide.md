# Hướng dẫn test API bằng Postman

## Yêu cầu trước khi bắt đầu

- Server đang chạy: `cd server && npm run dev` (port 3000)
- Postman đã cài đặt (desktop app hoặc web)
- Đã có tài khoản test: `owner@gym.local` / `Password123!`

---

## 1. Import OpenAPI (cách nhanh nhất)

File `docs/Design/API/openapi.yaml` đã có sẵn — cover Module 1/2/3/4/6 (khoảng 40 endpoint với request body và schema đầy đủ).

**Cách import:**

1. Mở Postman → **Import** (góc trên trái)
2. Chọn file `docs/Design/API/openapi.yaml`
3. Postman tự sinh collection **"Gym Management System API"** với tất cả endpoint được nhóm theo tag

Module 5/7/8/9/10 chưa có trong openapi.yaml — tạo request thủ công theo hướng dẫn bên dưới.

---

## 2. Tạo Environment

**New Environment** → đặt tên `GMS Local` → thêm 2 biến:

| Variable | Initial Value | Current Value |
|---|---|---|
| `base_url` | `http://localhost:3000/api/v1` | `http://localhost:3000/api/v1` |
| `jwt_token` | _(để trống)_ | _(sẽ tự fill sau khi login)_ |

Chọn environment `GMS Local` trước khi test.

---

## 3. Đăng nhập và tự động lưu token

**Request:** `POST {{base_url}}/auth/login`

**Body (JSON):**
```json
{
  "email": "owner@gym.local",
  "password": "Password123!"
}
```

**Tab Tests** — dán đoạn script này để tự động lưu token:
```javascript
const res = pm.response.json();
if (res.data && res.data.accessToken) {
    pm.environment.set("jwt_token", res.data.accessToken);
    console.log("Token đã được lưu vào environment.");
}
```

Sau khi chạy request này, `jwt_token` sẽ tự động được điền.

**Thiết lập Authorization cho cả collection:**
1. Click vào collection → tab **Authorization**
2. Type: `Bearer Token`
3. Token: `{{jwt_token}}`
4. Tất cả request trong collection sẽ tự kế thừa (chọn "Inherit from parent")

---

## 4. Tài khoản test

| Role | Email | Password | Ghi chú |
|---|---|---|---|
| Owner | `owner@gym.local` | `Password123!` | Tạo sẵn từ seed |
| Staff/Trainer/Member | Tạo qua `/users` hoặc `/members` | `Password123!` | Xem Flow 5 bên dưới |

Seed mặc định tạo thêm ~10 user — xem `server/prisma/seed.ts` để biết danh sách đầy đủ.

---

## 5. Response format chung

Tất cả response đều có envelope chuẩn:

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 5 }  // chỉ có trong list endpoint
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [ ... ]
  }
}
```

---

## 6. Các flow test theo module

### Flow 1 — Auth (Module 1)

Test các chức năng xác thực.

| # | Method | URL | Body mẫu | Kết quả kỳ vọng |
|---|---|---|---|---|
| 1 | POST | `/auth/login` | `{"email":"owner@gym.local","password":"Password123!"}` | 200, `data.accessToken` |
| 2 | GET | `/auth/me` | — | 200, thông tin user + roles |
| 3 | POST | `/auth/logout` | — | 200, message |
| 4 | POST | `/auth/forgot-password` | `{"email":"owner@gym.local"}` | 200 (anti-enumeration — luôn trả 200) |
| 5 | POST | `/auth/reset-password` | `{"email":"owner@gym.local","otp":"XXXXXX","newPassword":"NewPass123!"}` | 200 |

**Lấy OTP:** Sau bước 4, xem terminal server — OTP được log ra stdout (dev mode):
```
[OTP] owner@gym.local: 123456
```

**Rate limit forgot-password:** 3 request/giờ/email. Nếu bị 429, đổi email khác hoặc chờ.

---

### Flow 2 — Package CRUD (Module 3)

Cần login bằng owner trước.

| # | Method | URL | Body mẫu |
|---|---|---|---|
| 1 | POST | `/packages` | `{"name":"Gói 1 tháng","durationDays":30,"price":500000,"description":"Gói cơ bản"}` |
| 2 | GET | `/packages` | — |
| 3 | GET | `/packages/:id` | — |
| 4 | PATCH | `/packages/:id` | `{"price":550000}` |
| 5 | PATCH | `/packages/:id/status` | `{"status":"inactive"}` |
| 6 | DELETE | `/packages/:id` | — |

Package code (`PKG-XXXX`) được auto-generate, không cần truyền vào body.

---

### Flow 3 — Đăng ký hội viên tại quầy (Module 4)

1 request tạo User + Member + Subscription + Payment trong 1 transaction.

**POST `/members`**
```json
{
  "fullName": "Nguyễn Văn A",
  "email": "nguyenvana@test.com",
  "phone": "0901234567",
  "packageId": "1",
  "paymentMethod": "cash",
  "dateOfBirth": "1995-06-15"
}
```

Kết quả: 201, trả về `memberId`, `memberCode`, `subscriptionId`, `paymentId`.

**Verify:** `GET /members/:memberId` → xem `subscription.status = "pending"`.

**Kích hoạt subscription bằng cách confirm payment:**

Đối với payment thủ công, owner/staff xác nhận qua `PATCH /payments/:paymentId` — xem Module 4 spec.

---

### Flow 4 — Subscription workflow (Module 4)

```
Tạo sub pending → confirm payment → auto-activate → xem active
```

| # | Method | URL | Body mẫu |
|---|---|---|---|
| 1 | GET | `/subscriptions?memberId=1` | — |
| 2 | GET | `/subscriptions/:id` | — |
| 3 | PATCH | `/subscriptions/:id/cancel` | `{"reason":"Yêu cầu của hội viên"}` |

**Tự đăng ký (member self-register):**

`POST /members/self-register` — Public endpoint, không cần JWT:
```json
{
  "fullName": "Trần Thị B",
  "email": "tranthib@test.com",
  "phone": "0912345678",
  "password": "Password123!"
}
```

---

### Flow 5 — RBAC (Module 2)

| # | Method | URL | Body mẫu |
|---|---|---|---|
| 1 | GET | `/permissions` | — (38 permission codes) |
| 2 | GET | `/groups` | — |
| 3 | POST | `/groups` | `{"name":"senior-trainer","displayName":"Senior PT","description":"PT cấp cao"}` |
| 4 | POST | `/groups/:id/permissions` | `{"permissionCodes":["session.manage","progress.record"]}` |
| 5 | DELETE | `/groups/:id/permissions/:permissionId` | — |
| 6 | GET | `/users` | — |
| 7 | PATCH | `/users/:id/groups` | `{"groupIds":["2"]}` |

Roles thực tế trong DB: `owner`, `trainer`, `staff`, `member`.

---

### Flow 6 — Workout Plan (Module 10)

Flow đầy đủ từ tạo plan → assign → log → test write-block.

**Bước 1 — Xem thư viện bài tập:**
```
GET /exercises
```

**Bước 2 — Tạo plan mới (draft):**
```
POST /workout-plans
Body: {"name":"Giáo án tăng cơ 4 tuần","description":"Dành cho beginner"}
→ Lưu planId từ response
```

**Bước 3 — Thêm ngày tập:**
```
POST /workout-plans/:planId/days
Body: {"dayName":"Ngày 1 - Ngực & Tay sau","dayNumber":1}
→ Lưu dayId từ response
```

**Bước 4 — Thêm bài tập vào ngày:**
```
POST /workout-plans/:planId/days/:dayId/exercises
Body: {
  "exerciseId": "1",
  "orderIndex": 1,
  "targetSets": 4,
  "targetReps": 12,
  "targetWeightKg": 60,
  "restSeconds": 90
}
```

**Bước 5 — Activate plan:**
```
PATCH /workout-plans/:planId
Body: {"status":"active"}
```

**Bước 6 — Assign cho member:**
```
POST /workout-plans/members/:memberId/assign
Body: {"planId":"1","startDate":"2026-06-01"}
```
Lưu ý: plan phải đang ở trạng thái `active`. Draft plan → 400 `PLAN_NOT_ACTIVE`.

**Bước 7 — Member log buổi tập:**
```
POST /workout-logs
Body: {
  "memberWorkoutPlanId": "1",
  "planDayId": "1",
  "loggedAt": "2026-06-01T10:00:00Z",
  "notes": "Cảm giác tốt",
  "sets": [
    {
      "planExerciseId": "1",
      "setNumber": 1,
      "actualReps": 12,
      "actualWeightKg": 60,
      "completed": true
    }
  ]
}
```

**Bước 8 — Test write-block (BR-W02):**
```
PATCH /workout-plans/:planId/days/:dayId
Body: {"dayName":"Đổi tên ngày"}
→ Kỳ vọng: 409 CONFLICT (plan đã có log → không cho sửa cấu trúc)
```

---

### Flow 7 — Training Sessions (Module 7)

| # | Method | URL | Body mẫu |
|---|---|---|---|
| 1 | GET | `/training-sessions` | `?status=scheduled` |
| 2 | POST | `/training-sessions` | Xem bên dưới |
| 3 | GET | `/training-sessions/:id` | — |
| 4 | PATCH | `/training-sessions/:id` | `{"status":"completed"}` |
| 5 | DELETE | `/training-sessions/:id` | — |
| 6 | POST | `/attendance-logs` | `{"memberId":"1","sessionId":"1","method":"manual"}` |
| 7 | POST | `/members/:id/progress` | `{"weight":70.5,"bmi":23.1,"goal":"Tăng cơ","notes":"Tốt"}` |

**Tạo buổi tập:**
```json
{
  "memberId": "1",
  "trainerStaffId": "1",
  "roomId": "1",
  "startTime": "2026-06-02T08:00:00Z",
  "endTime": "2026-06-02T09:00:00Z"
}
```

**State machine training session:** `scheduled → in_progress → completed | cancelled`
Chuyển trực tiếp `scheduled → completed` là hợp lệ (bỏ qua `in_progress`).

---

### Flow 8 — Feedback (Module 8)

| # | Method | URL | Body mẫu |
|---|---|---|---|
| 1 | POST | `/feedback` | Xem bên dưới |
| 2 | GET | `/feedback` | `?status=open` |
| 3 | GET | `/feedback/:id` | — |
| 4 | PATCH | `/feedback/:id/status` | `{"status":"in_progress"}` |

**Gửi feedback:**
```json
// Type = equipment (phải có subjectEquipmentId)
{
  "type": "equipment",
  "content": "Máy chạy bộ phòng A bị hỏng tốc độ",
  "subjectEquipmentId": "1"
}

// Type = staff (phải có subjectStaffId)
{
  "type": "staff",
  "content": "PT tư vấn rất nhiệt tình",
  "subjectStaffId": "2"
}

// Type = service (không cần subject)
{
  "type": "service",
  "content": "Đề xuất mở thêm lớp yoga buổi tối"
}
```

Trạng thái feedback: `open → in_progress → resolved` hoặc `open → rejected`.

---

## 7. Error codes thường gặp

| HTTP | Code | Nguyên nhân | Cách xử lý |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | Token hết hạn hoặc thiếu | Chạy lại `POST /auth/login` |
| 403 | `FORBIDDEN` | Role không có permission | Kiểm tra group assignment của user |
| 404 | `NOT_FOUND` | ID không tồn tại | Kiểm tra lại ID trong path |
| 409 | `CONFLICT` | Trùng email/mã, hoặc write-block BR-W02 | Đổi dữ liệu hoặc dùng plan khác chưa có log |
| 400 | `VALIDATION_ERROR` | Thiếu required field, sai format | Xem `error.details` để biết field nào lỗi |
| 429 | `RATE_LIMIT` | Vượt rate limit (vd forgot-password 3/hr) | Chờ hoặc đổi email |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi server | Xem terminal server để debug |

---

## 8. Mẹo sử dụng Postman

**Lưu response vào variable:**
```javascript
// Tab Tests của bất kỳ request nào
const res = pm.response.json();
pm.environment.set("memberId", res.data.memberId);
pm.environment.set("planId", res.data.planId);
// Sau đó dùng {{memberId}}, {{planId}} trong URL của request tiếp theo
```

**Kiểm tra nhanh status code:**
```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Success true", () => pm.expect(pm.response.json().success).to.be.true);
```

**BigInt IDs:** Server trả ID dạng string JSON (vd `"1"`, `"123"`) — dán trực tiếp vào path param không cần chuyển đổi.

**OTP trong dev mode:** `POST /auth/forgot-password` sẽ in OTP ra terminal server:
```
[AuthService] OTP for owner@gym.local: 847291
```

**Chạy lại collection tự động (Collection Runner):** Postman có tính năng chạy toàn bộ collection theo thứ tự — hữu ích để smoke test sau khi deploy.
