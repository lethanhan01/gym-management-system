# Reports API

Nguồn: `server/src/reports/reports.controller.ts`, `server/src/reports/dto/report-range.dto.ts`.

Base path: `/api/v1/reports`

Auth mặc định: JWT + `PermissionsGuard`, class-level permission `report.view`.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/reports/revenue` | `report.view` | Báo cáo doanh thu |
| GET | `/api/v1/reports/members` | `report.view` | Báo cáo hội viên |
| GET | `/api/v1/reports/renewals` | `report.view` | Báo cáo gia hạn |
| GET | `/api/v1/reports/employee-performance` | `report.view` | Hiệu suất nhân viên |
| GET | `/api/v1/reports/employee-performance/:staffId/detail` | `report.view` | Chi tiết hiệu suất nhân viên |
| GET | `/api/v1/reports/staff-performance` | `report.view` | Báo cáo staff performance |
| GET | `/api/v1/reports/top-packages` | `report.view` | Gói bán chạy |

## API Details

### GET `/api/v1/reports/revenue`

Query: `from` string required, `to` string required, `method=cash|bank_card|ewallet` optional.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "from": "2026-07-01",
    "to": "2026-07-31",
    "totalRevenue": "5000000.00",
    "items": []
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET `/api/v1/reports/members`

Query: `from` string required, `to` string required, `method` accepted by DTO but ignored by controller/service call.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "from": "2026-07-01",
    "to": "2026-07-31",
    "newMembers": 10,
    "activeMembers": 100
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET `/api/v1/reports/renewals`

Query: `from` string required, `to` string required, `method` accepted by DTO but ignored by controller/service call.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "from": "2026-07-01",
    "to": "2026-07-31",
    "renewals": 12
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET `/api/v1/reports/employee-performance`

Query: `from` string required, `to` string required, `method` accepted by DTO but ignored by controller/service call.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1",
      "fullName": "Tran Staff",
      "sessions": 20,
      "revenue": "3000000.00"
    }
  ]
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET `/api/v1/reports/employee-performance/:staffId/detail`

Params: `staffId` string.

Query: `from` string required, `to` string required, `method` accepted by DTO but ignored by controller/service call.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "from": "2026-07-01",
    "to": "2026-07-31",
    "items": []
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### GET `/api/v1/reports/staff-performance`

Query: `from` string required, `to` string required, `staffId` string optional, `method` accepted by inherited DTO but ignored by controller/service call.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1",
      "fullName": "Tran Staff",
      "sessions": 20
    }
  ]
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET `/api/v1/reports/top-packages`

Query: `from` string required, `to` string required, `method` accepted by DTO but ignored by controller/service call.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "packageId": "1",
      "name": "Gói tháng",
      "soldCount": 30,
      "revenue": "15000000.00"
    }
  ]
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.
