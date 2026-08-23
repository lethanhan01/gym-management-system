# Tài liệu dự án Gym Management System

Thư mục `docs/VI` tập hợp tài liệu tiếng Việt của dự án, từ yêu cầu nghiệp vụ, thiết kế hệ thống đến hướng dẫn kiểm thử và báo cáo chất lượng. README này là bản đồ tra cứu nhanh; nội dung chi tiết nằm trong các tài liệu được liên kết bên dưới.

## 1. Tra cứu nhanh

| Khi cần tìm hiểu | Tài liệu nên đọc |
| --- | --- |
| Phạm vi hệ thống, tác nhân, use case và business rule | [SRS_VI.md](./Requirement/SRS_VI.md) |
| Sơ đồ use case và quy trình nghiệp vụ dạng PlantUML | [Requirement/Diagram/src](./Requirement/Diagram/src/) |
| Luồng xử lý và thiết kế kiến trúc theo use case | [Architecture.md](./Design/Architecture.md) |
| Cấu trúc module backend và endpoint theo module | [server-modules.md](./Design/server-modules.md) |
| ERD, bảng, quan hệ, enum và quy ước dữ liệu | [Database.md](./Design/Database/Database.md) |
| Danh mục và contract API | [API Specification](./Design/API/README.md) |
| Quy ước auth, RBAC, response, lỗi, phân trang và audit | [API conventions](./Design/API/conventions.md) |
| Màn hình, quyền và luồng tương tác theo vai trò | [Đặc tả UI/UX tổng quan](./Design/UIUX/Gym-System-Roles-And-Screens-Detailed-Specification.md) |
| Test API thủ công bằng Postman | [postman-guide.md](./postman-guide.md) |
| Coverage, CI và SonarQube | [code-quality.md](./code-quality.md) |
| Đánh giá SOLID, coupling và cohesion | [reports](./reports/) |
| Hướng dẫn Hủy follow / Block ROGYM trên LINE & Cơ chế Webhook | [line-unfollow-guide.md](./line-unfollow-guide.md) |
| Đặc tả Hệ thống LINE Messaging API (Sự kiện & Dữ liệu gửi tin) | [line-messaging-specification.md](./line-messaging-specification.md) |
| Kế hoạch Triển khai Nâng cấp LINE Flex Message (Phased Plan) | [line-flex-message-upgrade-plan.md](./line-flex-message-upgrade-plan.md) |

## 2. Phạm vi tài liệu hiện tại

| Nhóm | Nội dung đang có |
| --- | --- |
| Yêu cầu | SRS mô tả tổng quan hệ thống, các sơ đồ phân rã/quy trình và đặc tả **UC01–UC21**. Thư mục `Requirement/Diagram/src` chứa **13** nguồn PlantUML để dựng sơ đồ. |
| Kiến trúc | `Architecture.md` mô tả thiết kế và luồng xử lý cho **UC01–UC12**, gồm các nhánh đăng ký hội viên và gia hạn/hủy gói. |
| Cơ sở dữ liệu | `Database.md` mô tả PostgreSQL v1.2 với **29 bảng nghiệp vụ**, ERD, data dictionary, quan hệ, enum, soft delete và DDL tham chiếu. |
| API | Bộ Markdown gồm **10 module, 134 endpoint nghiệp vụ**. `openapi.yaml` hiện mới bao phủ một phần API (**35 path, 56 operation**), nên hãy ưu tiên README API và tài liệu module khi tra contract. |
| UI/UX | Có tài liệu tổng quan role–screen và đặc tả hierarchy riêng cho **Member, Trainer, Staff, Owner**. |
| Class diagram | `Class_Diagram/images` chứa ảnh class diagram theo **UC01–UC10**. |
| Kiểm thử và chất lượng | Có hướng dẫn Postman tổng quát/chuyên biệt, tài liệu coverage–CI–SonarQube và các báo cáo SOLID, coupling, cohesion của backend. |

