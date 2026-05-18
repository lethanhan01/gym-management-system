# Module 2 — RBAC + User Admin API

| Field | Value |
|---|---|
| Document ID | GMS-API-M2-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD |
| Last Updated | 2026-05-17 |
| Related docs | [`conventions.md`](./conventions.md), [`Architecture.md §4.1.2`](../Architecture.md), [`Database.md`](../Database.md), [`SRS_VI.md UC10`](../../VI/SRS_VI.md), [`server/prisma/seed.ts`](../../../server/prisma/seed.ts) |

---

## 1. Mục đích & Phạm vi

Module 2 đặc tả endpoint quản lý RBAC infrastructure (Permissions, Groups, User-Group assignment) và User admin (UC10). Permission catalog derive từ `seed.ts` (35 permission codes, 4 group: `owner`, `staff`, `trainer`, `member`).

In-scope:

- Permission inventory read-only (system-managed, không CRUD qua API v1.0).
- Group CRUD + permission assignment.
- User-Group assignment.
- User admin: list, detail, update profile/status, soft delete (UC10).

Out-of-scope:

- Member profile CRUD → Module 4 [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md).
- Staff profile CRUD → Module 5 (stub).
- Permission CRUD via API — `seed.ts` là source-of-truth permission codes; thêm/xóa permission phải đi qua schema migration + seed update + DB re-seed. API chỉ `GET`.
- Auth flow → Module 1.
- Custom permission per user (override group) — defer v1.1+.

## 2. Permission Inventory

35 permission codes (`seed.ts:22-70`). Notation `<resource>.<action>` — không có nested scope (`.own`/`.any`) v1.0; ownership check qua `OwnershipGuard` ở endpoint cụ thể.

### 2.1 Catalog

| Resource | Codes | Purpose |
|---|---|---|
| User | `user.read`, `user.create`, `user.update`, `user.delete` | Quản lý tài khoản hệ thống (admin). |
| RBAC | `rbac.manage` | Quản lý group + permission assignment. |
| Member | `member.read`, `member.create`, `member.update`, `member.delete` | UC03 — Module 4. |
| Staff | `staff.read`, `staff.create`, `staff.update`, `staff.delete` | UC11 — Module 5. |
| Package | `package.read`, `package.manage` | UC03/UC04/UC10 — Module 3. |
| Subscription | `subscription.read`, `subscription.create` | UC03/UC04 — Module 4. |
| Payment | `payment.read`, `payment.create`, `payment.refund` | UC03/UC04 — Module 4. |
| Room | `room.manage` | UC08 — Module 6. |
| Equipment | `equipment.manage` | UC09 — Module 6. |
| Maintenance | `maintenance.read`, `maintenance.report`, `maintenance.resolve` | UC09 — Module 6. |
| Session | `session.read`, `session.manage` | UC05 — Module 7. |
| Attendance | `attendance.read`, `attendance.checkin` | UC05 — Module 7. |
| Progress | `progress.read`, `progress.record` | UC06 — Module 7. |
| Feedback | `feedback.read`, `feedback.create`, `feedback.handle` | UC07 — Module 8. |
| Schedule | `schedule.read`, `schedule.manage` | UC11 — Module 5. |
| Report | `report.view` | UC12 — Module 9. |

### 2.2 Role → Permission map (seed default)

| Role | Permission count | Highlights | Excluded |
|---|---|---|---|
| `owner` | 35 (all) | Mọi permission. | — |
| `staff` | 26 | `user.read/create/update`, member full CRUD, package/subscription/payment management, room/equipment/maintenance, feedback full, session/attendance/progress read + checkin. | `user.delete`, `rbac.manage`, `staff.*` (mọi action), `session.manage`, `progress.record`, `schedule.manage`, `report.view`. |
| `trainer` | 13 | `member.read`, `session.read/manage`, `attendance.read/checkin`, `progress.read/record`, `feedback.read`, `schedule.read`, `subscription.read`, `package.read`, `maintenance.read/report`. | Mọi `*.create/update/delete` ngoài training/progress. |
| `member` | 8 | Self-service: `package.read`, `subscription.read/create`, `payment.read/create`, `session.read`, `attendance.read`, `progress.read`, `feedback.create`. | Mọi action quản trị. |

