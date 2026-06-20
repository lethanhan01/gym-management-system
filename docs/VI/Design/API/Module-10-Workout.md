# Module 10 — Workout Plan API

## 1. Mục đích module

Module 10 đặc tả endpoint cho tính năng Workout Plan: thư viện bài tập, tạo/giao kế hoạch tập luyện, và ghi nhận kết quả buổi tập.

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/exercises` |
| 2 | `POST` | `/api/v1/exercises` |
| 3 | `GET` | `/api/v1/exercises/external` |
| 4 | `POST` | `/api/v1/exercises/import` |
| 5 | `PATCH` | `/api/v1/exercises/:id` |
| 6 | `DELETE` | `/api/v1/exercises/:id` |
| 7 | `GET` | `/api/v1/workout-plans` |
| 8 | `POST` | `/api/v1/workout-plans` |
| 9 | `GET` | `/api/v1/workout-plans/suggested` |
| 10 | `GET` | `/api/v1/workout-plans/members/:memberId/assignments` |
| 11 | `POST` | `/api/v1/workout-plans/members/:memberId/assign` |
| 12 | `DELETE` | `/api/v1/workout-plans/assignments/:assignmentId` |
| 13 | `GET` | `/api/v1/workout-plans/:id` |
| 14 | `PATCH` | `/api/v1/workout-plans/:id` |
| 15 | `DELETE` | `/api/v1/workout-plans/:id` |
| 16 | `GET` | `/api/v1/workout-plans/:id/assignments` |
| 17 | `POST` | `/api/v1/workout-plans/:id/days` |
| 18 | `PATCH` | `/api/v1/workout-plans/:id/days/:dayId` |
| 19 | `DELETE` | `/api/v1/workout-plans/:id/days/:dayId` |
| 20 | `POST` | `/api/v1/workout-plans/:id/days/:dayId/exercises` |
| 21 | `PATCH` | `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId` |
| 22 | `DELETE` | `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId` |
| 23 | `GET` | `/api/v1/workout-logs` |
| 24 | `POST` | `/api/v1/workout-logs` |
| 25 | `PATCH` | `/api/v1/workout-logs/:id` |

### 2.1 `GET /exercises`

**API method:** `GET`

**Endpoint URL:** `/api/v1/exercises`

**Mô tả:** List tất cả bài tập chưa bị soft-delete. Có thể filter theo category và muscleGroup.

Auth: JWT Quyền: exercise.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `category` | enum | no | — | `strength`, `cardio`, `flexibility`, `balance` |
| `muscleGroup` | string | no | — | ILIKE search trong `muscle_group` |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "exerciseId": "1",
      "name": "Squat",
      "category": "strength",
      "muscleGroup": "legs",
      "equipmentNeeded": null,
      "description": null,
      "imageUrl": null,
      "createdByStaffId": null,
      "deletedAt": null,
      "createdAt": "2026-05-23T08:00:00Z"
    }
  ]
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.2 `POST /exercises`

**API method:** `POST`

**Endpoint URL:** `/api/v1/exercises`

**Mô tả:** Tạo một bài tập mới trong thư viện bài tập nội bộ.

Auth: JWT Quyền: exercise.create

**Request body:**

```json
{
  "name": "Cable Fly",
  "category": "strength",
  "muscleGroup": "chest",
  "equipmentNeeded": "cable machine",
  "description": "Isolation exercise for chest muscles",
  "imageUrl": "https://example.com/cable-fly.jpg"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | 1-100 chars |
| `category` | enum | yes | `strength` / `cardio` / `flexibility` / `balance` |
| `muscleGroup` | string | no | max 100 chars |
| `equipmentNeeded` | string | no | max 100 chars |
| `description` | string | no | text |
| `imageUrl` | string | no | max 1000 chars |

**Response body:**

HTTP 201.

Exercise object như GET response.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field constraint vi phạm |
| `UNAUTHORIZED` | 401 | JWT missing/invalid |
| `FORBIDDEN` | 403 | Role không có `exercise.create` |

### 2.3 `GET /exercises/external`

**API method:** `GET`

**Endpoint URL:** `/api/v1/exercises/external`

**Mô tả:** Proxy tới ExerciseDB API bên ngoài. Trả về danh sách bài tập từ nguồn external, không lưu vào DB.

Auth: JWT Quyền: exercise.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `category` | string | no | — | Filter theo category từ ExerciseDB |
| `name` | string | no | — | Filter theo tên bài tập |
| `limit` | integer | no | — | Số kết quả tối đa trả về |
| `offset` | integer | no | — | Vị trí bắt đầu cho pagination |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [...]
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.4 `POST /exercises/import`

**API method:** `POST`

**Endpoint URL:** `/api/v1/exercises/import`

**Mô tả:** Nhập một bài tập từ ExerciseDB vào thư viện nội bộ.

Auth: JWT Quyền: exercise.create

**Request body:**

```json
{
  "name": "Barbell Squat",
  "category": "strength",
  "muscleGroup": "legs",
  "equipmentNeeded": "barbell",
  "description": "Compound lower body exercise",
  "imageUrl": "https://example.com/squat.jpg"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | — |
| `category` | enum | yes | `strength` / `cardio` / `flexibility` / `balance` |
| `muscleGroup` | string | no | — |
| `equipmentNeeded` | string | no | — |
| `description` | string | no | — |
| `imageUrl` | string | no | — |

**Response body:**

HTTP 200.

Exercise object vừa import.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field constraint vi phạm |
| `UNAUTHORIZED` | 401 | JWT missing/invalid |
| `FORBIDDEN` | 403 | Role không có `exercise.create` |

### 2.5 `PATCH /exercises/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/exercises/:id`

**Mô tả:** Cập nhật thông tin một bài tập.

Auth: JWT Quyền: exercise.update

**Request body:**

Partial, bất kỳ field nào trong CreateExerciseDto.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Updated exercise object.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Exercise không tồn tại hoặc đã soft-deleted |
| `FORBIDDEN` | 403 | Role không có `exercise.update` |

### 2.6 `DELETE /exercises/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/exercises/:id`

**Mô tả:** Soft-delete một bài tập chưa được dùng trong workout plan đang active.

Auth: JWT Quyền: exercise.delete

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{ "success": true }
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Exercise không tồn tại hoặc đã soft-deleted |
| `CONFLICT` | 409 | Exercise đang dùng trong active plan |

### 2.7 `GET /workout-plans`

**API method:** `GET`

**Endpoint URL:** `/api/v1/workout-plans`

**Mô tả:** List plans có filter theo role:
- `trainer` / `owner`: chỉ thấy plan do staff đó tạo (hoặc tất cả nếu owner).
- `member` (không có staff/trainer role): chỉ thấy plan do chính member đó tạo.
- `staff` / `owner`: thấy tất cả plans.

Auth: JWT Quyền: workout_plan.create

**Request body:**

Không có request body.

**Response body:**

HTTP 200.

Array of plan objects, mỗi plan include days và exercises.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.8 `POST /workout-plans`

**API method:** `POST`

**Endpoint URL:** `/api/v1/workout-plans`

**Mô tả:** Tạo một workout plan mới.

Auth: JWT Quyền: workout_plan.create

**Request body:**

```json
{
  "name": "Beginner Full Body 3x/week",
  "description": "Kế hoạch 12 tuần cho người mới"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | 1-100 chars |
| `description` | string | no | text |

**Response body:**

HTTP 201.

WorkoutPlan object với `status: "draft"`.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.9 `GET /workout-plans/suggested`

**API method:** `GET`

**Endpoint URL:** `/api/v1/workout-plans/suggested`

**Mô tả:** Trả về danh sách workout plan được đề xuất (suggested). Không yêu cầu RBAC permission — chỉ cần JWT hợp lệ.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Response body:**

HTTP 200.

Array of suggested plan objects.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.10 `GET /workout-plans/members/:memberId/assignments`

**API method:** `GET`

**Endpoint URL:** `/api/v1/workout-plans/members/:memberId/assignments`

**Mô tả:** Lấy lịch sử gán workout plan của một hội viên.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Path parameters:**

| Param | Type | Required |
|---|---|---|
| `memberId` | integer | yes |

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | no | Filter theo assignment status |
| `limit` | integer | no | Số kết quả tối đa |

**Response body:**

HTTP 200.

Danh sách MemberWorkoutPlan assignments của member.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.11 `POST /workout-plans/members/:memberId/assign`

**API method:** `POST`

**Endpoint URL:** `/api/v1/workout-plans/members/:memberId/assign`

**Mô tả:** Gán một workout plan active cho hội viên; assignment active cũ được chuyển sang replaced.

Auth: JWT Quyền: Authenticated

**Request body:**

```json
{
  "planId": 5,
  "startDate": "2026-06-01",
  "notes": "Bắt đầu sau buổi evaluation"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `planId` | integer | yes | plan phải tồn tại, không soft-deleted |
| `startDate` | date string | yes | ISO 8601 `YYYY-MM-DD` |
| `notes` | string | no | text |

**Path parameters:** `memberId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

MemberWorkoutPlan object mới.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan hoặc Member không tồn tại |
| `BAD_REQUEST` | 400 | Plan chưa có ngày tập nào |
| `PLAN_NOT_ACTIVE` | 400 | Plan không ở trạng thái `active` |

### 2.12 `DELETE /workout-plans/assignments/:assignmentId`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/workout-plans/assignments/:assignmentId`

**Mô tả:** Gỡ assignment workout plan khỏi hội viên theo quyền sở hữu.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Path parameters:**

| Param | Type | Required |
|---|---|---|
| `assignmentId` | integer | yes |

**Response body:**

HTTP 200.

```json
{ "success": true }
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 403 | `FORBIDDEN` | Thiếu quyền hoặc vi phạm ownership/business access; điều kiện cụ thể ghi bên dưới. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Assignment không tồn tại |
| `FORBIDDEN` | 403 | Caller không có quyền xóa assignment này |

### 2.13 `GET /workout-plans/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/workout-plans/:id`

**Mô tả:** Lấy chi tiết workout plan, gồm ngày tập và bài tập.

Auth: JWT Quyền: workout_plan.create

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Full plan detail gồm days → exercises (include exercise library data), sorted by dayNumber/orderIndex.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại hoặc soft-deleted |

### 2.14 `PATCH /workout-plans/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/workout-plans/:id`

**Mô tả:** Cập nhật metadata hoặc trạng thái workout plan.

Auth: JWT Quyền: workout_plan.update

**Request body:**

Partial — bất kỳ field nào:

```json
{
  "name": "Updated name",
  "status": "active"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | no | max 100 chars |
| `description` | string | no | text |
| `status` | enum | no | `draft` / `active` / `archived` |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Updated plan object.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `CONFLICT` | 409 | Plan đã có workout log — write-block |

### 2.15 `DELETE /workout-plans/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/workout-plans/:id`

**Mô tả:** Soft-delete workout plan khi plan không còn assignment active.

Auth: JWT Quyền: workout_plan.delete

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{ "success": true }
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `CONFLICT` | 409 | Plan đang active cho ít nhất 1 member |

### 2.16 `GET /workout-plans/:id/assignments`

**API method:** `GET`

**Endpoint URL:** `/api/v1/workout-plans/:id/assignments`

**Mô tả:** List tất cả MemberWorkoutPlan assignments của một plan cụ thể.

Auth: JWT Quyền: workout_plan.create

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Array of MemberWorkoutPlan objects.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `FORBIDDEN` | 403 | Role không có `workout_plan.create` |

### 2.17 `POST /workout-plans/:id/days`

**API method:** `POST`

**Endpoint URL:** `/api/v1/workout-plans/:id/days`

**Mô tả:** Thêm một ngày tập vào workout plan.

Auth: JWT Quyền: workout_plan.update

**Request body:**

```json
{
  "dayNumber": 1,
  "name": "Day 1 — Chest & Triceps",
  "notes": "Focus on form, not weight",
  "weekNumber": 1,
  "dayOfWeek": 1
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `dayNumber` | integer | yes | `@Min(1)` — unique trong plan |
| `name` | string | yes | 1-100 chars |
| `notes` | string | no | text |
| `weekNumber` | integer | no | `@Min(1)` |
| `dayOfWeek` | integer | no | `@Min(1)`, `@Max(7)` |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

WorkoutPlanDay object.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `CONFLICT` | 409 | `dayNumber` đã tồn tại trong plan hoặc write-block |

### 2.18 `PATCH /workout-plans/:id/days/:dayId`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/workout-plans/:id/days/:dayId`

**Mô tả:** Cập nhật một ngày tập thuộc workout plan.

Auth: JWT Quyền: workout_plan.update

**Request body:**

Partial — bất kỳ field nào:

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | no | max 100 chars |
| `notes` | string | no | text |
| `dayNumber` | integer | no | `@Min(1)` |
| `weekNumber` | integer | no | `@Min(1)` |
| `dayOfWeek` | integer | no | `@Min(1)`, `@Max(7)` |

**Path parameters:** `id`, `dayId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Updated WorkoutPlanDay.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan hoặc Day không tồn tại |
| `CONFLICT` | 409 | Write-block: plan đã có workout log |

### 2.19 `DELETE /workout-plans/:id/days/:dayId`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/workout-plans/:id/days/:dayId`

**Mô tả:** Xóa một ngày tập thuộc workout plan.

Auth: JWT Quyền: workout_plan.update

**Request body:**

Không có request body.

**Path parameters:** `id`, `dayId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{ "success": true }
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan hoặc Day không tồn tại |
| `CONFLICT` | 409 | Write-block: plan đã có workout log |

### 2.20 `POST /workout-plans/:id/days/:dayId/exercises`

**API method:** `POST`

**Endpoint URL:** `/api/v1/workout-plans/:id/days/:dayId/exercises`

**Mô tả:** Thêm bài tập vào một ngày của workout plan.

Auth: JWT Quyền: workout_plan.update

**Request body:**

```json
{
  "exerciseId": 1,
  "orderIndex": 0,
  "targetSets": 3,
  "targetReps": 10,
  "targetWeightKg": 60.0,
  "restSeconds": 90,
  "notes": "RPE 8"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `exerciseId` | integer | yes | must reference existing Exercise |
| `orderIndex` | integer | yes | `@Min(0)` — unique trong day |
| `targetSets` | integer | yes | `@Min(1)` |
| `targetReps` | integer | no | `@Min(1)` |
| `targetDurationSec` | integer | no | `@Min(1)` — dùng cho cardio/flexibility |
| `targetWeightKg` | decimal(6,2) | no | `@Min(0)` |
| `restSeconds` | integer | no | default 60, `@Min(0)` |
| `notes` | string | no | text |

**Path parameters:** `id`, `dayId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

WorkoutPlanExercise object.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Day hoặc Exercise không tồn tại |
| `CONFLICT` | 409 | `orderIndex` đã tồn tại trong day hoặc write-block |

### 2.21 `PATCH /workout-plans/:id/days/:dayId/exercises/:peId`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId`

**Mô tả:** Cập nhật cấu hình bài tập trong một ngày của workout plan.

Auth: JWT Quyền: workout_plan.update

**Request body:**

Partial — bất kỳ field nào:

| Field | Type | Required | Constraint |
|---|---|---|---|
| `targetSets` | integer | no | `@Min(1)` |
| `targetReps` | integer | no | `@Min(1)` |
| `targetDurationSec` | integer | no | `@Min(1)` |
| `targetWeightKg` | decimal(6,2) | no | `@Min(0)` |
| `restSeconds` | integer | no | `@Min(0)` |
| `notes` | string | no | text |

**Path parameters:** `id`, `dayId`, `peId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Updated WorkoutPlanExercise object.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan, Day, hoặc PlanExercise không tồn tại |
| `CONFLICT` | 409 | Write-block: plan đã có workout log |

### 2.22 `DELETE /workout-plans/:id/days/:dayId/exercises/:peId`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId`

**Mô tả:** Xóa bài tập khỏi một ngày của workout plan.

Auth: JWT Quyền: workout_plan.update

**Request body:**

Không có request body.

**Path parameters:** `id`, `dayId`, `peId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{ "success": true }
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan, Day, hoặc PlanExercise không tồn tại |
| `CONFLICT` | 409 | Write-block hoặc có WorkoutLogSet tham chiếu |

### 2.23 `GET /workout-logs`

**API method:** `GET`

**Endpoint URL:** `/api/v1/workout-logs`

**Mô tả:** List 50 workout logs gần nhất của member đang đăng nhập, sorted `logged_at DESC`. Include planDay và sets (với target từ exercise library).

Auth: JWT Quyền: workout_log.read

**Request body:**

Không có request body.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "logId": "10",
      "memberId": "5",
      "assignmentId": "3",
      "planDayId": "2",
      "loggedAt": "2026-05-23T07:30:00Z",
      "durationMin": 65,
      "notes": null,
      "planDay": {
        "planDayId": "2",
        "dayNumber": 1,
        "name": "Day 1 — Chest & Triceps"
      },
      "sets": [
        {
          "logSetId": "1",
          "planExerciseId": "3",
          "setNumber": 1,
          "actualReps": 10,
          "actualWeightKg": "60.00",
          "actualDurationSec": null,
          "completed": true,
          "planExercise": {
            "targetSets": 3,
            "targetReps": 10,
            "targetWeightKg": "60.00",
            "exercise": {
              "exerciseId": "1",
              "name": "Bench Press"
            }
          }
        }
      ]
    }
  ]
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.24 `POST /workout-logs`

**API method:** `POST`

**Endpoint URL:** `/api/v1/workout-logs`

**Mô tả:** Hội viên ghi nhận một buổi tập theo assignment và ngày tập hợp lệ.

Auth: JWT Quyền: workout_log.create

**Request body:**

```json
{
  "assignmentId": 3,
  "planDayId": 2,
  "loggedAt": "2026-05-23T07:30:00Z",
  "durationMin": 65,
  "notes": "Felt strong today",
  "sets": [
    {
      "planExerciseId": 3,
      "setNumber": 1,
      "actualReps": 10,
      "actualWeightKg": 62.5,
      "completed": true
    },
    {
      "planExerciseId": 3,
      "setNumber": 2,
      "actualReps": 8,
      "actualWeightKg": 60.0,
      "completed": true
    }
  ]
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `assignmentId` | integer | yes | phải là assignment `active` của caller |
| `planDayId` | integer | yes | phải thuộc plan của assignment |
| `loggedAt` | datetime string | yes | ISO 8601 |
| `durationMin` | integer | no | `@Min(1)` |
| `notes` | string | no | text |
| `sets` | array | yes | mảng LogSet, có thể rỗng |
| `sets[].planExerciseId` | integer | yes | phải thuộc planDay |
| `sets[].setNumber` | integer | yes | unique trong `(logId, planExerciseId)` |
| `sets[].actualReps` | integer | no | actual vs target |
| `sets[].actualWeightKg` | decimal | no | decimal(6,2) |
| `sets[].actualDurationSec` | integer | no | cho cardio/flexibility |
| `sets[].completed` | boolean | no | default `true` |

**Response body:**

HTTP 201.

WorkoutLog object include sets.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `FORBIDDEN` | 403 | Caller không có member profile hoặc assignment không thuộc caller |
| `BAD_REQUEST` | 400 | Assignment không active |
| `VALIDATION_ERROR` | 400 | `planDayId` không thuộc plan của assignment |

### 2.25 `PATCH /workout-logs/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/workout-logs/:id`

**Mô tả:** Hội viên cập nhật workout log của chính mình trong giới hạn 24 giờ.

Auth: JWT Quyền: workout_log.update

**Request body:**

Chỉ `notes` và `durationMin` — không sửa sets qua endpoint này (v1.0).

```json
{
  "notes": "Correction: actually completed 3 sets",
  "durationMin": 70
}
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Updated WorkoutLog object.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Log không tồn tại |
| `FORBIDDEN` | 403 | Ngoài 24h edit window hoặc không phải owner |