## 3. Cấu trúc thư mục

```text
docs/VI/
├── README.md
├── line-unfollow-guide.md
├── postman-guide.md
├── code-quality.md
├── Requirement/
│   ├── SRS_VI.md
│   └── Diagram/src/              # Nguồn PlantUML cho use case và quy trình
├── Design/
│   ├── Architecture.md           # Thiết kế kiến trúc theo use case
│   ├── server-modules.md         # Module và endpoint của backend
│   ├── Database/Database.md      # ERD, data dictionary và DDL
│   ├── API/
│   │   ├── README.md             # Tổng quan, trạng thái và phạm vi API
│   │   ├── conventions.md        # Quy ước dùng chung
│   │   ├── Module-1-Auth.md ... Module-10-Workout.md
│   │   ├── openapi.yaml          # OpenAPI đang bao phủ một phần contract
│   │   └── Postman-Testing-*.md  # Kịch bản test API
│   └── UIUX/
│       ├── Gym-System-Roles-And-Screens-Detailed-Specification.md
│       ├── member-hierarchy.md
│       ├── trainer-hierarchy.md
│       ├── staff-hierarchy.md
│       └── owner-hierarchy.md
├── Class_Diagram/images/         # Ảnh class diagram theo use case
└── reports/
    ├── design-principles.md      # Phân tích SOLID
    ├── design-concept.md         # Phân tích coupling
    ├── design-concept-2.md       # Phân tích cohesion
    └── solid-report.html         # Báo cáo HTML tổng hợp
```

## 4. Lộ trình đọc gợi ý

### Người mới tham gia dự án

1. [SRS_VI.md](./Requirement/SRS_VI.md) để hiểu bài toán và nghiệp vụ.
2. [Đặc tả UI/UX tổng quan](./Design/UIUX/Gym-System-Roles-And-Screens-Detailed-Specification.md) để hiểu vai trò và màn hình.
3. [Architecture.md](./Design/Architecture.md) và [Database.md](./Design/Database/Database.md) để hiểu cách hệ thống được thiết kế.
4. [API Specification](./Design/API/README.md) để xem các chức năng đã được ánh xạ thành API như thế nào.

### Backend

Đọc [server-modules.md](./Design/server-modules.md) → [API conventions](./Design/API/conventions.md) → tài liệu `Module-*.md` liên quan → [Database.md](./Design/Database/Database.md).

### Frontend

Đọc [đặc tả UI/UX tổng quan](./Design/UIUX/Gym-System-Roles-And-Screens-Detailed-Specification.md) → file hierarchy của vai trò đang làm → tài liệu API của module tương ứng → use case liên quan trong SRS.

### QA và kiểm thử API

Đọc [postman-guide.md](./postman-guide.md) → [Postman-Testing-All-APIs.md](./Design/API/Postman-Testing-All-APIs.md) → tài liệu module cần kiểm thử. Với Staff và Facility, xem thêm [Postman-Testing-Module5-6.md](./Design/API/Postman-Testing-Module5-6.md).

### Đánh giá thiết kế và chất lượng

Đọc [code-quality.md](./code-quality.md) cho công cụ và pipeline; đọc [design-principles.md](./reports/design-principles.md), [design-concept.md](./reports/design-concept.md) và [design-concept-2.md](./reports/design-concept-2.md) cho phân tích thiết kế backend.

## 5. Lưu ý khi sử dụng

- Với API, controller/DTO/service trong `server/src` vẫn là nguồn sự thật cuối cùng; tài liệu API dùng để tra cứu contract đã tổng hợp.
- Không dùng riêng `openapi.yaml` để suy ra toàn bộ API vì file này chưa bao phủ đủ 134 endpoint.
- Khi thay đổi nghiệp vụ hoặc contract, nên cập nhật đồng thời SRS, tài liệu thiết kế và module API có liên quan để tránh lệch tài liệu.