Source: `seed.ts:100-138` ROLE_PERMISSIONS map.

### 2.3 Thay đổi permission catalog

V1.0 workflow:

1. Edit `seed.ts` PERMISSIONS array + role mapping.
2. Bump Module 2 doc `permission count` + Catalog table.
3. `npm run prisma:seed` (DB upsert).
4. Audit log không track (seed-time event, không phải runtime).

V1.1+ defer: API endpoint `POST /permissions` cho Owner thêm custom permission runtime — cần `audit.create` action code mới.

## 3. Endpoint Inventory

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/permissions` | UC10 | JWT | `rbac.manage` | NEW |
| 2 | GET | `/permissions/:id` | UC10 | JWT | `rbac.manage` | NEW |
| 3 | GET | `/groups` | UC10 | JWT | `rbac.manage` | NEW |
| 4 | GET | `/groups/:id` | UC10 | JWT | `rbac.manage` | NEW |
| 5 | POST | `/groups` | UC10 | JWT | `rbac.manage` | NEW |
| 6 | PATCH | `/groups/:id` | UC10 | JWT | `rbac.manage` | NEW |
| 7 | DELETE | `/groups/:id` | UC10 | JWT | `rbac.manage` | NEW |
| 8 | POST | `/groups/:id/permissions` | UC10 | JWT | `rbac.manage` | NEW |
| 9 | DELETE | `/groups/:id/permissions/:permissionId` | UC10 | JWT | `rbac.manage` | NEW |
| 10 | GET | `/users` | UC10 | JWT | `user.read` | NEW |
| 11 | GET | `/users/:id` | UC10 | JWT | `user.read` HOẶC Self | NEW |
| 12 | GET | `/users/:id/groups` | UC10 | JWT | `user.read` HOẶC Self | NEW |
| 13 | POST | `/users/:id/groups` | UC10 | JWT | `rbac.manage` | NEW |
| 14 | DELETE | `/users/:id/groups/:groupId` | UC10 | JWT | `rbac.manage` | NEW |
| 15 | PATCH | `/users/:id` | UC10 | JWT | `user.update` HOẶC Self (giới hạn field) | NEW |
| 16 | DELETE | `/users/:id` | UC10 | JWT | `user.delete` | NEW |

Tổng: 16 endpoint, 0 implemented, depends Module 4 OwnershipGuard.

---

## 4. Endpoints

### 4.1 GET /permissions

**UC:** UC10 — quản lý phân quyền
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** List toàn bộ permission catalog (35 row v1.0). Read-only — permission codes derive từ `seed.ts`, không CRUD qua API.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `resource` | string | — | Filter `code` LIKE `<resource>.%` (vd `member`, `subscription`). |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    { "permissionId": "1", "code": "user.read", "name": "Xem tai khoan", "description": "..." },
    { "permissionId": "2", "code": "user.create", "name": "Tao tai khoan", "description": "..." }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 35 }
}
```

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN` (thiếu `rbac.manage`).

**Audit:** Không log (read-only).

**Rate limit:** Không giới hạn riêng (chung global rate limit v1.1).

---

### 4.2 GET /permissions/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Detail 1 permission. Dùng cho UI hiển thị tooltip / mô tả trong group permission picker.

**Path param:** `id` — `permissionId` (BigInt string).

**Response 200 OK:** Single permission object.

**Errors:** `401`, `403`, `404 NOT_FOUND`.

---

### 4.3 GET /groups

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** List group (default 4 system group + custom group nếu có). Pagination + filter.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page`/`pageSize` | int | 1/20 | Pagination. |
| `search` | string | — | LIKE `name` hoặc `description`. |
| `includeDeleted` | boolean | false | Bao gồm `deleted_at IS NOT NULL`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "groupId": "1",
      "name": "owner",
      "description": "Chu phong tap...",
      "memberCount": 1,
      "permissionCount": 35,
      "createdAt": "2026-01-01T08:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 4 }
}
```

`memberCount` = count user assigned vào group qua `user_groups`. `permissionCount` = count permission qua `group_permissions`.

**Errors:** `401`, `403`.

---

### 4.4 GET /groups/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Detail group kèm danh sách permission gán + danh sách user assigned (paginated user list nested không có; trả `memberCount` + endpoint `GET /users?groupId=:id` cho list user).

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "groupId": "2",
    "name": "staff",
    "description": "Nhan vien quan ly...",
    "memberCount": 1,
    "permissions": [
      { "permissionId": "1", "code": "user.read", "name": "Xem tai khoan" },
      { "permissionId": "6", "code": "member.read", "name": "Xem hoi vien" }
    ],
    "createdAt": "2026-01-01T08:00:00.000Z",
    "deletedAt": null
  }
}
```

