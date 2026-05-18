# Module 4 — Member / Subscription / Payment API

| Field | Value |
|---|---|
| Document ID | GMS-API-M4-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD |
| Last Updated | 2026-05-17 |
| Related docs | [`conventions.md`](./conventions.md), [`Architecture.md §3.1, §4.3.3, §4.5.2, §5.2`](../Architecture.md), [`Database.md §USER, MEMBER, SUBSCRIPTION, PAYMENT`](../Database.md), [`SRS_VI.md UC03A, UC03B, UC04A, UC04B, UC06, UC11`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 4 đặc tả endpoint quản lý hội viên + lượt đăng ký gói tập + thanh toán. Bao trùm 5 UC: đăng ký tại quầy (UC03A), đăng ký online (UC03B), gia hạn gói (UC04A), hủy gói (UC04B), theo dõi tiến độ (UC06). Subset UC11 (quản lý hội viên: list/update/delete) cũng nằm ở đây để giữ resource group nhất quán; quản lý nhân sự thuộc Module 5 Staff.

In-scope: 14 endpoint chia 3 resource (Members 8 / Subscriptions 4 / Payments 2).

Out-of-scope:

- Package CRUD (Module 3). Module 4 chỉ tham chiếu `packages.package_id` qua FK.
- Trainer assign + Staff management (Module 5).
- Training sessions, attendance logs (Module 7).
- Refund flow (defer v1.1 — không có UC v1.0).
- Upgrade/downgrade giữa kỳ (defer v1.1+ — Architecture ADR-009).

## 2. Endpoint Inventory

### Members

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 1 | GET | `/members` | UC11 list | JWT | Owner, Staff |
| 2 | GET | `/members/:id` | — | JWT | Owner, Staff, PT-if-primary, Self |
| 3 | POST | `/members` | UC03A | JWT | Staff |
| 4 | POST | `/members/self-register` | UC03B | Public | — |
| 5 | PATCH | `/members/:id` | UC11 update | JWT | Owner, Staff, Self (limited) |
| 6 | DELETE | `/members/:id` | UC11 delete | JWT | Owner |
| 7 | PATCH | `/members/:id/assign-trainer` | UC11 | JWT | Owner, Staff |
| 8 | GET | `/members/:id/progress` | UC06 | JWT | Owner, Staff, PT-if-primary, Self |

### Subscriptions

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 9 | GET | `/subscriptions` | — | JWT | Owner, Staff, Self (`memberId` filter) |
| 10 | POST | `/subscriptions` | UC03A/B, UC04A | JWT | Staff |
| 11 | PATCH | `/subscriptions/:id/cancel` | UC04B | JWT | Owner, Staff, Self |
| 12 | GET | `/subscriptions/:id` | — | JWT | Owner, Staff, Self |

### Payments

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 13 | POST | `/payments` | UC03A/B, UC04A | JWT | Staff |
| 14 | GET | `/payments` | — | JWT | Owner, Staff, Self (`memberId` filter) |

---

## 3. Members

### 3.1 GET /members

**UC:** UC11 (list member để quản lý)
**Auth:** JWT
**RBAC:** Owner, Staff

**Description:** List hội viên với pagination + filter. Mặc định ẩn `deleted_at IS NOT NULL`.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `page` | integer | no | 1 | `@Min(1)` |
| `pageSize` | integer | no | 20 | `@Min(1)` `@Max(100)` |
| `sort` | string | no | `created_at:desc` | whitelist: `created_at`, `member_code`, `full_name` |
| `status` | enum | no | — | `pending_verification`, `active`, `locked` (filter theo `users.status`) |
| `trainerId` | string | no | — | filter `primary_trainer_id` |
| `search` | string | no | — | match `member_code` ILIKE / `full_name` ILIKE |
| `includeDeleted` | boolean | no | false | chỉ Owner — bao gồm soft-deleted |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "userId": "7",
      "email": "a@gym.local",
      "fullName": "Nguyễn Văn A",
      "phone": "+84901234567",
      "status": "active",
      "dateOfBirth": "1995-06-15",
      "address": "12 Lê Lợi, Q1",
      "primaryTrainerId": "3",
      "createdAt": "2026-04-12T08:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 137, "totalPages": 7 }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Query param sai format / out-of-range / sort field ngoài whitelist |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner/Staff / `includeDeleted=true` mà role không phải Owner |

**Business rules:**

```text
WHEN role là Staff (không phải Owner)
THEN ignore param includeDeleted, query luôn filter deleted_at IS NULL
ELSE Owner có thể set includeDeleted=true để xem soft-deleted

WHEN trainerId provided
THEN filter WHERE primary_trainer_id = trainerId AND deleted_at IS NULL
ELSE no trainer filter
```

**Audit:** Không (GET).

---

### 3.2 GET /members/:id

**UC:** —
**Auth:** JWT
**RBAC:** Owner, Staff, PT-if-primary, Self

**Description:** Lấy chi tiết 1 hội viên. PT chỉ thấy nếu là `primary_trainer_id`. Member chỉ thấy chính mình.

**Path param:** `id` = `member_id` (string BigInt).

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "userId": "7",
    "email": "a@gym.local",
    "fullName": "Nguyễn Văn A",
    "phone": "+84901234567",
    "status": "active",
    "emailVerifiedAt": "2026-04-12T08:30:00.000Z",
    "dateOfBirth": "1995-06-15",
    "address": "12 Lê Lợi, Q1",
    "primaryTrainerId": "3",
    "avatarFileId": "42",
    "createdAt": "2026-04-12T08:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject (PT không phải primary, hoặc Member khác Self) |
| 404 | `NOT_FOUND` | `member_id` không tồn tại hoặc `deleted_at IS NOT NULL` (trừ Owner có `?includeDeleted=true`) |

**Business rules:**

```text
WHEN role là Owner hoặc Staff
THEN bypass ownership, trả resource
ELSE check ownership

WHEN role là PT
THEN check member.primary_trainer_id = self.staff_id
ELSE proceed

WHEN role là Member
THEN check member.user_id = jwt.sub
ELSE 403

WHEN member.deleted_at IS NOT NULL AND không phải Owner with includeDeleted=true
THEN 404
```

**Audit:** Không (GET).

---

### 3.3 POST /members

**UC:** UC03A — Đăng ký tại quầy
**Auth:** JWT
**RBAC:** Staff

**Description:** Staff tạo tài khoản hội viên mới tại quầy. Sinh `member_code` tự động (`MEM-YYYY-XXXXXX`). User tạo với `status='pending_verification'`; gửi OTP email verify (UC13). Subscription + Payment KHÔNG tạo cùng request — Staff gọi `POST /subscriptions` + `POST /payments` riêng sau khi member verify email (Architecture decision: tách atomic per-resource).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` UNIQUE |
| `phone` | string | no | `@IsPhoneNumber('VN')` UNIQUE khi có giá trị |
| `password` | string | yes | `@MinLength(8)` |
| `fullName` | string | yes | `@Length(2, 200)` |
| `dateOfBirth` | string (YYYY-MM-DD) | no | `@IsDateString` |
| `address` | string | no | `@MaxLength(200)` |

```json
{
  "email": "newmember@gym.local",
  "phone": "+84901234567",
  "password": "InitPass123!",
  "fullName": "Nguyễn Văn A",
  "dateOfBirth": "1995-06-15",
  "address": "12 Lê Lợi, Q1"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "userId": "7",
    "email": "newmember@gym.local",
    "fullName": "Nguyễn Văn A",
    "status": "pending_verification",
    "createdAt": "2026-05-17T10:30:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Staff/Owner |
| 409 | `DUPLICATE_VALUE` | Email hoặc phone đã tồn tại (P2002) |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry 5 lần sinh `member_code` đều collision |

**Business rules:**

```text
WHEN email hoặc phone đã tồn tại trong users
THEN 409 DUPLICATE_VALUE
ELSE proceed

WHEN sinh member_code 5 lần đều collision
THEN 500 MEMBER_CODE_GENERATION_FAILED
ELSE proceed

WHEN proceed
THEN $transaction(
  INSERT users (status='pending_verification', password_hash=bcrypt(password, 12));
  INSERT members (user_id, member_code);
  INSERT user_groups (group='member');
  INSERT otp_codes (purpose='email_verify', expires_at=NOW()+10min);
  INSERT audit_logs (action='member.create')
)
AND log OTP stdout v1.0 (TODO: gửi email khi SMTP ready)
```

**Audit:** `member.create`. `before_data` NULL, `after_data` = member + user shape (mask `password_hash`).

**Rate limit:** Không.

**Notes:**

- `member_code` format `MEM-{YYYY}-{6 digits}`, năm hiện tại (`today_vn`). Random 6 digits + retry collision (conventions §12).
- Password hash bcrypt cost 12 (cùng pattern `auth.service.ts:97`).
- OTP gửi qua email pending SMTP integration (Architecture §8 R8). V1.0 log stdout.
- Member group ID lookup từ `groups WHERE name='member'` (seed data).

---

### 3.4 POST /members/self-register

**UC:** UC03B — Đăng ký online (member tự đăng ký từ landing page)
**Auth:** Public
**RBAC:** —

**Description:** Member tự đăng ký không cần Staff. Tạo user + member + OTP verify email. Optional: tạo subscription `pending` với `packageId` chọn từ landing page; subscription chuyển `active` sau khi member pay (cron daily 00:10 `subscription:activate-pending`) hoặc cancel sau 24-48h nếu chưa pay (cron `subscription:cancel-unpaid-pending`).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` UNIQUE |
| `phone` | string | yes | `@IsPhoneNumber('VN')` UNIQUE |
| `password` | string | yes | `@MinLength(8)` |
| `fullName` | string | yes | `@Length(2, 200)` |
| `dateOfBirth` | string (YYYY-MM-DD) | no | — |
| `packageId` | string | no | FK `packages.package_id`, status='active', `deleted_at IS NULL` |

```json
{
  "email": "selfreg@gym.local",
  "phone": "+84909999999",
  "password": "MyPass123!",
  "fullName": "Trần Thị B",
  "dateOfBirth": "1998-03-22",
  "packageId": "3"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "memberId": "6",
    "memberCode": "MEM-2026-000006",
    "userId": "8",
    "email": "selfreg@gym.local",
    "status": "pending_verification",
    "subscription": {
      "subscriptionId": "12",
      "packageId": "3",
      "status": "pending"
    }
  }
}
```

`subscription` null nếu không truyền `packageId`.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `FK_CONSTRAINT` | `packageId` không tồn tại / `status='inactive'` / soft-deleted |
| 409 | `DUPLICATE_VALUE` | Email hoặc phone đã tồn tại |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry sinh code thất bại |

**Business rules:**

```text
WHEN email/phone duplicate
THEN 409
ELSE proceed

WHEN packageId provided
THEN validate packages.status='active' AND deleted_at IS NULL, fail → 400 FK_CONSTRAINT
ELSE skip subscription creation

WHEN packageId valid
THEN $transaction(
  INSERT users + members + user_groups + otp_codes + audit_logs (member.create);
  INSERT subscriptions (status='pending', start_date=today_vn, end_date=today_vn + package.durationDays - 1);
  INSERT audit_logs (action='subscription.create')
)
ELSE $transaction(users + members + user_groups + otp_codes + audit_logs)

ALWAYS log OTP stdout v1.0
```

**Audit:** `member.create` + (nếu có subscription) `subscription.create`. `actor_user_id` NULL (public endpoint).

**Rate limit:** Không enforce v1.0. CAPTCHA defer v1.1 (Architecture §8 R23).

**Notes:**

- Subscription `start_date = today_vn`, `end_date = start_date + package.duration_days - 1` (inclusive). Architecture §4.5.2 `today_vn`.
- Subscription ở `pending` → cron daily 00:15 `subscription:cancel-unpaid-pending` cancel nếu sau 24-48h vẫn chưa có `payments WHERE status='success'` (Architecture §5.2 + LOG-M03 fix phase 8).
- Member phải verify email trước khi login (UC13).
- `packageId` validate FK constraint qua Prisma — fail → P2003 → 400 (conventions §6).

---

### 3.5 PATCH /members/:id

**UC:** UC11 update (Staff/Owner) hoặc Self update profile
**Auth:** JWT
**RBAC:** Owner, Staff, Self (limited)

**Description:** Cập nhật profile hội viên. Self chỉ được update subset field (`phone`, `address`, `dateOfBirth`, `fullName`); Staff/Owner update mọi field trừ system-managed (`memberId`, `memberCode`, `userId`, `status`).

**Path param:** `id` = `member_id`.

**Request body (partial):**

| Field | Type | Constraint | Self allowed |
|---|---|---|---|
| `fullName` | string | `@Length(2, 200)` | yes |
| `phone` | string | `@IsPhoneNumber('VN')` UNIQUE | yes |
| `dateOfBirth` | string (YYYY-MM-DD) | — | yes |
| `address` | string | `@MaxLength(200)` | yes |
| `primaryTrainerId` | string | FK `staff.staff_id` | no (Staff/Owner only — note: dùng `/assign-trainer` endpoint dưới đây thay vì PATCH chung) |

```json
{ "phone": "+84901234568", "address": "34 Trần Hưng Đạo, Q1" }
```

**Response 200 OK:** Trả member object đầy đủ (giống GET /members/:id).

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / chứa field không cho phép với role |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject / Self gửi field ngoài allowlist |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / soft-deleted |
| 409 | `DUPLICATE_VALUE` | Phone đã tồn tại ở user khác |

**Business rules:**

```text
WHEN role là Self (member tự update)
THEN whitelist fields = [fullName, phone, dateOfBirth, address]
AND reject body chứa field khác → 400 VALIDATION_ERROR
ELSE Owner/Staff full update (trừ system-managed)

WHEN body chứa primaryTrainerId
THEN reject 400, hướng dẫn dùng /assign-trainer endpoint
ELSE proceed
```

**Audit:** `member.update`. `before_data` = snapshot trước; `after_data` = snapshot sau. Mask `password_hash` luôn.

---

### 3.6 DELETE /members/:id

**UC:** UC11 delete
**Auth:** JWT
**RBAC:** Owner

**Description:** Soft-delete hội viên (`deleted_at = NOW()`). KHÔNG cascade subscription/payment — giữ history cho audit/refund. User account `users.deleted_at` cũng set; user mất quyền login.

**Path param:** `id` = `member_id`.

**Response 200 OK:**

```json
{ "success": true, "message": "Đã xóa hội viên MEM-2026-000005" }
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / đã soft-deleted |

**Business rules:**

```text
WHEN member có active subscription
THEN soft-delete vẫn proceed; subscription giữ status='active' nhưng UC05B check-in sẽ reject (member.deleted_at IS NOT NULL)
ELSE proceed

ALWAYS $transaction(
  UPDATE members SET deleted_at=NOW() WHERE member_id=?;
  UPDATE users SET deleted_at=NOW() WHERE user_id=member.user_id;
  INSERT audit_logs (action='member.delete')
)
```

**Audit:** `member.delete`. `before_data` = snapshot, `after_data` NULL.

**Notes:**

- Cascade soft-delete users — xem Database.md §Cascade Soft Delete Convention.
- Restore (undo soft-delete) defer v1.1 — không có UC v1.0. Owner cần restore phải edit DB manual.

---

### 3.7 PATCH /members/:id/assign-trainer

**UC:** UC11 — gán PT cố định
**Auth:** JWT
**RBAC:** Owner, Staff

**Description:** Gán hoặc bỏ gán PT chính cho hội viên. PT chính ảnh hưởng UC06 (PT chỉ thấy member mình phụ trách).

**Path param:** `id` = `member_id`.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `trainerId` | string \| null | yes | FK `staff.staff_id` với `position='pt'` và `deleted_at IS NULL`, hoặc `null` để bỏ gán |

```json
{ "trainerId": "3" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "primaryTrainerId": "3",
    "primaryTrainerName": "Phạm PT C"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `FK_CONSTRAINT` | `trainerId` không tồn tại / không phải position `pt` / đã soft-delete |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner/Staff |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / soft-deleted |

**Business rules:**

```text
WHEN trainerId là null
THEN UPDATE members SET primary_trainer_id=NULL (bỏ gán)
ELSE validate staff.position='pt' AND staff.deleted_at IS NULL, fail → 400

WHEN validation pass
THEN UPDATE members SET primary_trainer_id=trainerId
AND INSERT audit_logs (action='member.assign-trainer')
```

**Audit:** `member.assign-trainer`. `before_data` = `{primaryTrainerId: <old>}`, `after_data` = `{primaryTrainerId: <new>}`.

---

### 3.8 GET /members/:id/progress

**UC:** UC06 — Theo dõi tiến độ
**Auth:** JWT
**RBAC:** Owner, Staff, PT-if-primary, Self

**Description:** List bản ghi `member_progress` (cân nặng, BMI, mục tiêu, ghi chú). PT chỉ thấy nếu là `primary_trainer_id`.

**Path param:** `id` = `member_id`.

**Query params:**

| Param | Type | Default | Constraint |
|---|---|---|---|
| `page` | integer | 1 | — |
| `pageSize` | integer | 20 | max 100 |
| `sort` | string | `recorded_at:desc` | whitelist: `recorded_at` |
| `from` | string (ISO date) | — | filter `recorded_at >= from` |
| `to` | string (ISO date) | — | filter `recorded_at <= to` |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "progressId": "12",
      "memberId": "5",
      "staffId": "3",
      "staffName": "Phạm PT C",
      "weight": 65.50,
      "bmi": 22.10,
      "goal": "Giảm 3kg trong 2 tháng",
      "notes": "Tuần này tập 3 buổi cardio",
      "recordedAt": "2026-05-10T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 8, "totalPages": 1 }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / soft-deleted |

**Business rules:**

```text
WHEN role là PT
THEN check member.primary_trainer_id = jwt.staffId
ELSE Owner/Staff/Self bypass PT check

WHEN role là Member
THEN check member.user_id = jwt.sub
ELSE Owner/Staff/PT bypass Self check
```

**Audit:** Không (GET).

**Notes:**

- POST/PATCH progress (PT ghi chỉ số mới) defer Module 7 Training — UC06 SRS spec PT input data ở session diary, không cần endpoint riêng v1.0 MVP nếu UI tích hợp vào TrainingSession form. Cân nhắc thêm `POST /members/:id/progress` khi Module 7 spec.

---

## 4. Subscriptions

### 4.1 GET /subscriptions

**UC:** —
**Auth:** JWT
**RBAC:** Owner, Staff, Self (`memberId` filter bắt buộc cho Self)

**Description:** List lượt đăng ký gói. Self bắt buộc filter `memberId=self`.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `memberId` | string | Self bắt buộc | — | FK `members.member_id` |
| `status` | enum | no | — | `pending`, `active`, `expired`, `cancelled` |
| `page` | integer | no | 1 | — |
| `pageSize` | integer | no | 20 | max 100 |
| `sort` | string | no | `start_date:desc` | whitelist: `start_date`, `end_date`, `created_at` |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "subscriptionId": "12",
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "packageId": "3",
      "packageName": "Gold 3 tháng",
      "startDate": "2026-05-01",
      "endDate": "2026-07-31",
      "status": "active",
      "cancelledAt": null,
      "createdAt": "2026-04-28T09:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Self không truyền `memberId=self` / truyền `memberId` khác |

**Business rules:**

```text
WHEN role là Self
THEN bắt buộc memberId param = self.member_id, fail → 403
ELSE Owner/Staff có thể list mọi member hoặc filter optional
```

**Audit:** Không (GET).

---

### 4.2 POST /subscriptions

**UC:** UC03A/B (purchase mới), UC04A (renewal)
**Auth:** JWT
**RBAC:** Staff (Self self-register flow gọi qua endpoint `/members/self-register` ở §3.4, không gọi trực tiếp)

**Description:** Tạo subscription mới cho member. Xử lý cả purchase mới + renewal qua state member hiện tại. Subscription tạo ở `pending` (chờ payment); chuyển `active` khi `POST /payments` thành công (nếu `start_date <= today_vn`) hoặc cron daily 00:10 `subscription:activate-pending` (khi `start_date` đến).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | FK `members.member_id`, `status='active'`, `deleted_at IS NULL` |
| `packageId` | string | yes | FK `packages.package_id`, `status='active'`, `deleted_at IS NULL` |

```json
{ "memberId": "5", "packageId": "3" }
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "subscriptionId": "15",
    "memberId": "5",
    "packageId": "3",
    "startDate": "2026-08-01",
    "endDate": "2026-10-31",
    "status": "pending",
    "createdAt": "2026-05-17T10:30:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `FK_CONSTRAINT` | `memberId` / `packageId` không tồn tại |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Staff/Owner |
| 403 | `EMAIL_NOT_VERIFIED` | Member chưa verify email (`users.email_verified_at IS NULL`) |
| 409 | `SUBSCRIPTION_ALREADY_PENDING` | Member đã có subscription `pending` (chưa pay) |

**Business rules:**

```text
WHEN member.users.email_verified_at IS NULL
THEN 403 EMAIL_NOT_VERIFIED
ELSE proceed

WHEN tồn tại subscriptions WHERE member_id=? AND status='pending'
THEN 409 SUBSCRIPTION_ALREADY_PENDING (member phải pay pending hiện tại hoặc cancel trước khi tạo mới)
ELSE proceed

WHEN tồn tại subscriptions WHERE member_id=? AND status='active'
THEN renewal flow: start_date = activeSubscription.end_date + 1 day, end_date = start_date + package.durationDays - 1
ELSE new purchase flow: start_date = today_vn, end_date = today_vn + package.durationDays - 1

ALWAYS INSERT subscriptions (status='pending', start_date, end_date)
AND INSERT audit_logs (action = renewal ? 'subscription.renew' : 'subscription.create')
```

**Audit:** `subscription.create` (purchase mới) hoặc `subscription.renew` (renewal — phân biệt qua context có active subscription cùng member tại thời điểm INSERT). `after_data` = subscription shape.

**Notes:**

- Date arithmetic dùng `today_vn` (Architecture §4.5.2). `start_date = today_vn` hoặc `start_date = activeSubscription.end_date + 1 day` (date math, không phải datetime).
- `end_date = start_date + durationDays - 1` (inclusive). Vd package 30 ngày, start 2026-05-01 → end 2026-05-30.
- `pending` subscription chuyển `active` qua 2 path:
  - `POST /payments` success AND `start_date <= today_vn` → activate ngay trong cùng `$transaction` (xem §5.1).
  - Cron daily 00:10 `subscription:activate-pending` activate khi `start_date` đến (Architecture §5.2).
- Cron daily 00:15 `subscription:cancel-unpaid-pending` cancel `pending` sau 24-48h nếu vẫn `NOT EXISTS payments WHERE status='success'` (Architecture §5.2 + LOG-M03 phase 8).

---

### 4.3 PATCH /subscriptions/:id/cancel

**UC:** UC04B — Hủy gói
**Auth:** JWT
**RBAC:** Owner, Staff, Self

**Description:** Hủy subscription `active` hoặc `pending`. Nếu member có subscription `pending` đã thanh toán (prepaid renewal), activate ngay trong cùng `$transaction` (cascade — Architecture §4.3.3). Không refund v1.0.

**Path param:** `id` = `subscription_id`.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `reason` | string | no | `@MaxLength(500)` — lưu vào audit `before_data.reason` |

```json
{ "reason": "Member chuyển nơi ở" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "cancelledSubscription": {
      "subscriptionId": "12",
      "status": "cancelled",
      "cancelledAt": "2026-05-17T10:30:00.000Z"
    },
    "activatedSubscription": {
      "subscriptionId": "15",
      "status": "active",
      "startDate": "2026-05-17",
      "endDate": "2026-08-15"
    }
  }
}
```

`activatedSubscription` = null nếu không có pending prepaid để cascade.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại / soft-deleted / đã `cancelled`/`expired` (P2025 hoặc filter no match) |
| 409 | `SUBSCRIPTION_NOT_CANCELLABLE` | Subscription `status` không phải `active` hoặc `pending` |

**Business rules:**

```text
WHEN subscription.status NOT IN ('active', 'pending')
THEN 409 SUBSCRIPTION_NOT_CANCELLABLE
ELSE proceed

WHEN subscription.status = 'active' AND tồn tại subscriptions WHERE member_id=subscription.member_id AND status='pending' AND EXISTS payments WHERE subscription_id=pending.id AND status='success'
THEN cascade activate pending (Architecture §4.3.3)
ELSE chỉ cancel, KHÔNG activate

ALWAYS $transaction(
  UPDATE subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=:id;
  IF cascade THEN UPDATE pending SET status='active', start_date=today_vn, end_date=today_vn + package.durationDays - 1;
  INSERT audit_logs (action='subscription.cancel');
  IF cascade THEN INSERT audit_logs (action='subscription.activate')
)
```

**Audit:** `subscription.cancel` với `before_data` = subscription trước, `after_data` = subscription sau. Nếu cascade: thêm 1 audit row `subscription.create` cho activated (theo Architecture §4.4.1 không có code `subscription.activate` — dùng `subscription.create` với note context, hoặc thêm code mới v1.1).

**Notes:**

- Race condition: 2 user concurrent cancel cùng `active` → lần 2 nhận P2025 (Architecture §4.3.2). Filter map → 404. Không dùng `SELECT FOR UPDATE` v1.0.
- Architecture §4.3.3 audit code mention `subscription.activate` — KHÔNG có trong §4.4.1 list. **Drift**: spec dùng `subscription.create` cho cascade-activated, flag để Architecture v1.1.4 thống nhất (thêm `subscription.activate` vào §4.4.1 hoặc xóa khỏi §4.3.3).

- `today_vn` cho `start_date` recompute khi cascade — không giữ `start_date` cũ của pending vì gói cũ kết thúc sớm hơn dự kiến.

---

### 4.4 GET /subscriptions/:id

**UC:** —
**Auth:** JWT
**RBAC:** Owner, Staff, Self

**Description:** Lấy chi tiết 1 subscription. Self check qua `subscription.member.user_id = jwt.sub`.

**Path param:** `id` = `subscription_id`.

**Response 200 OK:** Cùng shape item của §4.1 + thêm field `package` expanded:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "12",
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "package": {
      "packageId": "3",
      "packageCode": "PKG-0003",
      "name": "Gold 3 tháng",
      "durationDays": 90,
      "price": "3000000.00"
    },
    "startDate": "2026-05-01",
    "endDate": "2026-07-29",
    "status": "active",
    "cancelledAt": null,
    "createdAt": "2026-04-28T09:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại / soft-deleted |

**Audit:** Không (GET).

---

## 5. Payments

### 5.1 POST /payments

**UC:** UC03A/B, UC04A — Ghi nhận thanh toán
**Auth:** JWT
**RBAC:** Staff

**Description:** Staff ghi nhận thanh toán cho subscription `pending`. Nếu `status='success'` AND subscription `start_date <= today_vn` AND không có subscription `active` đang chiếm slot → activate ngay (cùng `$transaction`). Ngược lại giữ `pending`, cron daily 00:10 activate khi `start_date` đến.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | FK `members.member_id` |
| `subscriptionId` | string | yes | FK `subscriptions.subscription_id`, `status='pending'` |
| `amount` | string (decimal) | yes | `> 0`, không phần thập phân khác 0 (VND integer) |
| `method` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `transactionReference` | string | conditional | UNIQUE; required khi `method != 'cash'`; nullable khi `method='cash'` |
| `status` | enum | no | `success` (default), `failed` |

```json
{
  "memberId": "5",
  "subscriptionId": "12",
  "amount": "3000000.00",
  "method": "bank_card",
  "transactionReference": "VPB-20260517-0001",
  "status": "success"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "paymentId": "33",
    "memberId": "5",
    "subscriptionId": "12",
    "amount": "3000000.00",
    "method": "bank_card",
    "transactionReference": "VPB-20260517-0001",
    "status": "success",
    "paidAt": "2026-05-17T10:30:00.000Z",
    "subscription": {
      "subscriptionId": "12",
      "status": "active",
      "startDate": "2026-05-17",
      "endDate": "2026-08-14"
    }
  }
}
```

`subscription.status` trả `active` nếu activate ngay, `pending` nếu chờ cron.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / amount không match `package.price` ± rounding (validate optional, defer khi cần discount logic) |
| 400 | `FK_CONSTRAINT` | `memberId` / `subscriptionId` không tồn tại |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Staff/Owner |
| 409 | `DUPLICATE_VALUE` | `transactionReference` đã tồn tại (P2002) |
| 409 | `SUBSCRIPTION_NOT_PENDING` | `subscription.status != 'pending'` |

**Business rules:**

```text
WHEN method != 'cash' AND transactionReference rỗng
THEN 400 VALIDATION_ERROR
ELSE proceed

WHEN method = 'cash'
THEN transactionReference có thể NULL — accept double-charge risk (conventions §13)
ELSE transactionReference UNIQUE check

WHEN subscription.status != 'pending'
THEN 409 SUBSCRIPTION_NOT_PENDING
ELSE proceed

WHEN status='success' AND subscription.start_date <= today_vn AND không có member subscription khác status='active'
THEN $transaction(
  INSERT payments;
  UPDATE subscriptions SET status='active';
  INSERT audit_logs (action='payment.success');
  INSERT audit_logs (action='subscription.create' với note 'activated by payment')
)
ELSE WHEN status='success'
THEN $transaction(INSERT payments; INSERT audit_logs (action='payment.success'))
  AND subscription giữ pending, chờ cron daily 00:10 activate khi start_date đến

WHEN status='failed'
THEN $transaction(INSERT payments; INSERT audit_logs (action='payment.fail'))
  AND subscription giữ pending; cron daily 00:15 sẽ cancel sau 24-48h nếu không có payment success khác
```

**Audit:** `payment.success` hoặc `payment.fail`. `after_data` mask `transactionReference` ở UI listing (giữ full trong DB cho reconciliation).

**Idempotency:** UNIQUE `transaction_reference` (Database.md). Duplicate → 409 (conventions §13). `method='cash'` không có reference — accept double-charge risk, mitigate qua audit log review.

**Notes:**

- `amount` validate `> 0` (Database.md CHECK constraint).
- Composite index `(subscription_id, status)` trên `payments` defer khi build (Architecture §5.2 LOG-M07 phase 8) — chưa có trong Prisma schema v1.0.
- Activation logic phối hợp với cron `subscription:activate-pending` (Architecture §5.2). Sau commit, cron check `EXISTS payments WHERE subscription_id=? AND status='success'` — nếu hit và `start_date <= today_vn`, activate.

---

### 5.2 GET /payments

**UC:** —
**Auth:** JWT
**RBAC:** Owner, Staff, Self (`memberId` filter bắt buộc cho Self)

**Description:** List payments. Self bắt buộc `memberId=self`. Filter theo subscription / status / date range.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `memberId` | string | Self bắt buộc | — | FK |
| `subscriptionId` | string | no | — | FK |
| `status` | enum | no | — | `success`, `failed` |
| `method` | enum | no | — | `cash`, `bank_card`, `ewallet` |
| `from` | string (ISO date) | no | — | filter `paid_at >= from` |
| `to` | string (ISO date) | no | — | filter `paid_at <= to` |
| `page` | integer | no | 1 | — |
| `pageSize` | integer | no | 20 | max 100 |
| `sort` | string | no | `paid_at:desc` | whitelist: `paid_at`, `amount` |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "paymentId": "33",
      "memberId": "5",
      "subscriptionId": "12",
      "amount": "3000000.00",
      "method": "bank_card",
      "transactionReference": "VPB-20260517-0001",
      "status": "success",
      "paidAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 4, "totalPages": 1 }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Self không truyền `memberId=self` / truyền `memberId` khác |

**Audit:** Không (GET).

---

## 6. Domain Error Codes

Codes specific cho Module 4 (ngoài standard codes ở `conventions.md §6`):

| Code | HTTP | Trigger |
|---|---|---|
| `MEMBER_CODE_GENERATION_FAILED` | 500 | Retry 5 lần sinh `member_code` đều collision |
| `EMAIL_NOT_VERIFIED` | 403 | Member chưa verify email cố thao tác cần verified user (vd tạo subscription) |
| `SUBSCRIPTION_ALREADY_PENDING` | 409 | Tạo subscription mới khi member còn `pending` chưa pay |
| `SUBSCRIPTION_NOT_CANCELLABLE` | 409 | Cancel subscription có `status` ngoài (`active`, `pending`) |
| `SUBSCRIPTION_NOT_PENDING` | 409 | Tạo payment cho subscription không ở `status='pending'` |

## 7. Cross-Module References

- **Module 3 Package (stub):** `POST /subscriptions` body có `packageId` → validate FK `packages.package_id` với `status='active'` AND `deleted_at IS NULL`. Module 3 Package CRUD chưa spec; frontend tạm truy vấn raw Prisma hoặc dùng seed data. Khi Module 3 spec hoàn chỉnh, FK validation refactor sang dùng service injection.
- **Module 5 Staff (stub):** `PATCH /members/:id/assign-trainer` body có `trainerId` → validate FK `staff.staff_id` với `position='pt'` AND `deleted_at IS NULL`. Module 5 Staff CRUD chưa spec.
- **Module 7 Training (stub):** `GET /members/:id/progress` đọc bảng `member_progress`. POST/PATCH progress record defer Module 7 vì gắn với training session diary.
- **Module 2 RBAC retrofit:** RBAC column hiện dùng role notation (`Owner | Staff | Self`). Khi Module 2 spec permission codes, refactor sang permission-based (vd `member.read.own`, `member.write.any`).

## 8. Implementation Status

Toàn bộ 14 endpoint **chưa implement code**. Module 4 sẽ là PR đầu tiên scaffold:

- `server/src/members/` (members.module, controller, service, dto)
- `server/src/subscriptions/` (subscriptions.module, controller, service, dto)
- `server/src/payments/` (payments.module, controller, service, dto)
- `server/src/common/dto/pagination.dto.ts` (shared cho mọi module)
- `server/src/common/guards/ownership.guard.ts` (Self / PT-if-primary check)
- `server/src/common/interceptors/audit.interceptor.ts` + `@Audit()` decorator (cho mọi mutation, dùng chéo Module 1-9)

Prisma schema thêm khi build:

- Composite index `@@index([subscriptionId, status])` trên `payments` (Architecture §5.2 LOG-M07).
- `@@index([memberId, status])` trên `subscriptions` (filter by member + status).

## 9. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft — 14 endpoint chia 3 resource (Members 8 + Subscriptions 4 + Payments 2). |
