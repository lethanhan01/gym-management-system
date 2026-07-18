# Auth API

Nguồn: `server/src/auth/auth.controller.ts`, `server/src/auth/dto`.

Base path: `/api/v1/auth`

Auth mặc định: cần `Authorization: Bearer <JWT>`, trừ endpoint có ghi `Public`.

## Endpoint Summary

| Method | URL | Auth | Permission | Mô tả |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Không có | Đăng nhập |
| POST | `/api/v1/auth/logout` | JWT | Không có | Đăng xuất không lưu trạng thái |
| GET | `/api/v1/auth/me` | JWT | Không có | Lấy thông tin người dùng hiện tại |
| POST | `/api/v1/auth/forgot-password` | Public | Không có | Gửi OTP đặt lại mật khẩu |
| POST | `/api/v1/auth/reset-password` | Public | Không có | Đặt lại mật khẩu bằng OTP |
| POST | `/api/v1/auth/verify-email` | Public | Không có | Xác thực email bằng OTP |
| POST | `/api/v1/auth/resend-verify` | Public | Không có | Gửi lại OTP xác thực email |
| POST | `/api/v1/auth/line-login` | Public | Không có | Đăng nhập bằng mã định danh LINE |
| POST | `/api/v1/auth/line-link` | JWT | Không có | Liên kết LINE với tài khoản hiện tại |
| DELETE | `/api/v1/auth/line-link` | JWT | Không có | Hủy liên kết LINE |
| POST | `/api/v1/auth/change-password` | JWT | Không có | Đổi mật khẩu |

## API Details

### Đăng nhập - POST `/api/v1/auth/login`

Request body:

```json
{
  "email": "member@example.com",
  "password": "Password123"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "userId": "1",
      "email": "member@example.com",
      "fullName": "Nguyen Van A",
      "roles": ["member"]
    }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 EMAIL_NOT_VERIFIED`.

### Đăng xuất không lưu trạng thái - POST `/api/v1/auth/logout`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "message": "Đã đăng xuất khỏi tài khoản member@example.com"
}
```

Errors: `401 UNAUTHORIZED`.

### Lấy thông tin người dùng hiện tại - GET `/api/v1/auth/me`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "userId": "1",
    "email": "member@example.com",
    "phone": "0900000000",
    "fullName": "Nguyen Van A",
    "status": "active",
    "roles": ["member"],
    "staffId": null,
    "memberId": "1",
    "lineLinked": false
  }
}
```

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### Gửi OTP đặt lại mật khẩu - POST `/api/v1/auth/forgot-password`

Request body:

```json
{
  "email": "member@example.com"
}
```

Response body:

```json
{
  "success": true,
  "message": "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi"
}
```

Errors: `400 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED`.

### Đặt lại mật khẩu bằng OTP - POST `/api/v1/auth/reset-password`

Request body:

```json
{
  "email": "member@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123"
}
```

Response body:

```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công"
}
```

Errors: `400 VALIDATION_ERROR`, `400 OTP_INVALID`, `400 OTP_EXPIRED`.

### Xác thực email bằng OTP - POST `/api/v1/auth/verify-email`

Request body:

```json
{
  "email": "member@example.com",
  "otp": "123456"
}
```

Response body:

```json
{
  "success": true,
  "message": "Xác thực email thành công"
}
```

Errors: `400 VALIDATION_ERROR`, `400 OTP_INVALID`, `400 OTP_EXPIRED`, `409 EMAIL_ALREADY_VERIFIED`.

### Gửi lại OTP xác thực email - POST `/api/v1/auth/resend-verify`

Request body:

```json
{
  "email": "member@example.com"
}
```

Response body:

```json
{
  "success": true,
  "message": "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi"
}
```

Errors: `400 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED`.

### Đăng nhập bằng mã định danh LINE - POST `/api/v1/auth/line-login`

Request body:

```json
{
  "idToken": "line-id-token"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "userId": "1",
      "email": "member@example.com",
      "roles": ["member"]
    }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`.

### Liên kết LINE với tài khoản hiện tại - POST `/api/v1/auth/line-link`

Request body:

```json
{
  "idToken": "line-id-token"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "lineLinked": true
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `409 DUPLICATE_VALUE`.

### Hủy liên kết LINE - DELETE `/api/v1/auth/line-link`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "message": "Đã hủy liên kết tài khoản LINE"
}
```

Errors: `401 UNAUTHORIZED`.

### Đổi mật khẩu - POST `/api/v1/auth/change-password`

Request body:

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

Response body:

```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công"
}
```

Errors: `400 VALIDATION_ERROR`, `400 BAD_REQUEST`, `401 UNAUTHORIZED`.