**Errors:** `401`, `403`, `404`.

---

### 4.5 POST /groups

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Tạo custom group. System group (`owner`/`staff`/`trainer`/`member`) không cần tạo qua API — đã seed.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | UNIQUE, `^[a-z][a-z0-9_]{1,49}$`, không trùng system group name. |
| `description` | string | yes | 10-500 ký tự. |
| `permissions` | string[] | no | Mảng permission codes; rỗng = group không có permission. |

```json
{
  "name": "manager",
  "description": "Quan ly chi nhanh — sub-role staff voi extra permissions",
  "permissions": ["user.read", "member.read", "report.view"]
}
```

**Response 201 Created:** Group detail (giống §4.4).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | name/description format invalid; permission code không tồn tại trong catalog. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `rbac.manage`. |
| 409 | `DUPLICATE_VALUE` | Group `name` đã tồn tại (P2002). |

**Audit:** `group.create` với `after_data` = group + permission codes.

**WHEN-THEN-ELSE:**

- WHEN `name` ∈ system group set (`'owner'`, `'staff'`, `'trainer'`, `'member'`) → 400 `VALIDATION_ERROR` với `details: ["name reserved for system group"]`.
- WHEN có permission code không tồn tại → 400 `VALIDATION_ERROR` với `details: ["unknown permission: <code>"]` (validate trước transaction).
- ELSE INSERT group + bulk INSERT group_permissions trong `$transaction`.

---

### 4.6 PATCH /groups/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Update `name`/`description` của group. Permission assignment qua endpoint riêng (§4.8/4.9).

**Path param:** `id` = groupId.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | no | UNIQUE, format như §4.5. |
| `description` | string | no | 10-500 ký tự. |

**Response 200 OK:** Group detail updated.

**Errors:** `401`, `403`, `404`, `409 DUPLICATE_VALUE`.

**Audit:** `group.update` với `before_data` + `after_data`.

**WHEN-THEN-ELSE:**

- WHEN `id` thuộc system group (`name` ∈ system set) AND `name` được đổi → 400 `VALIDATION_ERROR` với `details: ["cannot rename system group"]`. Mô tả vẫn có thể update.
- ELSE proceed.

---

### 4.7 DELETE /groups/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Soft delete group (`deleted_at = NOW()`).

**Path param:** `id` = groupId.

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | — |
| 404 | `NOT_FOUND` | Group không tồn tại hoặc đã soft-deleted. |
| 409 | `GROUP_HAS_USERS` | Group còn user assigned (`user_groups.count > 0`). |
| 409 | `GROUP_IS_SYSTEM` | Group là system group (4 default). |

**Audit:** `group.delete`.

**WHEN-THEN-ELSE:**

- WHEN group là system → 409 `GROUP_IS_SYSTEM`.
- WHEN EXISTS user_groups WHERE groupId = :id → 409 `GROUP_HAS_USERS`. Client phải reassign user trước.
- ELSE soft delete; `group_permissions` rows vẫn giữ (audit history).

---

