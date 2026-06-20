# Tài liệu dự án

## 1. Mục đích

Thư mục `docs/` chứa toàn bộ tài liệu thiết kế hệ thống Gym Management — từ SRS đến API spec, schema, HLD, UIUX, và báo cáo code quality. README này là entry point duy nhất: xem cấu trúc tổng thể, tìm đúng tài liệu cho task cụ thể, và biết thứ tự đọc khi onboard.

---

## 2. Cấu trúc tài liệu

```text
docs/
├── README.md              ← file này
├── code-quality.md        ← tổng quan chất lượng code: lint, type coverage, conventions
├── postman-guide.md       ← hướng dẫn dùng Postman collection để test API
├── Design/
│   ├── Architecture.md    ← HLD: module decomposition, ADR, cron jobs, NFR, STRIDE
│   ├── SOLID-analysis.md  ← phân tích tuân thủ SOLID của backend service layer
│   ├── class-diagram.md   ← class diagram toàn hệ thống
│   ├── server-modules.md  ← sơ đồ module NestJS và dependency graph
│   ├── Database/
│   │   └── Database.md    ← Schema: 20 model, 11 enum, data dictionary, DDL
│   ├── API/               ← REST API: 10 module, 100+ endpoint
│   │   ├── README.md          entry point API spec + traceability matrix UC→endpoint
│   │   ├── conventions.md     quy ước chung: auth, pagination, error envelope, RBAC
│   │   ├── Module-1-Auth.md            7 ep  — login, logout, forgot/reset, verify-email, LINE
│   │   ├── Module-2-RBAC.md           16 ep  — groups, permissions, users admin
│   │   ├── Module-3-Package.md         6 ep  — package CRUD + status toggle
│   │   ├── Module-4-Member-Subscription.md  14 ep  — member + subscription + payment
│   │   ├── Module-5-Staff.md           8 ep  — staff CRUD + schedule bulk
│   │   ├── Module-6-Facility.md       13 ep  — rooms + equipment + maintenance
│   │   ├── Module-7-Training.md        8 ep  — sessions + attendance + member progress
│   │   ├── Module-8-Feedback.md        5 ep  — feedback submit + staff handle workflow
│   │   ├── Module-9-Report.md          4 ep  — revenue, members, renewals, staff performance
│   │   ├── Module-10-Workout.md       19 ep  — exercises + plans + logs
│   │   ├── Postman-Testing-All-APIs.md    hướng dẫn test toàn bộ API bằng Postman
│   │   ├── Postman-Testing-Module5-6.md   hướng dẫn test Module 5+6 cụ thể
│   │   └── openapi.yaml               OpenAPI 3.0 (Module 1+2+3+4+6)
│   └── UIUX/              ← role-screen mapping + navigation hierarchy
│       ├── Gym-System-Roles-And-Screens-Detailed-Specification.md
│       ├── owner-hierarchy.md
│       ├── staff-hierarchy.md
│       ├── trainer-hierarchy.md
│       └── member-hierarchy.md
├── Requirement/
│   ├── SRS_VI.md          ← SRS: 22 UC (UC00–UC12) với business rules + acceptance criteria
└── reports/               ← báo cáo phân tích kỹ thuật (HTML, có thể mở trực tiếp trên browser)
    └── solid-report.html  ← báo cáo SOLID + Loose Coupling + High Cohesion 
```

---

## 3. Thứ tự đọc để hiểu dự án

Người đọc mới theo path này từ trên xuống:

1. [`Requirement/SRS_VI.md`](./Requirement/SRS_VI.md) — hiểu bài toán: 22 use case, actors, business rules
2. [`Design/Architecture.md`](./Design/Architecture.md) — hiểu giải pháp: module decomposition, data flow, ADR
3. [`Design/Database/Database.md`](./Design/Database/Database.md) — hiểu dữ liệu: 29 model, relations, enums
4. [`Design/API/README.md`](./Design/API/README.md) — hiểu API surface: 134 endpoint, traceability UC→endpoint
5. Module spec cụ thể — đi sâu vào từng module cần làm

`Design/UIUX/` đọc song song với bước 4–5 nếu làm frontend.

---

## 4. Tìm tài liệu theo task

| Task | Tài liệu cần đọc |
|---|---|
| Implement endpoint mới | [`API/conventions.md`](./Design/API/conventions.md) → module spec → [`Database.md`](./Design/Database/Database.md) (field names) |
| Debug business rule | Module spec (WHEN-THEN-ELSE section) + [`SRS_VI.md`](./Requirement/SRS_VI.md) (UC tương ứng) |
| Thêm/sửa schema | [`Database.md`](./Design/Database/Database.md) §3 (data dictionary) + [`Architecture.md`](./Design/Architecture.md) §4.4 (audit codes) |
| Thiết kế UI screen mới | [`SRS_VI.md`](./Requirement/SRS_VI.md) (acceptance criteria) + [`Design/UIUX/`](./Design/UIUX/) (role-screen map) |
| Viết test case | [`SRS_VI.md`](./Requirement/SRS_VI.md) §4 (UC flow + alternative flows) + module spec (error codes) |
| Kiểm tra permission | [`Module-2-RBAC.md`](./Design/API/Module-2-RBAC.md) §3 (permission catalog) + module spec §2 (RBAC column) |
| Hiểu ADR/architecture decision | [`Architecture.md`](./Design/Architecture.md) §6 (ADR) |
| Đánh giá code quality / SOLID | [`reports/solid-report.html`](./reports/solid-report.html) + [`Design/SOLID-analysis.md`](./Design/SOLID-analysis.md) |
| Test API thủ công | [`postman-guide.md`](./postman-guide.md) + [`API/Postman-Testing-All-APIs.md`](./Design/API/Postman-Testing-All-APIs.md) |
| Hiểu cấu trúc module backend | [`Design/server-modules.md`](./Design/server-modules.md) + [`Design/class-diagram.md`](./Design/class-diagram.md) |


