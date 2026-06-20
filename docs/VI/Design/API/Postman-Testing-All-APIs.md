- [Postman Testing - All APIs](#postman-testing---all-apis)
  - [1. Environment Postman](#1-environment-postman)
  - [2. Quy ước nhanh](#2-quy-ước-nhanh)
  - [3. Health](#3-health)
  - [4. Module 1 - Auth](#4-module-1---auth)
  - [5. Module 2 - RBAC](#5-module-2---rbac)
    - [Permissions](#permissions)
    - [Groups](#groups)
    - [Users](#users)
  - [6. Module 3 - Packages](#6-module-3---packages)
  - [7. Module 4 - Members, Subscriptions, Payments](#7-module-4---members-subscriptions-payments)
    - [Members](#members)
    - [Subscriptions](#subscriptions)
    - [Payments](#payments)
  - [8. Module 5 - Staff](#8-module-5---staff)
  - [9. Module 6 - Facility](#9-module-6---facility)
    - [Rooms](#rooms)
    - [Equipment](#equipment)
    - [Maintenance Logs](#maintenance-logs)
  - [10. Module 7 - Training](#10-module-7---training)
    - [Training Sessions](#training-sessions)
    - [Attendance](#attendance)
    - [Member Progress](#member-progress)
  - [11. Module 8 - Feedback](#11-module-8---feedback)
  - [12. Module 9 - Reports](#12-module-9---reports)
  - [13. Module 10 - Workout](#13-module-10---workout)
    - [Exercises](#exercises)
    - [Workout Plans](#workout-plans)
    - [Workout Logs](#workout-logs)
  - [14. Thứ tự smoke test gợi ý](#14-thứ-tự-smoke-test-gợi-ý)
  - [15. Lưu ý lệch với tài liệu cũ](#15-lưu-ý-lệch-với-tài-liệu-cũ)


# Postman Testing - All APIs

File này tổng hợp API theo code hiện tại trong `server/src/**/*.controller.ts` để test bằng Postman. Tổng cộng có 109 route nếu tính cả `GET /health`.

## 1. Environment Postman

Tạo environment `GMS Local`:

| Variable | Value |
|---|---|
| `base_url` | `http://localhost:3000/api/v1` |
| `health_url` | `http://localhost:3000/health` |
| `jwt_token` | để trống, tự set sau login |
| `device_api_key` | giá trị `DEVICE_API_KEY` trong server `.env` |
| `userId` | ID user cần test |
| `groupId` | ID group cần test |
| `permissionId` | ID permission cần test |
| `packageId` | ID package cần test |
| `memberId` | ID member cần test |
| `subscriptionId` | ID subscription cần test |
| `paymentId` | ID payment cần test |
| `staffId` | ID staff/trainer cần test |
| `scheduleId` | ID staff schedule cần test |
| `roomId` | ID room cần test |
| `equipmentId` | ID equipment cần test |
| `maintenanceId` | ID maintenance log cần test |
| `sessionId` | ID training session cần test |
| `attendanceId` | ID attendance log cần test |
| `progressId` | ID member progress cần test |
| `feedbackId` | ID feedback cần test |
| `exerciseId` | ID exercise cần test |
| `planId` | ID workout plan cần test |
| `dayId` | ID workout plan day cần test |
| `planExerciseId` | ID exercise trong plan day cần test |
| `assignmentId` | ID member workout assignment cần test |
| `workoutLogId` | ID workout log cần test |

Header chung cho các request cần đăng nhập:

```http
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

Header riêng cho device endpoint:

```http
X-Device-API-Key: {{device_api_key}}
Content-Type: application/json
```

Tài khoản seed để login:

| Role | Email | Password |
|---|---|---|
| Owner | `owner@gym.local` | `Password123!` |
| Staff | `staff.linh@gym.local` | `Password123!` |
| Trainer | `trainer.minh@gym.local` | `Password123!` |
| Member | `nguyen.van.a@email.com` | `Password123!` |

Request login nên có script ở tab `Tests` để tự lưu token:

```javascript
const res = pm.response.json();
if (res?.data?.accessToken) {
  pm.environment.set("jwt_token", res.data.accessToken);
}
```

## 2. Quy ước nhanh

- Tất cả route API dùng prefix `{{base_url}}`, trừ `GET {{health_url}}`.
- ID trong path có thể dùng số hoặc string số, ví dụ `{{memberId}} = 1`.
- `DELETE` thường trả `204 No Content` hoặc `{ "success": true }`, tùy controller.
- Enum chính: `active`, `inactive`, `pending`, `cancelled`, `cash`, `bank_card`, `ewallet`, `success`, `failed`, `morning`, `afternoon`, `evening`, `scheduled`, `in_progress`, `completed`, `resolved`, `rejected`.
- Nếu gặp `401`, chạy lại `POST /auth/login`. Nếu gặp `403`, login bằng owner để smoke test toàn bộ.

## 3. Health

| Method | URL | Auth | Ghi chú |
|---|---|---|---|
| GET | `{{health_url}}` | Public | Kiểm tra server và DB |

## 4. Module 1 - Auth

| Method | URL | Auth | Body |
|---|---|---|---|
| POST | `{{base_url}}/auth/login` | Public | `LoginBody` |
| POST | `{{base_url}}/auth/logout` | Bearer | không |
| GET | `{{base_url}}/auth/me` | Bearer | không |
| POST | `{{base_url}}/auth/forgot-password` | Public | `EmailBody` |
| POST | `{{base_url}}/auth/reset-password` | Public | `ResetPasswordBody` |
| POST | `{{base_url}}/auth/verify-email` | Public | `VerifyEmailBody` |
| POST | `{{base_url}}/auth/resend-verify` | Public | `EmailBody` |
| POST | `{{base_url}}/auth/line-login` | Public | `LineLoginBody` |
| POST | `{{base_url}}/auth/change-password` | Bearer | `ChangePasswordBody` |

Body mẫu:

```json
{
  "email": "owner@gym.local",
  "password": "Password123!"
}
```

```json
{
  "email": "owner@gym.local"
}
```

```json
{
  "email": "owner@gym.local",
  "otp": "123456",
  "newPassword": "NewPassword123!"
}
```

```json
{
  "email": "new.member@example.com",
  "otp": "123456"
}
```

```json
{
  "idToken": "LINE_LIFF_ID_TOKEN"
}
```

```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!"
}
```

## 5. Module 2 - RBAC

### Permissions

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/permissions?page=1&pageSize=20&resource=member` | Bearer owner | query optional |
| GET | `{{base_url}}/permissions/{{permissionId}}` | Bearer owner | không |

### Groups

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/groups?page=1&pageSize=20&search=staff&includeDeleted=false` | Bearer owner | query optional |
| GET | `{{base_url}}/groups/{{groupId}}` | Bearer owner | không |
| POST | `{{base_url}}/groups` | Bearer owner | `CreateGroupBody` |
| PATCH | `{{base_url}}/groups/{{groupId}}` | Bearer owner | `UpdateGroupBody` |
| DELETE | `{{base_url}}/groups/{{groupId}}` | Bearer owner | không |
| POST | `{{base_url}}/groups/{{groupId}}/permissions` | Bearer owner | `AssignPermissionsBody` |
| DELETE | `{{base_url}}/groups/{{groupId}}/permissions/{{permissionId}}` | Bearer owner | không |

### Users

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/users?page=1&pageSize=20&role=member&status=active&sort=created_at:desc` | Bearer owner/staff | query optional |
| GET | `{{base_url}}/users/{{userId}}` | Bearer | self hoặc `user.read` |
| GET | `{{base_url}}/users/{{userId}}/groups` | Bearer | self hoặc `user.read` |
| POST | `{{base_url}}/users/{{userId}}/groups` | Bearer owner | `AssignGroupBody` |
| DELETE | `{{base_url}}/users/{{userId}}/groups/{{groupId}}` | Bearer owner | không |
| PATCH | `{{base_url}}/users/{{userId}}` | Bearer | self hoặc `user.update` |
| DELETE | `{{base_url}}/users/{{userId}}` | Bearer owner | không |

Body mẫu:

```json
{
  "name": "senior_trainer",
  "description": "Nhom trainer cap cao co them quyen quan ly lich tap",
  "permissions": ["session.manage", "progress.record"]
}
```

```json
{
  "description": "Cap nhat mo ta nhom quyen dung cho test Postman"
}
```

```json
{
  "permissions": ["member.read", "session.read"]
}
```

```json
{
  "groupId": "3"
}
```

```json
{
  "fullName": "Nguyen Van Updated",
  "phone": "0912345678",
  "status": "active"
}
```

## 6. Module 3 - Packages

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/packages?page=1&pageSize=20&status=active&search=basic` | Bearer | query optional |
| GET | `{{base_url}}/packages/{{packageId}}` | Bearer | không |
| POST | `{{base_url}}/packages` | Bearer owner/staff | `CreatePackageBody` |
| PATCH | `{{base_url}}/packages/{{packageId}}` | Bearer owner/staff | `UpdatePackageBody` |
| PATCH | `{{base_url}}/packages/{{packageId}}/status` | Bearer owner/staff | `PackageStatusBody` |
| DELETE | `{{base_url}}/packages/{{packageId}}` | Bearer owner/staff | không |

Body mẫu:

```json
{
  "name": "Goi test 1 thang",
  "durationDays": 30,
  "price": 500000,
  "benefits": "Tap gym khong gioi han",
  "status": "active"
}
```

```json
{
  "name": "Goi test cap nhat",
  "benefits": "Tap gym va cardio"
}
```

```json
{
  "status": "inactive"
}
```

## 7. Module 4 - Members, Subscriptions, Payments

### Members

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/members/me` | Bearer member | không |
| PATCH | `{{base_url}}/members/me` | Bearer member | `UpdateMemberBody` |
| POST | `{{base_url}}/members` | Bearer staff/owner | `CreateMemberBody` |
| POST | `{{base_url}}/members/self-register` | Public | `SelfRegisterBody` |
| GET | `{{base_url}}/members?page=1&pageSize=20&search=Nguyen&status=active` | Bearer staff/owner/trainer | query optional |
| GET | `{{base_url}}/members/{{memberId}}` | Bearer | self hoặc quyền đọc |
| PATCH | `{{base_url}}/members/{{memberId}}` | Bearer | self hoặc quyền cập nhật |
| DELETE | `{{base_url}}/members/{{memberId}}` | Bearer owner/staff | không |
| PATCH | `{{base_url}}/members/{{memberId}}/assign-trainer` | Bearer staff/owner | `AssignTrainerBody` |

Body mẫu:

```json
{
  "email": "member.test@example.com",
  "password": "Password123!",
  "fullName": "Member Test",
  "phone": "0912000001",
  "dateOfBirth": "1998-06-15",
  "address": "Quan 1, TP.HCM"
}
```

```json
{
  "email": "self.register@example.com",
  "password": "Password123!",
  "fullName": "Self Register",
  "phone": "0912000002",
  "dateOfBirth": "2000-01-01",
  "address": "Quan 3, TP.HCM",
  "packageId": 1
}
```

```json
{
  "fullName": "Member Test Updated",
  "phone": "0912999999",
  "dateOfBirth": "1998-06-15",
  "address": "Quan 7, TP.HCM"
}
```

```json
{
  "trainerId": 3
}
```

Để bỏ gán PT:

```json
{
  "trainerId": null
}
```

### Subscriptions

| Method | URL | Auth | Query/body |
|---|---|---|---|
| POST | `{{base_url}}/subscriptions` | Bearer | `CreateSubscriptionBody` |
| GET | `{{base_url}}/subscriptions?page=1&pageSize=20&memberId={{memberId}}&status=active` | Bearer | query optional |
| GET | `{{base_url}}/subscriptions/member/{{memberId}}` | Bearer | không |
| GET | `{{base_url}}/subscriptions/{{subscriptionId}}` | Bearer | không |
| PATCH | `{{base_url}}/subscriptions/{{subscriptionId}}/cancel` | Bearer | `CancelSubscriptionBody` |

Body mẫu:

```json
{
  "memberId": 1,
  "packageId": 1
}
```

```json
{
  "reason": "Hoi vien yeu cau huy goi"
}
```

### Payments

| Method | URL | Auth | Query/body |
|---|---|---|---|
| POST | `{{base_url}}/payments` | Bearer | `CreatePaymentBody` |
| GET | `{{base_url}}/payments?page=1&pageSize=20&memberId={{memberId}}&status=success&method=cash` | Bearer | query optional |

Body mẫu:

```json
{
  "memberId": 1,
  "subscriptionId": 1,
  "amount": 500000,
  "method": "cash",
  "status": "success"
}
```

Ví dụ chuyển khoản/thẻ:

```json
{
  "memberId": 1,
  "subscriptionId": 1,
  "amount": 500000,
  "method": "bank_card",
  "transactionReference": "TXN-POSTMAN-001",
  "status": "success"
}
```

## 8. Module 5 - Staff

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/staff` | Bearer `staff.read` | query optional |
| POST | `{{base_url}}/staff` | Bearer `staff.create` | `CreateStaffBody` |
| GET | `{{base_url}}/staff/{{staffId}}` | Bearer `staff.read` | không |
| PATCH | `{{base_url}}/staff/{{staffId}}` | Bearer `staff.update` | `UpdateStaffBody` |
| DELETE | `{{base_url}}/staff/{{staffId}}` | Bearer `staff.delete` | không |
| GET | `{{base_url}}/staff/{{staffId}}/schedules` | Bearer `schedule.read` | không |
| POST | `{{base_url}}/staff/{{staffId}}/schedules` | Bearer `schedule.manage` | `CreateScheduleBody` |
| DELETE | `{{base_url}}/staff/{{staffId}}/schedules/{{scheduleId}}` | Bearer `schedule.manage` | không |

Body mẫu:

```json
{
  "email": "staff.test@example.com",
  "phone": "0901111222",
  "fullName": "Nhan Vien Test",
  "position": "staff",
  "groupIds": ["2"]
}
```

```json
{
  "fullName": "Nhan Vien Test Updated",
  "phone": "0901111333",
  "position": "trainer"
}
```

```json
{
  "schedules": [
    {
      "shift": "morning",
      "workDate": "2026-06-10"
    },
    {
      "shift": "afternoon",
      "workDate": "2026-06-11"
    }
  ]
}
```

## 9. Module 6 - Facility

### Rooms

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/rooms?page=1&pageSize=20&roomType=yoga&search=studio` | Bearer `room.manage` | query optional |
| GET | `{{base_url}}/rooms/{{roomId}}` | Bearer `room.manage` | không |
| POST | `{{base_url}}/rooms` | Bearer `room.manage` | `CreateRoomBody` |
| PATCH | `{{base_url}}/rooms/{{roomId}}` | Bearer `room.manage` | `UpdateRoomBody` |
| DELETE | `{{base_url}}/rooms/{{roomId}}` | Bearer `room.manage` | không |

Body mẫu:

```json
{
  "roomCode": "RM-901",
  "name": "Yoga Studio Test",
  "roomType": "yoga",
  "capacity": 25,
  "description": "Phong test Postman"
}
```

```json
{
  "name": "Yoga Studio Test Updated",
  "capacity": 30,
  "description": "Cap nhat bang Postman"
}
```

### Equipment

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/equipment?page=1&pageSize=20&roomId={{roomId}}&status=active` | Bearer `equipment.manage` | query optional |
| GET | `{{base_url}}/equipment/{{equipmentId}}` | Bearer `equipment.manage` | không |
| POST | `{{base_url}}/equipment` | Bearer `equipment.manage` | `CreateEquipmentBody` |
| PATCH | `{{base_url}}/equipment/{{equipmentId}}` | Bearer `equipment.manage` | `UpdateEquipmentBody` |
| DELETE | `{{base_url}}/equipment/{{equipmentId}}?force=true` | Bearer `equipment.manage` | `force=true` optional, owner dùng khi cần force delete |

Body mẫu:

```json
{
  "equipmentCode": "EQ-900001",
  "roomId": 1,
  "name": "Treadmill Test",
  "importDate": "2026-06-01",
  "warrantyUntil": "2028-06-01"
}
```

```json
{
  "roomId": 1,
  "name": "Treadmill Test Updated",
  "status": "active",
  "warrantyUntil": "2028-12-31"
}
```

### Maintenance Logs

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/equipment/{{equipmentId}}/maintenance-logs?page=1&pageSize=20&status=reported` | Bearer `maintenance.read` | query optional |
| POST | `{{base_url}}/equipment/{{equipmentId}}/maintenance-logs` | Bearer `maintenance.report` | `CreateMaintenanceLogBody` |
| PATCH | `{{base_url}}/maintenance-logs/{{maintenanceId}}` | Bearer `maintenance.resolve` | `UpdateMaintenanceLogBody` |

Body mẫu:

```json
{
  "description": "May chay bo co tieng keu lon khi tang toc do"
}
```

```json
{
  "status": "repairing"
}
```

```json
{
  "status": "resolved"
}
```

## 10. Module 7 - Training

### Training Sessions

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/training-sessions?page=1&pageSize=20&status=scheduled&memberId={{memberId}}` | Bearer `session.read` | query optional |
| GET | `{{base_url}}/training-sessions/{{sessionId}}` | Bearer `session.read` | không |
| POST | `{{base_url}}/training-sessions` | Bearer `session.manage` | `CreateSessionBody` |
| PATCH | `{{base_url}}/training-sessions/{{sessionId}}` | Bearer `session.manage` | `UpdateSessionBody` |
| POST | `{{base_url}}/training-sessions/{{sessionId}}/cancel` | Bearer `session.manage` | `CancelSessionBody` |

Body mẫu:

```json
{
  "memberId": "1",
  "trainerStaffId": "3",
  "roomId": "1",
  "startTime": "2026-06-15T08:00:00.000Z",
  "endTime": "2026-06-15T09:00:00.000Z"
}
```

```json
{
  "trainerStaffId": "3",
  "roomId": "1",
  "startTime": "2026-06-15T09:00:00.000Z",
  "endTime": "2026-06-15T10:00:00.000Z"
}
```

```json
{
  "reason": "Hoi vien ban viec dot xuat"
}
```

### Attendance

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/attendance-logs?page=1&pageSize=20&memberId={{memberId}}&method=manual` | Bearer `attendance.read` | query optional |
| POST | `{{base_url}}/attendance/manual-checkin` | Bearer `attendance.checkin` | `ManualCheckinBody` |
| PATCH | `{{base_url}}/attendance-logs/{{attendanceId}}/checkout` | Bearer `attendance.checkin` | `CheckoutBody` |
| POST | `{{base_url}}/devices/access-events` | Device key | `DeviceAccessEventBody` |

Body mẫu:

```json
{
  "memberCode": "MB-2026-0001",
  "occurredAt": "2026-06-15T08:00:00.000Z"
}
```

```json
{
  "endedAt": "2026-06-15T10:00:00.000Z"
}
```

```json
{
  "memberIdentifier": "MB-2026-0001",
  "occurredAt": "2026-06-15T08:00:00.000Z",
  "deviceId": "DEV-FRONT-01"
}
```

Lưu ý code hiện tại chưa đánh dấu `DeviceController` bằng `@Public()`, nên global JWT guard có thể yêu cầu thêm `Authorization: Bearer {{jwt_token}}` ngoài `X-Device-API-Key`.

### Member Progress

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/members/{{memberId}}/progress?from=2026-06-01&to=2026-06-30&limit=20` | Bearer `progress.read` | query optional |
| POST | `{{base_url}}/members/{{memberId}}/progress` | Bearer `progress.record` | `CreateProgressBody` |
| DELETE | `{{base_url}}/member-progress/{{progressId}}` | Bearer `progress.record` | không |

Body mẫu:

```json
{
  "weight": 70.5,
  "bmi": 22.7,
  "goal": "Giam mo va tang co",
  "notes": "Tien do tot",
  "recordedAt": "2026-06-15T08:30:00.000Z"
}
```

## 11. Module 8 - Feedback

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/feedback?page=1&pageSize=20&status=open&feedbackType=service` | Bearer `feedback.read` | query optional |
| GET | `{{base_url}}/feedback/{{feedbackId}}` | Bearer `feedback.read` | không |
| POST | `{{base_url}}/feedback` | Bearer `feedback.create` | `CreateFeedbackBody` |
| PATCH | `{{base_url}}/feedback/{{feedbackId}}/assign` | Bearer `feedback.handle` | `AssignFeedbackBody` |
| PATCH | `{{base_url}}/feedback/{{feedbackId}}/status` | Bearer `feedback.handle` | `UpdateFeedbackStatusBody` |

Body mẫu:

```json
{
  "memberId": "1",
  "feedbackType": "service",
  "content": "De nghi mo them lop yoga buoi toi",
  "severity": "low"
}
```

```json
{
  "memberId": "1",
  "feedbackType": "equipment",
  "content": "May chay bo khu A bi loi man hinh",
  "severity": "medium",
  "subjectEquipmentId": "1"
}
```

```json
{
  "memberId": "1",
  "feedbackType": "staff",
  "content": "PT huong dan rat nhiet tinh",
  "severity": "low",
  "subjectStaffId": "3"
}
```

```json
{
  "handledByStaffId": "2"
}
```

```json
{
  "status": "in_progress",
  "severity": "medium"
}
```

```json
{
  "status": "resolved",
  "resolutionNote": "Da lien he hoi vien va xu ly"
}
```

## 12. Module 9 - Reports

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/reports/revenue?from=2026-06-01&to=2026-06-30` | Bearer `report.view` | query bắt buộc |
| GET | `{{base_url}}/reports/members?from=2026-06-01&to=2026-06-30` | Bearer `report.view` | query bắt buộc |
| GET | `{{base_url}}/reports/renewals?from=2026-06-01&to=2026-06-30` | Bearer `report.view` | query bắt buộc |
| GET | `{{base_url}}/reports/staff-performance?from=2026-06-01&to=2026-06-30&staffId={{staffId}}` | Bearer `report.view` | `staffId` optional |

## 13. Module 10 - Workout

### Exercises

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/exercises?category=strength&muscleGroup=chest` | Bearer `exercise.read` | query optional |
| POST | `{{base_url}}/exercises` | Bearer `exercise.create` | `CreateExerciseBody` |
| PATCH | `{{base_url}}/exercises/{{exerciseId}}` | Bearer `exercise.update` | `UpdateExerciseBody` |
| DELETE | `{{base_url}}/exercises/{{exerciseId}}` | Bearer `exercise.delete` | không |

Body mẫu:

```json
{
  "name": "Incline Dumbbell Press",
  "category": "strength",
  "muscleGroup": "chest",
  "equipmentNeeded": "dumbbell",
  "description": "Bai tap nguc tren voi ta don"
}
```

```json
{
  "name": "Incline Dumbbell Press Updated",
  "description": "Cap nhat mo ta bai tap"
}
```

### Workout Plans

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/workout-plans` | Bearer `workout_plan.create` | không |
| POST | `{{base_url}}/workout-plans` | Bearer `workout_plan.create` | `CreateWorkoutPlanBody` |
| GET | `{{base_url}}/workout-plans/{{planId}}` | Bearer `workout_plan.create` | không |
| PATCH | `{{base_url}}/workout-plans/{{planId}}` | Bearer `workout_plan.update` | `UpdateWorkoutPlanBody` |
| DELETE | `{{base_url}}/workout-plans/{{planId}}` | Bearer `workout_plan.delete` | không |
| POST | `{{base_url}}/workout-plans/{{planId}}/days` | Bearer `workout_plan.update` | `AddPlanDayBody` |
| PATCH | `{{base_url}}/workout-plans/{{planId}}/days/{{dayId}}` | Bearer `workout_plan.update` | `UpdatePlanDayBody` |
| DELETE | `{{base_url}}/workout-plans/{{planId}}/days/{{dayId}}` | Bearer `workout_plan.update` | không |
| POST | `{{base_url}}/workout-plans/{{planId}}/days/{{dayId}}/exercises` | Bearer `workout_plan.update` | `AddPlanExerciseBody` |
| DELETE | `{{base_url}}/workout-plans/{{planId}}/days/{{dayId}}/exercises/{{planExerciseId}}` | Bearer `workout_plan.update` | không |
| GET | `{{base_url}}/workout-plans/members/{{memberId}}/assignments?status=active&limit=10` | Bearer | query optional |
| POST | `{{base_url}}/workout-plans/members/{{memberId}}/assign` | Bearer `workout_plan.assign` | `AssignPlanBody` |

Body mẫu:

```json
{
  "name": "Giao an tang co 4 tuan",
  "description": "Danh cho nguoi moi tap"
}
```

```json
{
  "name": "Giao an tang co 4 tuan - updated",
  "description": "Cap nhat muc tieu",
  "status": "active"
}
```

```json
{
  "dayNumber": 1,
  "name": "Ngay 1 - Nguc va tay sau",
  "notes": "Khoi dong 10 phut"
}
```

```json
{
  "name": "Ngay 1 - Upper body",
  "notes": "Tang thoi gian khoi dong"
}
```

```json
{
  "exerciseId": 1,
  "orderIndex": 1,
  "targetSets": 4,
  "targetReps": 12,
  "targetWeightKg": 40,
  "restSeconds": 90,
  "notes": "Giu form cham"
}
```

```json
{
  "planId": 1,
  "startDate": "2026-06-15",
  "notes": "Tap 3 buoi moi tuan"
}
```

### Workout Logs

| Method | URL | Auth | Query/body |
|---|---|---|---|
| GET | `{{base_url}}/workout-logs` | Bearer `workout_log.read` | không |
| POST | `{{base_url}}/workout-logs` | Bearer `workout_log.create` | `CreateWorkoutLogBody` |
| PATCH | `{{base_url}}/workout-logs/{{workoutLogId}}` | Bearer `workout_log.update` | `UpdateWorkoutLogBody` |

Body mẫu:

```json
{
  "assignmentId": 1,
  "planDayId": 1,
  "loggedAt": "2026-06-15T10:00:00.000Z",
  "durationMin": 55,
  "notes": "Hoan thanh tot buoi tap",
  "sets": [
    {
      "planExerciseId": 1,
      "setNumber": 1,
      "actualReps": 12,
      "actualWeightKg": 40,
      "completed": true
    },
    {
      "planExerciseId": 1,
      "setNumber": 2,
      "actualReps": 10,
      "actualWeightKg": 42.5,
      "completed": true
    }
  ]
}
```

```json
{
  "durationMin": 60,
  "notes": "Cap nhat ghi chu sau buoi tap"
}
```

## 14. Thứ tự smoke test gợi ý

1. `GET {{health_url}}`
2. `POST /auth/login` bằng owner và lưu `jwt_token`
3. `GET /auth/me`
4. `GET /permissions`, `GET /groups`, `GET /users`
5. `GET /packages`, sau đó tạo package test nếu cần
6. `GET /members`, chọn `memberId`
7. `GET /staff`, chọn `staffId` trainer
8. `GET /rooms`, chọn `roomId`
9. `GET /equipment`, chọn `equipmentId`
10. `GET /training-sessions`, `GET /attendance-logs`
11. `GET /feedback`
12. `GET /reports/revenue?from=2026-06-01&to=2026-06-30`
13. `GET /exercises`, `GET /workout-plans`, `GET /workout-logs`

## 15. Lưu ý lệch với tài liệu cũ

- OpenAPI hiện tại chưa bao phủ đủ Module 5, 7, 8, 9, 10.
- Workout endpoint trong code là `/exercises`, `/workout-plans`, `/workout-logs`, không phải `/workout/exercises`.
- Training attendance endpoint trong code là `/attendance-logs` và `/attendance/manual-checkin`.
- Staff schedule body hiện tại là `{ "schedules": [...] }`, không phải một object schedule đơn lẻ.
- Device access event body trong code dùng camelCase: `memberIdentifier`, `occurredAt`, `deviceId`.