### 4.8 POST /groups/:id/permissions

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Bulk assign permission to group. Idempotent: existing assignment được skip qua `skipDuplicates: true`.

**Request body:**

```json
{ "permissions": ["report.view", "schedule.manage"] }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "groupId": "2",
    "added": ["report.view", "schedule.manage"],
    "skipped": []
  }
}
```

`skipped` = permission codes đã assigned (no-op).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | permission code không tồn tại; mảng rỗng. |
| 404 | `NOT_FOUND` | Group không tồn tại. |

**Audit:** `group.assign-permission` với payload `{groupId, added: [codes]}`.

**WHEN-THEN-ELSE:**

- WHEN permission code không tồn tại → 400 với `details: ["unknown permission: <code>"]`.
- WHEN mảng rỗng → 400 với `details: ["permissions: must contain at least 1 item"]`.
- ELSE bulk INSERT với `skipDuplicates`; trả set thực sự thêm trong `added`.

---

### 4.9 DELETE /groups/:id/permissions/:permissionId

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Revoke permission khỏi group.

**Response 204 No Content.**

**Errors:** `401`, `403`, `404 NOT_FOUND` (group hoặc permission không tồn tại hoặc chưa assigned).

**Audit:** `group.revoke-permission` (mới — Architecture v1.1.5 §4.4.1 chưa list; flag drift cuối doc).

**WHEN-THEN-ELSE:**

- WHEN không tồn tại row `group_permissions WHERE groupId AND permissionId` → 404. Idempotency: client retry phải handle 404 như success-state.

---

### 4.10 GET /users

**UC:** UC10
**Auth:** JWT
**RBAC:** `user.read`

**Description:** List user hệ thống (admin view). Khác với `GET /members` (Module 4) — endpoint này show TẤT CẢ user bất kể role (Owner/Staff/PT/Member), join với staff/member profile nếu có.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page`/`pageSize` | int | 1/20 | |
| `search` | string | — | LIKE `email`, `fullName`, `phone`. |
| `groupId` | string | — | Filter user thuộc group cụ thể. |
| `role` | string | — | Convenience: filter bằng group name (`owner`/`staff`/`trainer`/`member`). |
| `status` | enum | — | `pending_verification`/`active`/`locked`. |
| `includeDeleted` | boolean | false | `deleted_at IS NOT NULL`. |
| `sort` | string | `created_at:desc` | `field:asc\|desc`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "userId": "1",
      "email": "owner@gym.local",
      "fullName": "Pham Quoc Hung",
      "phone": "0900000001",
      "status": "active",
      "emailVerifiedAt": "2026-01-01T08:00:00.000Z",
      "roles": ["owner"],
      "createdAt": "2026-01-01T08:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 10 }
}
```

**Errors:** `401`, `403`.

---

### 4.11 GET /users/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `user.read` HOẶC `Self` (`:id === JWT.sub`)

**Description:** Detail 1 user kèm groups + profile (staff/member nested nếu có).

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "userId": "5",
    "email": "nguyen.van.a@email.com",
    "fullName": "Nguyen Van A",
    "phone": "0911000001",
    "status": "active",
    "emailVerifiedAt": "2026-02-01T09:30:00.000Z",
    "avatarFileId": null,
    "roles": ["member"],
    "groups": [{ "groupId": "4", "name": "member" }],
    "member": {
      "memberId": "1",
      "memberCode": "MB-2026-0001",
      "dateOfBirth": "1995-04-12",
      "primaryTrainerId": null
    },
    "staff": null,
    "createdAt": "2026-02-01T09:30:00.000Z",
    "deletedAt": null
  }
}
```

**Errors:** `401`, `403`, `404`.

**WHEN-THEN-ELSE:**

- WHEN JWT sub khớp `:id` → bypass `user.read` permission check (Self).
- ELSE require `user.read` permission.

---

### 4.12 GET /users/:id/groups

**UC:** UC10
**Auth:** JWT
**RBAC:** `user.read` HOẶC `Self`

**Description:** List group của 1 user (chi tiết kèm permission count). Lighter version của `GET /users/:id` khi UI chỉ cần group context.

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "groupId": "4",
      "name": "member",
      "description": "Hoi vien...",
      "assignedAt": "2026-02-01T09:30:00.000Z",
      "permissionCount": 8
    }
  ]
}
```

