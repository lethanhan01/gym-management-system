# Module 9 — Report API

## 1. Mục đích module

Module 9 đặc tả 7 endpoint báo cáo tổng hợp (aggregation) phục vụ UC12 (Xem báo cáo thống kê). Tất cả endpoint đều read-only — truy vấn trực tiếp DB, không mutate dữ liệu.

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/reports/revenue` |
| 2 | `GET` | `/api/v1/reports/members` |
| 3 | `GET` | `/api/v1/reports/renewals` |
| 4 | `GET` | `/api/v1/reports/staff-performance` |
| 5 | `GET` | `/api/v1/reports/employee-performance` |
| 6 | `GET` | `/api/v1/reports/employee-performance/:staffId/detail` |
| 7 | `GET` | `/api/v1/reports/top-packages` |

### 2.1 `GET /reports/revenue`

**API method:** `GET`

**Endpoint URL:** `/api/v1/reports/revenue`

**Mô tả:** Tổng hợp doanh thu từ `payments` trong khoảng `[from, to]`. Chỉ tính payment có `status='success'`. Trả tổng và breakdown theo ngày.

Auth: JWT Quyền: report.view

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | Ngày bắt đầu range (inclusive). Phải `<= to`. |
| `to` | `YYYY-MM-DD` | Yes | Ngày kết thúc range (inclusive). Phải `<= today_vn`. |
| `method` | string | No | Lọc theo phương thức thanh toán. Giá trị cho phép: `cash`, `bank_card`, `ewallet`. Mặc định: tất cả phương thức. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "total": "15000000",
    "currency": "VND",
    "breakdown": [
      { "date": "2026-05-01", "amount": "2000000" },
      { "date": "2026-05-02", "amount": "3500000" }
    ]
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`total` là string (Decimal serialize theo convention BigInt/Decimal). `breakdown` là array các ngày có ít nhất 1 payment thành công — ngày không có payment không xuất hiện trong array (không trả `amount: "0"` cho ngày trống).

`currency` cố định `"VND"` v1.0 — không có multi-currency.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai `YYYY-MM-DD`. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB — log chi tiết server-side, trả generic message. |

### 2.2 `GET /reports/members`

**API method:** `GET`

**Endpoint URL:** `/api/v1/reports/members`

**Mô tả:** Đếm hội viên đăng ký mới trong khoảng `[from, to]`. `Member.createdAt` là thời điểm tạo record trong `members`. Chỉ tính member chưa bị soft-delete (`deleted_at IS NULL`). Trả tổng và breakdown theo ngày.

Auth: JWT Quyền: report.view

**Request body:**

Không có request body.

**Query parameters:**

xem §3 Common Query Parameters.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "total": 12,
    "breakdown": [
      { "date": "2026-05-01", "count": 3 },
      { "date": "2026-05-05", "count": 2 }
    ]
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`total` là số nguyên. `breakdown` chỉ chứa ngày có ít nhất 1 hội viên mới.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

### 2.3 `GET /reports/renewals`

**API method:** `GET`

**Endpoint URL:** `/api/v1/reports/renewals`

**Mô tả:** Tính tỷ lệ gia hạn của hội viên trong khoảng `[from, to]`. Định nghĩa:

- `eligible` = DISTINCT member có ít nhất 1 subscription với `end_date BETWEEN from AND to` (subscription hết hạn trong range). Member phải `deleted_at IS NULL`. Không lọc `deleted_at` trên subscription (subscription record giữ nguyên sau khi hết hạn).
- `renewed` = member trong `eligible` có thêm ít nhất 1 subscription mới với `start_date > MAX(end_date của subscription hết hạn trong range)` — tức là đã ký hợp đồng mới sau khi subscription cũ hết hạn.
- `churned` = `eligible - renewed`.
- `renewalRate` = `renewed / eligible` (float, round 2 decimal). Nếu `eligible = 0` → `renewalRate = null`.

Auth: JWT Quyền: report.view

**Request body:**

Không có request body.

**Query parameters:**

xem §3 Common Query Parameters.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "renewed": 8,
    "churned": 4,
    "renewalRate": 0.67
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`renewalRate` là float hoặc `null`. `renewed` và `churned` là số nguyên.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

### 2.4 `GET /reports/staff-performance`

**API method:** `GET`

**Endpoint URL:** `/api/v1/reports/staff-performance`

**Mô tả:** Tổng hợp hiệu suất PT trong khoảng thời gian; có thể lọc theo `staffId`. Chỉ tính staff có vị trí trainer và session đã completed.

Auth: JWT Quyền: report.view

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |
| `staffId` | string | No | Filter 1 PT cụ thể (BigInt string). Nếu truyền nhưng staff không tồn tại hoặc không phải `position='trainer'` → trả `data: []`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1001",
      "staffCode": "STF-2026-000001",
      "fullName": "Nguyen Van A",
      "completedSessions": 24,
      "avgFeedbackSeverityScore": 1.5
    },
    {
      "staffId": "1002",
      "staffCode": "STF-2026-000002",
      "fullName": "Le Thi B",
      "completedSessions": 18,
      "avgFeedbackSeverityScore": null
    }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`staffId` là string (BigInt). `staffCode` format `STF-{YYYY}-{6 digits}` (conventions.md §12). `avgFeedbackSeverityScore` là float (round 2 decimal) hoặc `null`. Kết quả sắp xếp theo `completedSessions DESC` mặc định.

PT soft-deleted (`staff.deleted_at IS NOT NULL` tại thời điểm query) không xuất hiện trong kết quả — bỏ qua bằng `WHERE staff.deleted_at IS NULL`.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 400 | `VALIDATION_ERROR` | `staffId` truyền nhưng không phải format string số nguyên hợp lệ. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

### 2.5 `GET /reports/employee-performance`

**API method:** `GET`

**Endpoint URL:** `/api/v1/reports/employee-performance`

**Mô tả:** Tổng hợp hiệu suất tất cả nhân viên (bao gồm trainer, staff) trong khoảng `[from, to]`. Trả tổng số session hoàn thành và thông tin nhân viên.

Auth: JWT Quyền: report.view

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1001",
      "staffCode": "STF-2026-000001",
      "fullName": "Nguyen Van A",
      "completedSessions": 24
    },
    {
      "staffId": "1002",
      "staffCode": "STF-2026-000002",
      "fullName": "Le Thi B",
      "completedSessions": 18
    }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`staffId` là string (BigInt). `staffCode` format `STF-{YYYY}-{6 digits}`. Nhân viên soft-deleted không xuất hiện trong kết quả.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

### 2.6 `GET /reports/employee-performance/:staffId/detail`

**API method:** `GET`

**Endpoint URL:** `/api/v1/reports/employee-performance/:staffId/detail`

**Mô tả:** Tổng hợp chi tiết hiệu suất của một nhân viên cụ thể trong khoảng `[from, to]`. Trả thông tin nhân viên, số session hoàn thành, và chi tiết breakdown session.

Auth: JWT Quyền: report.view

**Request body:**

Không có request body.

**Path parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `staffId` | string | Yes | ID của nhân viên (BigInt string) |

**Query parameters:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "staffId": "1001",
    "staffCode": "STF-2026-000001",
    "fullName": "Nguyen Van A",
    "position": "trainer",
    "completedSessions": 24,
    "totalHours": 48.5,
    "breakdown": [
      { "date": "2026-05-01", "sessionCount": 2, "hours": 4.0 },
      { "date": "2026-05-02", "sessionCount": 3, "hours": 6.5 }
    ]
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`staffId` là string (BigInt). `totalHours` là float. `breakdown` chỉ chứa ngày có session hoàn thành.

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

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 404 | `NOT_FOUND` | nhân viên với ID `staffId` không tồn tại hoặc đã bị soft-delete. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

### 2.7 `GET /reports/top-packages`

**API method:** `GET`

**Endpoint URL:** `/api/v1/reports/top-packages`

**Mô tả:** Tổng hợp các gói tập bán chạy nhất trong khoảng `[from, to]`. Sắp xếp theo số lượng bán (descending). Chỉ tính subscription được tạo trong range.

Auth: JWT Quyền: report.view

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "packageId": "1",
      "name": "Basic",
      "durationMonths": 1,
      "price": 500000,
      "soldCount": 42,
      "revenue": 21000000
    },
    {
      "packageId": "2",
      "name": "Premium",
      "durationMonths": 3,
      "price": 1200000,
      "soldCount": 28,
      "revenue": 33600000
    }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`packageId` là string (BigInt). `soldCount` là số lượng subscription. `revenue` là tổng doanh thu từ gói đó (không nhất thiết bằng `price * soldCount` nếu có discount). Gói không bán được không xuất hiện trong kết quả.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |
