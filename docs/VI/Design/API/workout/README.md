# Workout API

Nguồn: `server/src/workout/exercises`, `server/src/workout/workout-plans`, `server/src/workout/workout-logs`.

Base paths: `/api/v1/exercises`, `/api/v1/workout-plans`, `/api/v1/workout-logs`

Auth mặc định: JWT + `PermissionsGuard`.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/exercises` | `exercise.read` | Danh sách bài tập |
| POST | `/api/v1/exercises` | `exercise.create` | Tạo bài tập |
| GET | `/api/v1/exercises/external` | `exercise.read` | Tìm bài tập từ ExerciseDB |
| POST | `/api/v1/exercises/import` | `exercise.create` | Nhập bài tập ngoài |
| PATCH | `/api/v1/exercises/:id` | `exercise.update` | Cập nhật bài tập |
| DELETE | `/api/v1/exercises/:id` | `exercise.delete` | Xóa mềm bài tập |
| GET | `/api/v1/workout-plans` | `workout_plan.create` | Danh sách giáo án tập |
| POST | `/api/v1/workout-plans` | `workout_plan.create` | Tạo giáo án tập |
| PATCH | `/api/v1/workout-plans/:id` | `workout_plan.update` | Cập nhật giáo án tập |
| DELETE | `/api/v1/workout-plans/:id` | `workout_plan.delete` | Xóa mềm giáo án tập |
| POST | `/api/v1/workout-plans/:id/days` | `workout_plan.update` | Thêm ngày tập |
| PATCH | `/api/v1/workout-plans/:id/days/:dayId` | `workout_plan.update` | Cập nhật ngày tập |
| DELETE | `/api/v1/workout-plans/:id/days/:dayId` | `workout_plan.update` | Xóa ngày tập |
| POST | `/api/v1/workout-plans/:id/days/:dayId/exercises` | `workout_plan.update` | Thêm bài tập vào ngày |
| DELETE | `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId` | `workout_plan.update` | Xóa bài tập khỏi ngày |
| PATCH | `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId` | `workout_plan.update` | Cập nhật bài tập trong giáo án |
| GET | `/api/v1/workout-plans/members/:memberId/assignments` | Service kiểm tra caller | Danh sách giáo án đã gán cho hội viên |
| POST | `/api/v1/workout-plans/members/:memberId/assign` | Service kiểm tra caller | Gán giáo án tập cho hội viên |
| GET | `/api/v1/workout-plans/suggested` | JWT | Danh sách giáo án gợi ý |
| GET | `/api/v1/workout-plans/:id/assignments` | `workout_plan.create` | Danh sách lượt gán theo giáo án |
| DELETE | `/api/v1/workout-plans/assignments/:assignmentId` | Service kiểm tra caller | Hủy lượt gán giáo án |
| GET | `/api/v1/workout-plans/:id` | `workout_plan.create` | Chi tiết giáo án tập |
| GET | `/api/v1/workout-logs` | `workout_log.read` | Danh sách nhật ký tập luyện |
| POST | `/api/v1/workout-logs` | `workout_log.create` | Tạo nhật ký tập luyện |
| PATCH | `/api/v1/workout-logs/:id` | `workout_log.update` | Cập nhật nhật ký tập luyện |

## API Details

### Danh sách bài tập - GET `/api/v1/exercises`

Query: `category=strength|cardio|flexibility|balance`, `muscleGroup` string optional.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "exerciseId": "1",
      "name": "Bench Press",
      "category": "strength",
      "muscleGroup": "chest",
      "equipmentNeeded": "barbell",
      "description": "Đẩy ngực với tạ đòn",
      "imageUrl": "https://example.com/bench.png"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Tạo bài tập - POST `/api/v1/exercises`

Request body:

```json
{
  "name": "Bench Press",
  "category": "strength",
  "muscleGroup": "chest",
  "equipmentNeeded": "barbell",
  "description": "Đẩy ngực với tạ đòn",
  "imageUrl": "https://example.com/bench.png"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "exerciseId": "1",
    "name": "Bench Press",
    "category": "strength"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 DUPLICATE_VALUE`.

### Tìm bài tập từ ExerciseDB - GET `/api/v1/exercises/external`

Query: `category` string optional, `name` string optional, `limit` string optional, `offset` string optional.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "name": "Push Up",
      "category": "strength",
      "muscleGroup": "chest",
      "equipmentNeeded": "body weight",
      "imageUrl": "https://example.com/push-up.gif"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Nhập bài tập ngoài - POST `/api/v1/exercises/import`

Request body:

```json
{
  "name": "Push Up",
  "category": "strength",
  "muscleGroup": "chest",
  "equipmentNeeded": "body weight",
  "description": "Hít đất",
  "imageUrl": "https://example.com/push-up.gif"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "exerciseId": "2",
    "name": "Push Up",
    "category": "strength"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 DUPLICATE_VALUE`.

### Cập nhật bài tập - PATCH `/api/v1/exercises/:id`

Params: `id` number.

Request body:

```json
{
  "name": "Bench Press",
  "category": "strength",
  "muscleGroup": "chest",
  "equipmentNeeded": "barbell",
  "description": "Đẩy ngực với tạ đòn",
  "imageUrl": "https://example.com/bench.png"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "exerciseId": "1",
    "name": "Bench Press",
    "category": "strength"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Xóa mềm bài tập - DELETE `/api/v1/exercises/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách giáo án tập - GET `/api/v1/workout-plans`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "planId": "1",
      "name": "Beginner Strength",
      "description": "Plan cơ bản",
      "status": "draft"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Tạo giáo án tập - POST `/api/v1/workout-plans`

Request body:

```json
{
  "name": "Beginner Strength",
  "description": "Plan cơ bản"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "planId": "1",
    "name": "Beginner Strength",
    "status": "draft"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Cập nhật giáo án tập - PATCH `/api/v1/workout-plans/:id`

Params: `id` number.

Request body:

```json
{
  "name": "Beginner Strength",
  "description": "Plan cơ bản cập nhật",
  "status": "active"
}
```

`status` enum: `draft|active|archived`.

Response body:

```json
{
  "success": true,
  "data": {
    "planId": "1",
    "name": "Beginner Strength",
    "status": "active"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Xóa mềm giáo án tập - DELETE `/api/v1/workout-plans/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Thêm ngày tập - POST `/api/v1/workout-plans/:id/days`

Params: `id` number.

Request body:

```json
{
  "weekNumber": 1,
  "dayOfWeek": 1,
  "dayNumber": 1,
  "name": "Push Day",
  "notes": "Ngực, vai, tay sau"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "planDayId": "1",
    "planId": "1",
    "dayNumber": 1,
    "name": "Push Day"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Cập nhật ngày tập - PATCH `/api/v1/workout-plans/:id/days/:dayId`

Params: `id` number, `dayId` number.

Request body:

```json
{
  "weekNumber": 1,
  "dayOfWeek": 1,
  "dayNumber": 1,
  "name": "Push Day",
  "notes": "Ngực, vai, tay sau"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "planDayId": "1",
    "dayNumber": 1,
    "name": "Push Day"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Xóa ngày tập - DELETE `/api/v1/workout-plans/:id/days/:dayId`

Params: `id` number, `dayId` number.

Request body: Không có.

Response body:

```json
{
  "success": true
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Thêm bài tập vào ngày - POST `/api/v1/workout-plans/:id/days/:dayId/exercises`

Params: `id` number, `dayId` number.

Request body:

```json
{
  "exerciseId": 1,
  "orderIndex": 0,
  "targetSets": 4,
  "targetReps": 10,
  "targetDurationSec": 60,
  "targetWeightKg": 40.5,
  "restSeconds": 90,
  "notes": "Giữ form ổn định"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "planExerciseId": "1",
    "planDayId": "1",
    "exerciseId": "1",
    "targetSets": 4
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Xóa bài tập khỏi ngày - DELETE `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId`

Params: `id` number, `dayId` number, `peId` number.

Request body: Không có.

Response body:

```json
{
  "success": true
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Cập nhật bài tập trong giáo án - PATCH `/api/v1/workout-plans/:id/days/:dayId/exercises/:peId`

Params: `id` number, `dayId` number, `peId` number.

Request body:

```json
{
  "targetSets": 4,
  "targetReps": 10,
  "targetDurationSec": 60,
  "targetWeightKg": 40.5,
  "restSeconds": 90,
  "notes": "Tăng tạ nếu đủ reps"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "planExerciseId": "1",
    "targetSets": 4,
    "targetReps": 10
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách giáo án đã gán cho hội viên - GET `/api/v1/workout-plans/members/:memberId/assignments`

Params: `memberId` number.

Query: `status` string optional, `limit` string optional.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "assignmentId": "1",
      "memberId": "1",
      "planId": "1",
      "status": "active"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Gán giáo án tập cho hội viên - POST `/api/v1/workout-plans/members/:memberId/assign`

Params: `memberId` number.

Request body:

```json
{
  "planId": 1,
  "startDate": "2026-07-18",
  "notes": "Bắt đầu tuần đầu tiên"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "assignmentId": "1",
    "memberId": "1",
    "planId": "1",
    "status": "active"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### Danh sách giáo án gợi ý - GET `/api/v1/workout-plans/suggested`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "planId": "1",
      "name": "Beginner Strength",
      "status": "active"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`.

### Danh sách lượt gán theo giáo án - GET `/api/v1/workout-plans/:id/assignments`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "assignmentId": "1",
      "memberId": "1",
      "planId": "1",
      "status": "active"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Hủy lượt gán giáo án - DELETE `/api/v1/workout-plans/assignments/:assignmentId`

Params: `assignmentId` number.

Request body: Không có.

Response body:

```json
{
  "success": true
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Chi tiết giáo án tập - GET `/api/v1/workout-plans/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "planId": "1",
    "name": "Beginner Strength",
    "description": "Plan cơ bản",
    "status": "active",
    "days": []
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách nhật ký tập luyện - GET `/api/v1/workout-logs`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "logId": "1",
      "assignmentId": "1",
      "planDayId": "1",
      "loggedAt": "2026-07-18T08:00:00.000Z"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Tạo nhật ký tập luyện - POST `/api/v1/workout-logs`

Request body:

```json
{
  "assignmentId": 1,
  "planDayId": 1,
  "loggedAt": "2026-07-18T08:00:00.000Z",
  "durationMin": 60,
  "notes": "Hoàn thành tốt",
  "sets": [
    {
      "planExerciseId": 1,
      "setNumber": 1,
      "actualReps": 10,
      "actualWeightKg": 40.5,
      "actualDurationSec": 60,
      "completed": true
    }
  ]
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "logId": "1",
    "assignmentId": "1",
    "planDayId": "1",
    "sets": [
      {
        "setId": "1",
        "planExerciseId": "1",
        "setNumber": 1
      }
    ]
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### Cập nhật nhật ký tập luyện - PATCH `/api/v1/workout-logs/:id`

Params: `id` number.

Request body:

```json
{
  "notes": "Cập nhật ghi chú",
  "durationMin": 65
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "logId": "1",
    "notes": "Cập nhật ghi chú",
    "durationMin": 65
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