`assignedAt` = `user_groups.created_at` (nếu schema track; verify trong implementation phase).

---

### 4.13 POST /users/:id/groups

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Assign group cho user. Idempotent qua composite UNIQUE `(userId, groupId)`.

**Request body:**

```json
{ "groupId": "2" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "userId": "3",
    "groupId": "2",
    "groupName": "staff",
    "wasAlreadyAssigned": false
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | groupId không tồn tại. |
| 404 | `NOT_FOUND` | User không tồn tại. |

**Audit:** `user.assign-group` (mới — drift flag cuối doc).

**WHEN-THEN-ELSE:**

- WHEN row `user_groups (userId, groupId)` đã tồn tại → 200 OK với `wasAlreadyAssigned: true`, không tạo audit row mới.
- ELSE INSERT + audit.

---

### 4.14 DELETE /users/:id/groups/:groupId

**UC:** UC10
**Auth:** JWT
**RBAC:** `rbac.manage`

**Description:** Remove group assignment khỏi user.

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Assignment không tồn tại. |
| 409 | `USER_NEEDS_AT_LEAST_ONE_GROUP` | Sau khi remove sẽ còn 0 group. |

**Audit:** `user.revoke-group`.

**WHEN-THEN-ELSE:**

- WHEN remove sẽ làm user có 0 group → 409. Client phải assign group khác trước, hoặc soft-delete user (§4.16).
- ELSE DELETE row + audit.

---

### 4.15 PATCH /users/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `user.update` HOẶC `Self` (field-restricted)

**Description:** Update user profile + status. Self chỉ update được `fullName`, `phone`, `avatarFileId`. Admin có `user.update` có thêm `status`.

**Request body (admin):**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `fullName` | string | no | 1-255 ký tự. |
| `phone` | string | no | UNIQUE, `^0\d{9,10}$`. |
| `status` | enum | no | `active` hoặc `pending_verification`. `locked` MUST NOT set v1.0 (SRS UC00 Ghi chú lockout). |
| `avatarFileId` | string | no | FK `files.file_id`. |

**Request body (Self):** Bỏ `status` (sẽ trả 403 nếu Self truyền `status`).

**Response 200 OK:** User detail (giống §4.11).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | phone format / fullName length / status enum invalid. |
| 400 | `STATUS_LOCKED_FORBIDDEN` | client set `status='locked'`. |
| 403 | `FORBIDDEN` | Self update `status` field. |
| 404 | `NOT_FOUND` | User không tồn tại. |
| 409 | `DUPLICATE_VALUE` | Phone đã dùng (P2002). |

**Audit:** `user.update` với `before_data` + `after_data` (mask `passwordHash`).

**WHEN-THEN-ELSE:**

- WHEN client set `status='locked'` → 400 `STATUS_LOCKED_FORBIDDEN`. V1.0 không cho phép manual lock (xem SRS UC00 Ghi chú lockout, defer R20).
- WHEN Self gửi `status` → 403.
- WHEN phone trùng user khác → 409 `DUPLICATE_VALUE`.
- ELSE UPDATE + audit.

---

### 4.16 DELETE /users/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `user.delete`

**Description:** Soft delete user (`deleted_at = NOW()`). Cascade theo Database.md §Cascade Soft Delete Convention: member/staff/subscriptions tương ứng cũng `deleted_at = NOW()` trong cùng `$transaction`.

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401/403 | — | — |
| 404 | `NOT_FOUND` | User không tồn tại hoặc đã soft-deleted. |
| 409 | `USER_IS_SELF` | Client xóa chính mình (`:id === JWT.sub`). |
| 409 | `USER_IS_LAST_OWNER` | User là Owner duy nhất còn `deleted_at IS NULL`. |

**Audit:** `user.delete` với `before_data` = user snapshot. Cascade rows audit qua module liên quan (vd `member.delete`, `subscription.cancel` theo Architecture §4.4.1).

**WHEN-THEN-ELSE:**

- WHEN `:id === JWT.sub` → 409 `USER_IS_SELF`. Owner muốn tự "off-board" phải có Owner khác xóa.
- WHEN user là Owner duy nhất (`SELECT COUNT(*) FROM user_groups ug JOIN groups g ON ug.groupId = g.groupId WHERE g.name='owner' AND ug.deletedAt IS NULL = 1`) → 409 `USER_IS_LAST_OWNER`.
- WHEN user có member profile → cascade soft-delete `members.deleted_at` + active subscription → `cancelled`. Audit cascade rows.
- WHEN user có staff profile → cascade soft-delete `staff.deleted_at`. Audit `staff.delete`.
- WHEN user.email login sau khi `deleted_at IS NOT NULL` → UC00 step 4d generic 401 + audit `auth.login {success: false, reason: 'user_deleted'}` (Architecture §4.4.1 v1.1.5).
- ELSE soft delete + cascade.

---

## 5. Error Codes Appendix

Standard codes (9): xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 2:

| Code | HTTP | Module | Trigger |
|---|---|---|---|
| `GROUP_HAS_USERS` | 409 | Group | Soft delete group còn user assigned. |
| `GROUP_IS_SYSTEM` | 409 | Group | Xóa/rename system group. |
| `USER_NEEDS_AT_LEAST_ONE_GROUP` | 409 | User-Group | Remove last group khỏi user. |
| `USER_IS_SELF` | 409 | User | Delete chính JWT subject. |
| `USER_IS_LAST_OWNER` | 409 | User | Delete owner duy nhất. |
| `STATUS_LOCKED_FORBIDDEN` | 400 | User | Client cố set `status='locked'` v1.0. |

## 6. Audit Action Codes Used

Module 2 dùng các audit action sau (Architecture §4.4.1):

| Code | Architecture status | Trigger |
|---|---|---|
| `group.create` | Listed | §4.5 |
| `group.update` | Listed | §4.6 |
| `group.delete` | Listed | §4.7 |
| `group.assign-permission` | Listed | §4.8 |
| `group.revoke-permission` | **DRIFT — chưa list** | §4.9 |
| `user.assign-group` | **DRIFT — chưa list** | §4.13 |
| `user.revoke-group` | **DRIFT — chưa list** | §4.14 |
| `user.update` | Listed (Module column generic) | §4.15 |
| `user.delete` | Listed (cascade member/staff) | §4.16 |

3 drift mới flag để Architecture v1.1.6 thêm vào row Permission/User audit list.

## 7. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| All 16 | NOT IMPLEMENTED | PR scaffold cùng Module 4. Reuse `OwnershipGuard` (Module 4) + thêm `PermissionGuard` mới. |

`PermissionGuard` design hint:

- Decorator `@RequirePermission('rbac.manage')` per route.
- Guard load user permissions từ JWT (defer v1.1 sẽ embed permission list trong JWT payload để tránh DB lookup per request) HOẶC query realtime qua `user_groups → groups → group_permissions` (v1.0 default — đơn giản, chấp nhận latency).
- v1.0 cache user permissions trong-memory 60s sau lookup đầu để giảm load.

## 8. Cross-module Dependencies

- **Module 1** Auth: `JwtAuthGuard` global apply. Endpoint Module 2 không reset auth.
- **Module 4** Member: `DELETE /users/:id` cascade `members.deleted_at`. Module 4 phải implement OwnershipGuard pattern trước, Module 2 dùng lại.
- **Module 5** Staff (stub): `DELETE /users/:id` cascade `staff.deleted_at`. Endpoint `/staff` riêng cho profile CRUD.

## 9. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft phase 10 — 16 endpoint, derive permission catalog từ `seed.ts` (35 codes, 4 group). 3 audit code drift flag (group.revoke-permission, user.assign-group, user.revoke-group). |
