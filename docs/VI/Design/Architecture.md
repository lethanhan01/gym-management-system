# Tài liệu Thiết kế kiến trúc

---

### Thiết kế kiến trúc cho UC01 — Đăng nhập

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant Client as LoginPage
    participant API as AuthController
    participant Auth as AuthService
    participant UserSvc as UsersService
    participant DB as Database

    User->>Client: Nhập email và mật khẩu
    Client->>API: POST /api/v1/auth/login
    API->>Auth: login(email, password)
    Auth->>UserSvc: findByEmailWithRoles(email)
    UserSvc->>DB: SELECT users JOIN user_groups JOIN groups
    DB-->>UserSvc: User + roles[]
    UserSvc-->>Auth: UserWithRoles

    alt Thông tin hợp lệ và tài khoản active
        Auth->>Auth: bcrypt.compare(password, passwordHash)
        Auth->>Auth: jwt.sign({ sub, email, roles })
        Auth->>DB: INSERT audit_logs (action=login, status=success)
        Auth-->>API: { accessToken, user }
        API-->>Client: 200 { accessToken, user }
        Client-->>User: Chuyển hướng tới dashboard theo role
    else Sai thông tin hoặc tài khoản không hợp lệ
        Auth->>DB: INSERT audit_logs (action=login, status=failed)
        Auth-->>API: UnauthorizedException
        API-->>Client: 401 Unauthorized
        Client-->>User: Hiển thị thông báo lỗi xác thực
    end
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    LF[LoginForm] -- "1: submit(email, password)" --> AC[AuthController]
    AC -- "2: login(email, password)" --> AS[AuthService]
    AS -- "3: findByEmailWithRoles(email)" --> US[UsersService]
    US -- "4: SELECT users + roles" --> DB[(Database)]
    DB -- "5: user + roles" --> US
    US -- "6: UserWithRoles" --> AS
    AS -- "7: sign(payload)" --> JS[JwtService]
    JS -- "8: accessToken" --> AS
    AS -- "9: INSERT audit_log" --> DB
    AS -- "10: LoginResponse" --> AC
    AC -- "11: 200 + token" --> LF
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class LoginPage {
        <<boundary>>
        +handleSubmit(email, password) void
        +displayError(message) void
        +redirectToDashboard(role) void
    }
    class AuthController {
        <<boundary>>
        +login(loginDto) Promise~LoginResponse~
    }
    class AuthService {
        <<control>>
        +login(email, password) Promise~LoginResponse~
        +validateUser(email, password) Promise~User~
    }
    class UsersService {
        <<control>>
        +findByEmailWithRoles(email) Promise~UserWithRoles~
    }
    class JwtService {
        <<control>>
        +sign(payload) string
    }
    class User {
        <<entity>>
        +userId: BigInt
        +email: string
        +passwordHash: string
        +status: UserStatus
        +fullName: string
    }
    class UserGroup {
        <<entity>>
        +userId: BigInt
        +groupId: BigInt
    }
    class Group {
        <<entity>>
        +groupId: BigInt
        +name: string
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
        +createdAt: DateTime
    }

    LoginPage --> AuthController : POST /auth/login
    AuthController --> AuthService : delegates
    AuthService --> UsersService : findUser
    AuthService --> JwtService : signToken
    UsersService --> User : queries
    User "1" --> "*" UserGroup : has
    UserGroup "*" --> "1" Group : belongs to
    AuthService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC02 — Đăng xuất

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant Client as DashboardPage
    participant API as AuthController
    participant Auth as AuthService
    participant DB as Database

    User->>Client: Nhấn nút Đăng xuất
    Client->>API: POST /api/v1/auth/logout
    API->>Auth: logout(userId)
    Auth->>DB: INSERT audit_logs (action=logout, status=success)
    DB-->>Auth: ok
    Auth-->>API: void
    API-->>Client: 200 OK
    Client-->>User: Xóa token khỏi storage, chuyển hướng về LoginPage
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    DP[DashboardPage] -- "1: POST /auth/logout" --> AC[AuthController]
    AC -- "2: logout(userId)" --> AS[AuthService]
    AS -- "3: INSERT audit_log" --> DB[(Database)]
    DB -- "4: ok" --> AS
    AS -- "5: void" --> AC
    AC -- "6: 200 OK" --> DP
    DP -- "7: clearToken() + redirect(/login)" --> DP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class DashboardPage {
        <<boundary>>
        +handleLogout() void
        +clearLocalStorage() void
        +redirectToLogin() void
    }
    class AuthController {
        <<boundary>>
        +logout(req) Promise~void~
    }
    class AuthService {
        <<control>>
        +logout(userId) Promise~void~
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
        +createdAt: DateTime
    }

    DashboardPage --> AuthController : POST /auth/logout
    AuthController --> AuthService : delegates
    AuthService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC03 — Quên/Đặt lại mật khẩu

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant FP as ForgotPasswordPage
    participant RP as ResetPasswordPage
    participant API as AuthController
    participant Auth as AuthService
    participant Otp as OtpService
    participant DB as Database

    Note over User, DB: Bước 1 — Yêu cầu OTP
    User->>FP: Nhập email
    FP->>API: POST /api/v1/auth/forgot-password { email }
    API->>Auth: forgotPassword(email)
    Auth->>DB: SELECT user WHERE email
    alt Email không tồn tại
        Auth-->>API: NotFoundException
        API-->>FP: 404 Not Found
        FP-->>User: Hiển thị lỗi email không hợp lệ
    else Email hợp lệ
        Auth->>Otp: generateOtp(userId)
        Otp->>Otp: Tạo OTP 6 chữ số, bcrypt hash
        Otp->>DB: INSERT otp_codes (hashedOtp, expiresAt = now+10m)
        Otp-->>Auth: plainOtp
        Auth->>Auth: console.log(otp) [dev — thay bằng SMTP trước production]
        Auth-->>API: void
        API-->>FP: 200 OK
        FP-->>User: Thông báo kiểm tra email, chuyển tới ResetPasswordPage
    end

    Note over User, DB: Bước 2 — Đặt lại mật khẩu
    User->>RP: Nhập OTP + mật khẩu mới
    RP->>API: POST /api/v1/auth/reset-password { email, otp, newPassword }
    API->>Auth: resetPassword(email, otp, newPassword)
    Auth->>DB: SELECT otp_codes WHERE userId AND NOT used AND expiresAt > now
    alt OTP không hợp lệ hoặc hết hạn
        Auth-->>API: BadRequestException
        API-->>RP: 400 Bad Request
        RP-->>User: Hiển thị lỗi OTP
    else OTP hợp lệ
        Auth->>Auth: bcrypt.compare(otp, hashedOtp)
        Auth->>DB: UPDATE users SET passwordHash = bcrypt(newPassword)
        Auth->>DB: UPDATE otp_codes SET used = true
        Auth->>DB: INSERT audit_logs (action=reset-password, status=success)
        Auth-->>API: void
        API-->>RP: 200 OK
        RP-->>User: Thành công, chuyển về LoginPage
    end
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    FP[ForgotPasswordPage] -- "1: POST /auth/forgot-password" --> AC[AuthController]
    AC -- "2: forgotPassword(email)" --> AS[AuthService]
    AS -- "3: SELECT user" --> DB[(Database)]
    DB -- "4: User" --> AS
    AS -- "5: generateOtp(userId)" --> OS[OtpService]
    OS -- "6: INSERT otp_codes" --> DB
    OS -- "7: plainOtp" --> AS
    AS -- "8: 200 OK" --> AC
    AC -- "9: 200 OK" --> FP

    RP[ResetPasswordPage] -- "10: POST /auth/reset-password" --> AC
    AC -- "11: resetPassword(email, otp, newPassword)" --> AS
    AS -- "12: SELECT otp_codes" --> DB
    DB -- "13: OtpCode" --> AS
    AS -- "14: UPDATE users passwordHash" --> DB
    AS -- "15: UPDATE otp_codes used=true" --> DB
    AS -- "16: INSERT audit_log" --> DB
    AS -- "17: 200 OK" --> AC
    AC -- "18: 200 OK" --> RP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class ForgotPasswordPage {
        <<boundary>>
        +handleSubmit(email) void
        +displayError(message) void
    }
    class ResetPasswordPage {
        <<boundary>>
        +handleSubmit(otp, newPassword) void
        +displayError(message) void
    }
    class AuthController {
        <<boundary>>
        +forgotPassword(dto) Promise~void~
        +resetPassword(dto) Promise~void~
    }
    class AuthService {
        <<control>>
        +forgotPassword(email) Promise~void~
        +resetPassword(email, otp, newPassword) Promise~void~
    }
    class OtpService {
        <<control>>
        +generateOtp(userId) Promise~string~
        +verifyOtp(userId, otp) Promise~boolean~
    }
    class User {
        <<entity>>
        +userId: BigInt
        +email: string
        +passwordHash: string
    }
    class OtpCode {
        <<entity>>
        +otpId: BigInt
        +userId: BigInt
        +hashedOtp: string
        +expiresAt: DateTime
        +used: boolean
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
        +createdAt: DateTime
    }

    ForgotPasswordPage --> AuthController : POST /auth/forgot-password
    ResetPasswordPage --> AuthController : POST /auth/reset-password
    AuthController --> AuthService : delegates
    AuthService --> OtpService : generateOtp / verifyOtp
    AuthService --> User : queries / updates
    OtpService --> OtpCode : creates / marks used
    AuthService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC04 — Quản lý hồ sơ cá nhân

> Ghi chú: Codebase không có `UsersController` hay `FileService`. Profile được phục vụ qua `AuthController` (thông tin base) + `MembersController` / `StaffController` (thông tin role-specific). Avatar upload chưa được implement.

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor User as Người dùng (All roles)
    participant Client as ProfilePage
    participant AuthAPI as AuthController
    participant UserSvc as UsersService
    participant MembersAPI as MembersController
    participant MemberSvc as MembersService
    participant StaffAPI as StaffController
    participant StaffSvc as StaffService
    participant DB as Database

    Note over User, DB: Xem hồ sơ cá nhân
    User->>Client: Truy cập trang Profile
    Client->>AuthAPI: GET /api/v1/auth/me
    AuthAPI->>UserSvc: findByIdWithRoles(userId)
    UserSvc->>DB: SELECT users JOIN user_groups JOIN groups WHERE userId
    DB-->>UserSvc: User + roles[] + memberId?
    UserSvc-->>AuthAPI: UserWithRoles
    AuthAPI-->>Client: 200 { userId, email, phone, fullName, roles, memberId?, staffId? }

    alt Role = member
        Client->>MembersAPI: GET /api/v1/members/me
        MembersAPI->>MemberSvc: getMember(memberId)
        MemberSvc->>DB: SELECT members JOIN subscriptions JOIN packages
        DB-->>MemberSvc: MemberDetail
        MemberSvc-->>MembersAPI: MemberDetail
        MembersAPI-->>Client: 200 MemberDetail
    else Role = staff / trainer / owner
        Client->>StaffAPI: GET /api/v1/staff/me
        StaffAPI->>StaffSvc: get(staffId)
        StaffSvc->>DB: SELECT staff WHERE staffId
        DB-->>StaffSvc: StaffDetail
        StaffSvc-->>StaffAPI: StaffDetail
        StaffAPI-->>Client: 200 StaffDetail
    end
    Client-->>User: Hiển thị hồ sơ cá nhân

    Note over User, DB: Cập nhật hồ sơ (Member)
    User->>Client: Chỉnh sửa thông tin, nhấn Lưu
    Client->>MembersAPI: PATCH /api/v1/members/me { dto }
    MembersAPI->>MemberSvc: updateMember(memberId, dto, actorUserId)
    MemberSvc->>DB: UPDATE users SET phone/fullName, UPDATE members SET address/dob/...
    DB-->>MemberSvc: updated records
    MemberSvc-->>MembersAPI: UpdatedMemberDetail
    MembersAPI-->>Client: 200 UpdatedMemberDetail
    Client-->>User: Hiển thị thông tin đã cập nhật
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    PP[ProfilePage] -- "1: GET /auth/me" --> AC[AuthController]
    AC -- "2: findByIdWithRoles(userId)" --> US[UsersService]
    US -- "3: SELECT users + roles" --> DB[(Database)]
    DB -- "4: UserWithRoles" --> US
    US -- "5: UserWithRoles" --> AC
    AC -- "6: 200 base profile" --> PP

    PP -- "7a: GET /members/me" --> MC[MembersController]
    MC -- "8a: getMember(memberId)" --> MS[MembersService]
    MS -- "9a: SELECT member detail" --> DB
    DB -- "10a: MemberDetail" --> MS
    MS -- "11a: MemberDetail" --> MC
    MC -- "12a: 200 MemberDetail" --> PP

    PP -- "7b: GET /staff/me" --> SC[StaffController]
    SC -- "8b: get(staffId)" --> SS[StaffService]
    SS -- "9b: SELECT staff detail" --> DB
    DB -- "10b: StaffDetail" --> SS
    SS -- "11b: StaffDetail" --> SC
    SC -- "12b: 200 StaffDetail" --> PP

    PP -- "13: PATCH /members/me" --> MC
    MC -- "14: updateMember(memberId, dto)" --> MS
    MS -- "15: UPDATE users + members" --> DB
    DB -- "16: updated" --> MS
    MS -- "17: UpdatedMember" --> MC
    MC -- "18: 200 UpdatedMember" --> PP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class ProfilePage {
        <<boundary>>
        +loadBaseProfile() void
        +loadRoleProfile() void
        +handleUpdate(dto) void
    }
    class AuthController {
        <<boundary>>
        +me(user) Promise~UserResponse~
    }
    class MembersController {
        <<boundary>>
        +getMe(user) Promise~MemberDetail~
        +updateMe(dto, user) Promise~MemberDetail~
    }
    class StaffController {
        <<boundary>>
        +getMe(user) Promise~StaffDetail~
    }
    class UsersService {
        <<control>>
        +findByIdWithRoles(userId) Promise~UserWithRoles~
    }
    class MembersService {
        <<control>>
        +getMember(memberId) Promise~MemberDetail~
        +updateMember(memberId, dto, actorId) Promise~MemberDetail~
    }
    class StaffService {
        <<control>>
        +get(staffId) Promise~StaffDetail~
    }
    class User {
        <<entity>>
        +userId: BigInt
        +email: string
        +phone: string
        +fullName: string
        +status: UserStatus
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +userId: BigInt
        +dateOfBirth: DateTime
        +address: string
    }
    class Staff {
        <<entity>>
        +staffId: BigInt
        +userId: BigInt
        +specialization: string
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
    }

    ProfilePage --> AuthController : GET /auth/me
    ProfilePage --> MembersController : GET/PATCH /members/me
    ProfilePage --> StaffController : GET /staff/me
    AuthController --> UsersService : findByIdWithRoles
    MembersController --> MembersService : getMember / updateMember
    StaffController --> StaffService : get
    UsersService --> User : queries
    MembersService --> Member : queries / updates
    MembersService --> User : updates
    MembersService --> AuditLog : writes
    StaffService --> Staff : queries
```

---

### Thiết kế kiến trúc cho UC05A — Staff đăng ký hội viên tại quầy

> Ghi chú: Không có OtpService trong luồng này — staff tạo tài khoản trực tiếp, email được đánh dấu verified ngay (`emailVerifiedAt = now`). Toàn bộ User + Member + UserGroup + Subscription + Payment được tạo trong một `$transaction`.

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Staff as Staff
    participant Client as MemberRegisterPage
    participant API as MembersController
    participant Svc as MembersService
    participant DB as Database

    Staff->>Client: Điền form (email, password, fullName, phone, dob, address, packageId, paymentMethod)
    Client->>API: POST /api/v1/members [RequirePermission: member.create]
    API->>Svc: createMember(dto, actorUserId)

    Svc->>DB: SELECT packages WHERE packageId AND status=active AND deletedAt IS NULL
    alt Gói tập không tồn tại hoặc ngừng kinh doanh
        DB-->>Svc: null
        Svc-->>API: NotFoundException
        API-->>Client: 404 Not Found
        Client-->>Staff: Hiển thị lỗi gói tập không hợp lệ
    else Gói tập hợp lệ
        DB-->>Svc: Package
        Svc->>DB: SELECT users WHERE email OR phone (assertUniqueUserFields)
        alt Email hoặc số điện thoại đã tồn tại
            DB-->>Svc: existing user
            Svc-->>API: ConflictException
            API-->>Client: 409 Conflict
            Client-->>Staff: Hiển thị lỗi email/phone trùng
        else Thông tin hợp lệ
            DB-->>Svc: null (unique)
            Svc->>Svc: generateMemberCode(), bcrypt.hash(password)
            Note over Svc, DB: $transaction bắt đầu
            Svc->>DB: INSERT users (status=active, emailVerifiedAt=now)
            DB-->>Svc: User
            Svc->>DB: INSERT members (userId, memberCode, dob, address)
            DB-->>Svc: Member
            Svc->>DB: SELECT groups WHERE name=member
            DB-->>Svc: Group
            Svc->>DB: INSERT user_groups (userId, groupId)
            Svc->>DB: INSERT subscriptions (memberId, packageId, startDate, endDate, status=active)
            DB-->>Svc: Subscription
            Svc->>DB: INSERT payments (memberId, subscriptionId, amount, method, status=success)
            DB-->>Svc: Payment
            Note over Svc, DB: $transaction kết thúc
            Svc->>DB: INSERT audit_logs (action=member.create)
            Svc-->>API: { member, user }
            API-->>Client: 201 Created { member }
            Client-->>Staff: Hiển thị thông báo tạo hội viên thành công
        end
    end
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    MRP[MemberRegisterPage] -- "1: POST /members" --> MC[MembersController]
    MC -- "2: createMember(dto, actorUserId)" --> MS[MembersService]
    MS -- "3: SELECT package" --> DB[(Database)]
    DB -- "4: Package" --> MS
    MS -- "5: SELECT users (unique check)" --> DB
    DB -- "6: null" --> MS
    MS -- "7: generateMemberCode()" --> MS
    MS -- "8: INSERT users" --> DB
    DB -- "9: User" --> MS
    MS -- "10: INSERT members" --> DB
    DB -- "11: Member" --> MS
    MS -- "12: SELECT group(name=member)" --> DB
    DB -- "13: Group" --> MS
    MS -- "14: INSERT user_groups" --> DB
    MS -- "15: INSERT subscriptions" --> DB
    DB -- "16: Subscription" --> MS
    MS -- "17: INSERT payments" --> DB
    DB -- "18: Payment" --> MS
    MS -- "19: INSERT audit_logs" --> DB
    MS -- "20: member data" --> MC
    MC -- "21: 201 Created" --> MRP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class MemberRegisterPage {
        <<boundary>>
        +handleSubmit(dto) void
        +displayError(message) void
        +displaySuccess(member) void
    }
    class MembersController {
        <<boundary>>
        +create(dto, user) Promise~MemberResponse~
    }
    class MembersService {
        <<control>>
        +createMember(dto, actorUserId) Promise~MemberData~
        +assertUniqueUserFields(email, phone) Promise~void~
        +generateMemberCode() Promise~string~
    }
    class AuditService {
        <<control>>
        +log(entry) void
    }
    class User {
        <<entity>>
        +userId: BigInt
        +email: string
        +passwordHash: string
        +fullName: string
        +phone: string
        +status: UserStatus
        +emailVerifiedAt: DateTime
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +userId: BigInt
        +memberCode: string
        +dateOfBirth: DateTime
        +address: string
    }
    class UserGroup {
        <<entity>>
        +userId: BigInt
        +groupId: BigInt
    }
    class Group {
        <<entity>>
        +groupId: BigInt
        +name: string
    }
    class Package {
        <<entity>>
        +packageId: BigInt
        +name: string
        +price: Decimal
        +durationDays: Int
        +status: PackageStatus
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +memberId: BigInt
        +packageId: BigInt
        +startDate: DateTime
        +endDate: DateTime
        +status: SubscriptionStatus
    }
    class Payment {
        <<entity>>
        +paymentId: BigInt
        +memberId: BigInt
        +subscriptionId: BigInt
        +amount: Decimal
        +method: PaymentMethod
        +status: PaymentStatus
        +paidAt: DateTime
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
        +resourceType: string
        +resourceId: string
    }

    MemberRegisterPage --> MembersController : POST /members
    MembersController --> MembersService : createMember
    MembersService --> Package : validates
    MembersService --> User : creates
    MembersService --> Member : creates
    MembersService --> UserGroup : creates
    UserGroup --> Group : references
    MembersService --> Subscription : creates
    MembersService --> Payment : creates
    MembersService --> AuditService : logs
    AuditService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC05B — Member tự đăng ký online

> Ghi chú: OTP xác thực email được lưu trong `OtpStoreService` (in-memory store), không phải bảng `otp_codes` trong DB. User tạo ra với `status = pending_verification`; Subscription (nếu có) với `status = pending` — chưa active cho đến khi email được xác thực. Không tạo Payment trong bước này. SubscriptionsService không tham gia — MembersService tự INSERT subscription trong transaction.

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Guest as Guest (chưa đăng nhập)
    participant Client as RegisterPage
    participant API as MembersController
    participant Svc as MembersService
    participant OtpStore as OtpStoreService
    participant DB as Database

    Guest->>Client: Điền form (email, password, fullName, phone, dob, address, packageId?)
    Client->>API: POST /api/v1/members/self-register [@Public]
    API->>Svc: selfRegister(dto)

    Svc->>DB: SELECT users WHERE email OR phone (assertUniqueUserFields)
    alt Email hoặc số điện thoại đã tồn tại
        DB-->>Svc: existing user
        Svc-->>API: ConflictException
        API-->>Client: 409 Conflict
        Client-->>Guest: Hiển thị lỗi email/phone trùng
    else Thông tin hợp lệ
        DB-->>Svc: null (unique)
        opt Có chọn gói tập
            Svc->>DB: SELECT packages WHERE packageId AND status=active
            alt Gói tập không hợp lệ
                DB-->>Svc: null
                Svc-->>API: BadRequestException
                API-->>Client: 400 Bad Request
                Client-->>Guest: Hiển thị lỗi gói tập không hợp lệ
            end
            DB-->>Svc: Package
        end
        Svc->>Svc: generateMemberCode(), bcrypt.hash(password), randomInt OTP, bcrypt.hash(otp)
        Note over Svc, DB: $transaction bắt đầu
        Svc->>DB: INSERT users (status=pending_verification, emailVerifiedAt=null)
        DB-->>Svc: User
        Svc->>DB: INSERT members (userId, memberCode, dob?, address?)
        DB-->>Svc: Member
        Svc->>DB: SELECT groups WHERE name=member
        DB-->>Svc: Group
        Svc->>DB: INSERT user_groups (userId, groupId)
        opt Có gói tập
            Svc->>DB: INSERT subscriptions (memberId, packageId, status=pending)
            DB-->>Svc: Subscription
        end
        Note over Svc, DB: $transaction kết thúc
        Svc->>OtpStore: set(userId, email_verify, hashedOtp, TTL=10m)
        Svc->>Svc: console.log(otpRaw) [dev — TODO: thay bằng SMTP]
        Svc->>DB: INSERT audit_logs (action=member.create, actorUserId=null)
        opt Có subscription
            Svc->>DB: INSERT audit_logs (action=subscription.create)
        end
        Svc-->>API: { member, devOtp? }
        API-->>Client: 201 Created { member, devOtp? }
        Client-->>Guest: Hiển thị thông báo kiểm tra email để xác thực
    end
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    RP[RegisterPage] -- "1: POST /members/self-register" --> MC[MembersController]
    MC -- "2: selfRegister(dto)" --> MS[MembersService]
    MS -- "3: SELECT users (unique check)" --> DB[(Database)]
    DB -- "4: null" --> MS
    MS -- "5: SELECT package (optional)" --> DB
    DB -- "6: Package" --> MS
    MS -- "7: generateMemberCode(), hash password, generate OTP" --> MS
    MS -- "8: INSERT users (pending_verification)" --> DB
    DB -- "9: User" --> MS
    MS -- "10: INSERT members" --> DB
    DB -- "11: Member" --> MS
    MS -- "12: SELECT group(name=member)" --> DB
    DB -- "13: Group" --> MS
    MS -- "14: INSERT user_groups" --> DB
    MS -- "15: INSERT subscriptions (pending)" --> DB
    DB -- "16: Subscription" --> MS
    MS -- "17: set(userId, email_verify, hashedOtp, TTL)" --> OS[OtpStoreService]
    MS -- "18: INSERT audit_logs x2" --> DB
    MS -- "19: member data" --> MC
    MC -- "20: 201 Created" --> RP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class RegisterPage {
        <<boundary>>
        +handleSubmit(dto) void
        +displayError(message) void
        +displayVerifyPrompt() void
    }
    class MembersController {
        <<boundary>>
        +selfRegister(dto) Promise~RegisterResponse~
    }
    class MembersService {
        <<control>>
        +selfRegister(dto) Promise~RegisterData~
        +assertUniqueUserFields(email, phone) Promise~void~
        +generateMemberCode() Promise~string~
    }
    class OtpStoreService {
        <<control>>
        +set(userId, purpose, hashedOtp, ttlMs) void
    }
    class AuditService {
        <<control>>
        +log(entry) void
    }
    class User {
        <<entity>>
        +userId: BigInt
        +email: string
        +passwordHash: string
        +status: UserStatus
        +emailVerifiedAt: DateTime
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +userId: BigInt
        +memberCode: string
        +dateOfBirth: DateTime
        +address: string
    }
    class UserGroup {
        <<entity>>
        +userId: BigInt
        +groupId: BigInt
    }
    class Group {
        <<entity>>
        +groupId: BigInt
        +name: string
    }
    class Package {
        <<entity>>
        +packageId: BigInt
        +name: string
        +price: Decimal
        +durationDays: Int
        +status: PackageStatus
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +memberId: BigInt
        +packageId: BigInt
        +status: SubscriptionStatus
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
        +resourceType: string
    }

    RegisterPage --> MembersController : POST /members/self-register
    MembersController --> MembersService : selfRegister
    MembersService --> Package : validates (optional)
    MembersService --> User : creates (pending_verification)
    MembersService --> Member : creates
    MembersService --> UserGroup : creates
    UserGroup --> Group : references
    MembersService --> Subscription : creates (pending, optional)
    MembersService --> OtpStoreService : stores email verify OTP
    MembersService --> AuditService : logs
    AuditService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC06 — Đăng ký gói tập mới (Tạo mới subscription)

> Ghi chú thực tế: `PackagesService` và `PaymentService` không tham gia luồng này. `SubscriptionsService` query bảng `packages` trực tiếp qua Prisma. Subscription được tạo với `status=pending` — không có Payment record ở bước này (payment chỉ tạo khi gia hạn).

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Actor as Member / Staff
    participant Client as PackageListPage
    participant API as SubscriptionsController
    participant Svc as SubscriptionsService
    participant Audit as AuditService
    participant DB as Database

    Actor->>Client: Chọn gói tập, điền thông tin đăng ký
    Client->>API: POST /api/v1/subscriptions
    API->>Svc: createSubscription(dto, user)

    Svc->>DB: SELECT members WHERE memberId AND deletedAt IS NULL
    DB-->>Svc: Member | null

    alt Member không tồn tại
        Svc-->>API: BadRequestException (FK_CONSTRAINT)
        API-->>Client: 400 Bad Request
        Client-->>Actor: Hiển thị lỗi hội viên không tồn tại
    end

    alt Member chưa xác thực email (caller là Member)
        Svc-->>API: ForbiddenException (EMAIL_NOT_VERIFIED)
        API-->>Client: 403 Forbidden
        Client-->>Actor: Yêu cầu xác thực email trước
    end

    Svc->>DB: SELECT packages WHERE packageId AND status=active AND deletedAt IS NULL
    DB-->>Svc: Package | null

    alt Package không tồn tại hoặc inactive
        Svc-->>API: BadRequestException (FK_CONSTRAINT)
        API-->>Client: 400 Bad Request
        Client-->>Actor: Hiển thị lỗi gói tập không hợp lệ
    end

    Svc->>DB: SELECT subscriptions WHERE memberId AND (status=pending OR status=active)
    DB-->>Svc: existingSub | null

    alt Đã có gói active hoặc pending
        Svc-->>API: ConflictException (SUBSCRIPTION_ALREADY_EXISTS)
        API-->>Client: 409 Conflict
        Client-->>Actor: Yêu cầu hủy gói cũ trước khi đăng ký mới
    end

    alt Package có includesPt = true
        Svc->>DB: SELECT staff WHERE staffId AND position IN (trainer, pt)
        DB-->>Svc: Trainer | null
        alt Trainer không hợp lệ hoặc không chọn trainer
            Svc-->>API: BadRequestException (TRAINER_REQUIRED / TRAINER_NOT_FOUND)
            API-->>Client: 400 Bad Request
            Client-->>Actor: Yêu cầu chọn PT hợp lệ
        end
    end

    Svc->>DB: $transaction BEGIN
    Svc->>DB: INSERT subscriptions (status=pending, startDate=today, endDate=today+durationDays)
    alt Package có PT
        Svc->>DB: UPDATE members SET primaryTrainerId = trainerId
    end
    Svc->>DB: $transaction COMMIT
    DB-->>Svc: Subscription (kèm Member, Package, Trainer)

    Svc->>Audit: log(subscription.create, subscriptionId)
    Svc-->>API: { data: serializedSubscription }
    API-->>Client: 201 Created
    Client-->>Actor: Hiển thị thông tin gói tập vừa đăng ký (status=pending)
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    PL[PackageListPage] -- "1: POST /subscriptions (dto)" --> SC[SubscriptionsController]
    SC -- "2: createSubscription(dto, user)" --> SS[SubscriptionsService]
    SS -- "3: SELECT member" --> DB[(Database)]
    DB -- "4: Member" --> SS
    SS -- "5: SELECT package" --> DB
    DB -- "6: Package" --> SS
    SS -- "7: SELECT existing subscription" --> DB
    DB -- "8: existingSub | null" --> SS
    SS -- "9: SELECT staff/trainer (nếu includesPt)" --> DB
    DB -- "10: Trainer | null" --> SS
    SS -- "11: $transaction INSERT subscription" --> DB
    SS -- "12: UPDATE member.primaryTrainerId (nếu PT)" --> DB
    DB -- "13: Subscription" --> SS
    SS -- "14: log(subscription.create)" --> AS[AuditService]
    AS -- "15: INSERT audit_logs" --> DB
    SS -- "16: serializedSubscription" --> SC
    SC -- "17: 201 Created" --> PL
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class PackageListPage {
        <<boundary>>
        +displayPackages() void
        +submitSubscription(packageId, trainerId) void
    }
    class SubscriptionsController {
        <<boundary>>
        +create(dto, user) Promise~SubscriptionResponse~
    }
    class SubscriptionsService {
        <<control>>
        +createSubscription(dto, caller) Promise~SubscriptionData~
        -resolveCallerMemberId(caller) Promise~bigint~
        -serializeSubscription(sub) object
    }
    class AuditService {
        <<control>>
        +log(entry) void
    }
    class Package {
        <<entity>>
        +packageId: BigInt
        +name: string
        +durationDays: number
        +price: Decimal
        +includesPt: boolean
        +status: PackageStatus
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +memberId: BigInt
        +packageId: BigInt
        +trainerId: BigInt
        +startDate: DateTime
        +endDate: DateTime
        +status: SubscriptionStatus
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +userId: BigInt
        +primaryTrainerId: BigInt
    }
    class Staff {
        <<entity>>
        +staffId: BigInt
        +position: string
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
        +resourceType: string
    }

    PackageListPage --> SubscriptionsController : POST /subscriptions
    SubscriptionsController --> SubscriptionsService : delegates
    SubscriptionsService --> Package : validates (read)
    SubscriptionsService --> Member : validates (read) + updates primaryTrainerId
    SubscriptionsService --> Staff : validates trainer (optional)
    SubscriptionsService --> Subscription : creates (status=pending)
    SubscriptionsService --> AuditService : logs
    AuditService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC07A — Gia hạn gói tập

> Ghi chú thực tế: `PaymentService` không tham gia. Payment record được tạo trực tiếp qua Prisma bên trong `$transaction` cùng với lệnh cập nhật `endDate`. Amount lấy từ `package.price` phía server, không tin dữ liệu từ client.

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Actor as Member / Staff
    participant Client as SubscriptionDetailPage
    participant API as SubscriptionsController
    participant Svc as SubscriptionsService
    participant Audit as AuditService
    participant DB as Database

    Actor->>Client: Chọn gia hạn gói tập, điền phương thức thanh toán
    Client->>API: POST /api/v1/subscriptions/:id/renew
    API->>Svc: renewSubscription(subscriptionId, dto, caller)

    Svc->>DB: SELECT subscriptions WHERE subscriptionId (kèm member, package, trainer)
    DB-->>Svc: Subscription | null

    alt Subscription không tồn tại hoặc status != active
        Svc-->>API: NotFoundException (NOT_FOUND)
        API-->>Client: 404 Not Found
        Client-->>Actor: Hiển thị lỗi chỉ gia hạn gói đang hoạt động
    end

    alt Package đã ngừng kinh doanh (status != active)
        Svc-->>API: BadRequestException (PACKAGE_INACTIVE)
        API-->>Client: 400 Bad Request
        Client-->>Actor: Thông báo gói này đã ngừng bán, không thể gia hạn
    end

    Svc->>Svc: assertCanAccessSubscription(memberId, memberUserId, caller)

    alt Caller không có quyền truy cập subscription này
        Svc-->>API: ForbiddenException (FORBIDDEN)
        API-->>Client: 403 Forbidden
        Client-->>Actor: Hiển thị lỗi không có quyền
    end

    Svc->>Svc: newEndDate = endDate + package.durationDays

    Svc->>DB: $transaction BEGIN
    Svc->>DB: INSERT payments (amount=package.price, method, status=success, paidAt=now)
    Svc->>DB: UPDATE subscriptions SET endDate = newEndDate
    Svc->>DB: $transaction COMMIT
    DB-->>Svc: updated Subscription (kèm Member, Package, Trainer)

    Svc->>Audit: log(subscription.renew, subscriptionId, beforeEndDate, newEndDate)
    Svc-->>API: { data: serializedSubscription }
    API-->>Client: 200 OK
    Client-->>Actor: Hiển thị thông tin gói tập sau gia hạn (endDate mới)
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    SD[SubscriptionDetailPage] -- "1: POST /subscriptions/:id/renew (method, txRef)" --> SC[SubscriptionsController]
    SC -- "2: renewSubscription(id, dto, caller)" --> SS[SubscriptionsService]
    SS -- "3: SELECT subscription + package + member" --> DB[(Database)]
    DB -- "4: Subscription" --> SS
    SS -- "5: assertCanAccessSubscription" --> SS
    SS -- "6: $transaction INSERT payment (amount=pkg.price, status=success)" --> DB
    SS -- "7: $transaction UPDATE subscription endDate" --> DB
    DB -- "8: updated Subscription" --> SS
    SS -- "9: log(subscription.renew)" --> AS[AuditService]
    AS -- "10: INSERT audit_logs" --> DB
    SS -- "11: serializedSubscription" --> SC
    SC -- "12: 200 OK" --> SD
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class SubscriptionDetailPage {
        <<boundary>>
        +displaySubscriptionDetail() void
        +submitRenewal(method, transactionReference) void
    }
    class SubscriptionsController {
        <<boundary>>
        +renew(id, dto, user) Promise~SubscriptionResponse~
    }
    class SubscriptionsService {
        <<control>>
        +renewSubscription(subscriptionId, dto, caller) Promise~SubscriptionData~
        -assertCanAccessSubscription(memberId, memberUserId, caller) Promise~void~
        -serializeSubscription(sub) object
    }
    class AuditService {
        <<control>>
        +log(entry) void
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +memberId: BigInt
        +packageId: BigInt
        +endDate: DateTime
        +status: SubscriptionStatus
    }
    class Package {
        <<entity>>
        +packageId: BigInt
        +durationDays: number
        +price: Decimal
        +status: PackageStatus
    }
    class Payment {
        <<entity>>
        +paymentId: BigInt
        +memberId: BigInt
        +subscriptionId: BigInt
        +amount: Decimal
        +method: PaymentMethod
        +status: PaymentStatus
        +paidAt: DateTime
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +userId: BigInt
    }
    class AuditLog {
        <<entity>>
        +auditId: BigInt
        +actorUserId: BigInt
        +action: string
        +resourceType: string
    }

    SubscriptionDetailPage --> SubscriptionsController : POST /subscriptions/:id/renew
    SubscriptionsController --> SubscriptionsService : delegates
    SubscriptionsService --> Subscription : reads + updates endDate
    SubscriptionsService --> Package : validates status + reads price/durationDays
    SubscriptionsService --> Member : validates access
    SubscriptionsService --> Payment : creates (status=success)
    SubscriptionsService --> AuditService : logs
    AuditService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC07B — Hủy gói tập

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor User as Member / Staff
    participant Client as SubscriptionDetailPage
    participant API as SubscriptionsController
    participant Svc as SubscriptionsService
    participant DB as Database

    User->>Client: Nhấn "Hủy gói tập"
    Client->>API: PATCH /api/v1/subscriptions/:id/cancel [RequirePermission: subscription.cancel]
    API->>Svc: cancelSubscription(subscriptionId, caller)
    Svc->>DB: SELECT subscription WHERE subscriptionId AND deletedAt IS NULL INCLUDE member, user, package

    alt Không tìm thấy hoặc status đã là cancelled / expired
        DB-->>Svc: null hoặc sub.status ∈ {cancelled, expired}
        Svc-->>API: NotFoundException
        API-->>Client: 404 Not Found
        Client-->>User: Hiển thị lỗi không tìm thấy
    end

    DB-->>Svc: Subscription
    Svc->>Svc: assertCanAccessSubscription(memberId, memberUserId, caller)

    alt Không có quyền truy cập subscription
        Svc-->>API: ForbiddenException
        API-->>Client: 403 Forbidden
        Client-->>User: Hiển thị lỗi không có quyền
    end

    alt status không phải active hoặc pending
        Svc-->>API: ConflictException (SUBSCRIPTION_NOT_CANCELLABLE)
        API-->>Client: 409 Conflict
        Client-->>User: Hiển thị lỗi không thể hủy
    end

    Svc->>Svc: effectiveEndDate = endDate > yesterday ? yesterday : endDate
    Svc->>DB: $transaction: UPDATE subscription SET status=cancelled, cancelledAt=now, endDate=effectiveEndDate

    opt subscription.trainerId !== null
        Svc->>DB: UPDATE member SET primaryTrainerId=null
    end

    Svc->>DB: INSERT audit_logs (action=subscription.cancel, resourceId=subscriptionId)
    DB-->>Svc: OK
    Svc-->>API: { subscriptionId, status='cancelled', cancelledAt, endDate }
    API-->>Client: 200 { success: true, data }
    Client-->>User: Hiển thị xác nhận hủy thành công
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    SD[SubscriptionDetailPage] -- "1: PATCH /subscriptions/:id/cancel" --> SC[SubscriptionsController]
    SC -- "2: cancelSubscription(id, caller)" --> SS[SubscriptionsService]
    SS -- "3: SELECT subscription + member + user" --> DB[(Database)]
    DB -- "4: Subscription" --> SS
    SS -- "5: assertCanAccessSubscription()" --> SS
    SS -- "6: $transaction: UPDATE subscription status=cancelled, endDate=effectiveEndDate" --> DB
    SS -- "7: [nếu trainerId] UPDATE member.primaryTrainerId=null" --> DB
    SS -- "8: INSERT audit_log (subscription.cancel)" --> DB
    DB -- "9: OK" --> SS
    SS -- "10: { status: cancelled, endDate }" --> SC
    SC -- "11: 200 { success: true, data }" --> SD
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class SubscriptionDetailPage {
        <<boundary>>
        +cancelSubscription()
    }
    class SubscriptionsController {
        <<boundary>>
        +cancel(id, user)
    }
    class SubscriptionsService {
        <<control>>
        +cancelSubscription(subscriptionId, caller)
        -assertCanAccessSubscription(memberId, memberUserId, caller)
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +status: SubscriptionStatus
        +endDate: Date
        +cancelledAt: Date
        +trainerId: BigInt?
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +primaryTrainerId: BigInt?
    }
    class AuditLog {
        <<entity>>
        +action: string
        +resourceType: string
        +resourceId: string
    }
    SubscriptionDetailPage --> SubscriptionsController : PATCH /subscriptions/:id/cancel
    SubscriptionsController --> SubscriptionsService : delegates
    SubscriptionsService --> Subscription : reads + updates status/endDate
    SubscriptionsService --> Member : clears primaryTrainerId nếu có trainer
    SubscriptionsService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC08 — Xem gói tập hiện tại và lịch sử

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Member as Member
    participant Client as PackageHistoryPage
    participant API as SubscriptionsController
    participant Svc as SubscriptionsService
    participant DB as Database

    Member->>Client: Mở trang gói tập
    Client->>API: GET /api/v1/subscriptions?status=active [RequirePermission: subscription.read]
    API->>Svc: listSubscriptions({ status, page, pageSize }, caller)

    alt memberId không có trong JWT payload
        Svc->>DB: SELECT member WHERE userId = caller.userId AND deletedAt IS NULL
        DB-->>Svc: Member { memberId }
    end

    Svc->>DB: SELECT subscriptions WHERE memberId=selfMemberId AND status=active AND deletedAt IS NULL INCLUDE package, member, trainer ORDER BY createdAt DESC
    Svc->>DB: COUNT subscriptions WHERE same filters
    DB-->>Svc: Subscription[], total
    Svc-->>API: { data: Subscription[], meta: { page, pageSize, totalItems, totalPages } }
    API-->>Client: 200 { success: true, data, meta }
    Client-->>Member: Hiển thị gói tập hiện tại (status, daysLeft, packageName, endDate)

    Member->>Client: Chuyển sang tab lịch sử
    Client->>API: GET /api/v1/subscriptions?status=cancelled [RequirePermission: subscription.read]
    API->>Svc: listSubscriptions({ status: cancelled, page, pageSize }, caller)
    Svc->>DB: SELECT subscriptions WHERE memberId=selfMemberId AND status=cancelled AND deletedAt IS NULL ORDER BY createdAt DESC
    DB-->>Svc: Subscription[]
    Svc-->>API: { data: Subscription[], meta }
    API-->>Client: 200 { success: true, data, meta }
    Client-->>Member: Hiển thị lịch sử các gói đã hủy / hết hạn
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    PHP[PackageHistoryPage] -- "1: GET /subscriptions?status=active" --> SC[SubscriptionsController]
    SC -- "2: listSubscriptions(dto, caller)" --> SS[SubscriptionsService]
    SS -- "3: SELECT member WHERE userId [nếu memberId thiếu trong JWT]" --> DB[(Database)]
    DB -- "4: memberId" --> SS
    SS -- "5: SELECT subscriptions WHERE memberId + status filter INCLUDE package, trainer" --> DB
    SS -- "6: COUNT subscriptions WHERE same filter" --> DB
    DB -- "7: Subscription[], total" --> SS
    SS -- "8: { data[], meta }" --> SC
    SC -- "9: 200 { success: true, data, meta }" --> PHP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class PackageHistoryPage {
        <<boundary>>
        +loadCurrentPackage()
        +loadHistory()
    }
    class SubscriptionsController {
        <<boundary>>
        +list(query, user)
    }
    class SubscriptionsService {
        <<control>>
        +listSubscriptions(dto, caller)
        -resolveCallerMemberId(caller)
        -serializeSubscription(sub)
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +memberId: BigInt
        +status: SubscriptionStatus
        +startDate: Date
        +endDate: Date
        +cancelledAt: Date?
        +daysLeft: number?
    }
    class Package {
        <<entity>>
        +packageId: BigInt
        +name: string
        +durationDays: number
        +price: Decimal
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +memberCode: string
    }
    PackageHistoryPage --> SubscriptionsController : GET /subscriptions?status=
    SubscriptionsController --> SubscriptionsService : delegates
    SubscriptionsService --> Member : resolves selfMemberId
    SubscriptionsService --> Subscription : reads list + serializes
    SubscriptionsService --> Package : includes via relation
```

---

### Thiết kế kiến trúc cho UC09 — Quản lý hội viên

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Staff as Staff
    participant Client as MemberListPage / MemberDetailPage
    participant API as MembersController
    participant Svc as MembersService
    participant DB as Database

    Note over Staff, DB: Luồng 1 — Xem danh sách hội viên
    Staff->>Client: Mở trang danh sách hội viên
    Client->>API: GET /api/v1/members?search=&status=&subStatus=&page= [RequirePermission: member.read]
    API->>Svc: listMembers(dto, caller)
    Svc->>DB: SELECT members INCLUDE user, activeSubscription+package WHERE filters ORDER BY createdAt DESC
    Svc->>DB: COUNT members WHERE same filters
    DB-->>Svc: Member[], total
    Svc-->>API: { data: MemberWithSub[], meta: { page, pageSize, totalItems, totalPages } }
    API-->>Client: 200 { success: true, data, meta }
    Client-->>Staff: Hiển thị danh sách hội viên kèm trạng thái gói tập hiện tại

    Note over Staff, DB: Luồng 2 — Xem chi tiết hội viên
    Staff->>Client: Nhấn vào hội viên
    Client->>API: GET /api/v1/members/:id
    API->>Svc: getMemberForCaller(memberId, caller)
    Svc->>DB: SELECT member WHERE memberId AND deletedAt IS NULL INCLUDE user, primaryTrainer+user, subscriptions+package (last 5)
    DB-->>Svc: MemberDetail
    Svc->>Svc: assertCanReadMember(member, caller)
    Svc-->>API: { data: MemberDetail }
    API-->>Client: 200 { success: true, data }
    Client-->>Staff: Hiển thị chi tiết hội viên, lịch sử 5 gói tập gần nhất, thông tin PT

    Note over Staff, DB: Luồng 3 — Cập nhật thông tin hội viên
    Staff->>Client: Chỉnh sửa thông tin và lưu
    Client->>API: PATCH /api/v1/members/:id { fullName, phone, dateOfBirth, address }
    API->>Svc: updateMemberForCaller(memberId, dto, caller)
    Svc->>DB: SELECT member WHERE memberId INCLUDE user
    DB-->>Svc: Member + User
    Svc->>Svc: assertIsOwnerStaffOrSelf
    Svc->>DB: $transaction: UPDATE user SET fullName, phone + UPDATE member SET dateOfBirth, address
    DB-->>Svc: Updated member + user
    Svc->>DB: INSERT audit_logs (action=member.update)
    DB-->>Svc: OK
    Svc-->>API: { data: Member }
    API-->>Client: 200 { success: true, data }
    Client-->>Staff: Hiển thị thông tin đã cập nhật

    Note over Staff, DB: Luồng 4 — Xóa hội viên (soft delete)
    Staff->>Client: Nhấn "Xóa hội viên"
    Client->>API: DELETE /api/v1/members/:id [RequirePermission: member.delete]
    API->>Svc: deleteMember(memberId, caller.userId)
    Svc->>DB: SELECT member WHERE memberId INCLUDE user
    DB-->>Svc: Member + User
    Svc->>DB: $transaction: UPDATE member SET deletedAt=now + UPDATE user SET deletedAt=now
    DB-->>Svc: OK
    Svc->>DB: INSERT audit_logs (action=member.delete)
    DB-->>Svc: OK
    API-->>Client: 204 No Content
    Client-->>Staff: Hội viên đã bị xóa khỏi danh sách
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    MLP[MemberListPage] -- "1: GET /members?filters" --> MC[MembersController]
    MC -- "2: listMembers(dto, caller)" --> MS[MembersService]
    MS -- "3: SELECT members + activeSubscription INCLUDE user, package" --> DB[(Database)]
    MS -- "4: COUNT members WHERE filters" --> DB
    DB -- "5: Member[], total" --> MS
    MS -- "6: { data[], meta }" --> MC
    MC -- "7: 200 { success, data, meta }" --> MLP

    MDP[MemberDetailPage] -- "8: GET /members/:id" --> MC
    MC -- "9: getMemberForCaller(id, caller)" --> MS
    MS -- "10: SELECT member INCLUDE user, trainer, subscriptions" --> DB
    DB -- "11: MemberDetail" --> MS
    MS -- "12: assertCanReadMember()" --> MS
    MS -- "13: { data: MemberDetail }" --> MC
    MC -- "14: 200 { success, data }" --> MDP

    MDP -- "15: PATCH /members/:id" --> MC
    MC -- "16: updateMemberForCaller(id, dto, caller)" --> MS
    MS -- "17: $transaction: UPDATE user + UPDATE member" --> DB
    MS -- "18: INSERT audit_log (member.update)" --> DB
    DB -- "19: OK" --> MS
    MS -- "20: { data: Member }" --> MC
    MC -- "21: 200 { success, data }" --> MDP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class MemberListPage {
        <<boundary>>
        +loadMembers(filters)
    }
    class MemberDetailPage {
        <<boundary>>
        +loadDetail(memberId)
        +updateMember(dto)
        +deleteMember(memberId)
    }
    class MembersController {
        <<boundary>>
        +list(query, user)
        +detail(id, user)
        +update(id, dto, user)
        +delete(id, user)
    }
    class MembersService {
        <<control>>
        +listMembers(dto, caller)
        +getMemberForCaller(memberId, caller)
        +updateMemberForCaller(memberId, dto, caller)
        +deleteMember(memberId, actorUserId)
        -assertCanReadMember(member, caller)
        -serializeMemberWithSub(member)
        -serializeMemberDetail(member)
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +memberCode: string
        +userId: BigInt
        +primaryTrainerId: BigInt?
        +dateOfBirth: Date?
        +address: string?
        +deletedAt: Date?
    }
    class User {
        <<entity>>
        +userId: BigInt
        +fullName: string
        +email: string
        +phone: string?
        +status: UserStatus
        +deletedAt: Date?
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +status: SubscriptionStatus
        +endDate: Date
    }
    class AuditLog {
        <<entity>>
        +action: string
        +resourceType: string
        +resourceId: string
    }
    MemberListPage --> MembersController : GET /members
    MemberDetailPage --> MembersController : GET/PATCH/DELETE /members/:id
    MembersController --> MembersService : delegates
    MembersService --> Member : reads + updates + soft-deletes
    MembersService --> User : updates fullName/phone + soft-deletes
    MembersService --> Subscription : includes last 5 in detail
    MembersService --> AuditLog : writes on update/delete
```

---

### Thiết kế kiến trúc cho UC10 — Quản lý giáo án / workout plan

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Trainer as Trainer
    participant Client as WorkoutPlanPage
    participant API as WorkoutPlansController
    participant Svc as WorkoutPlansService
    participant DB as Database

    Note over Trainer, DB: Luồng 1 — Tạo giáo án mới
    Trainer->>Client: Tạo giáo án mới
    Client->>API: POST /api/v1/workout-plans [RequirePermission: workout_plan.create]
    API->>Svc: create(dto, caller)
    Svc->>DB: SELECT staff WHERE userId = caller.userId [nếu staffId thiếu trong JWT]
    DB-->>Svc: staffId
    Svc->>DB: INSERT workout_plan (name, description, creatorType=staff, creatorStaffId, status=draft)
    DB-->>Svc: WorkoutPlan
    Svc->>DB: INSERT audit_logs (action=workout_plan.create)
    Svc-->>API: WorkoutPlan (status=draft)
    API-->>Client: 201 { success: true, data }
    Client-->>Trainer: Hiển thị giáo án mới tạo ở trạng thái draft

    Note over Trainer, DB: Luồng 2 — Thêm ngày tập và bài tập
    Trainer->>Client: Thêm ngày tập
    Client->>API: POST /api/v1/workout-plans/:id/days [RequirePermission: workout_plan.update]
    API->>Svc: addDay(planId, dto, caller)
    Svc->>DB: SELECT workout_plan WHERE planId AND deletedAt IS NULL
    DB-->>Svc: WorkoutPlan
    Svc->>Svc: assertCanMutatePlan + assertPlanStructureMutable + assertPlanHasNoLogs
    Svc->>DB: INSERT workout_plan_day (planId, dayNumber, weekNumber, dayOfWeek, name)
    Svc->>DB: INSERT audit_logs (action=workout_plan.update)
    DB-->>Svc: WorkoutPlanDay
    Svc-->>API: WorkoutPlanDay
    API-->>Client: 201 { success: true, data }

    Trainer->>Client: Thêm bài tập vào ngày
    Client->>API: POST /api/v1/workout-plans/:id/days/:dayId/exercises [RequirePermission: workout_plan.update]
    API->>Svc: addExercise(planId, planDayId, dto, caller)
    Svc->>DB: SELECT workout_plan_day WHERE planDayId AND planId INCLUDE plan
    DB-->>Svc: WorkoutPlanDay + Plan
    Svc->>Svc: assertCanMutatePlan + assertPlanStructureMutable + assertPlanHasNoLogs
    Svc->>DB: SELECT exercise WHERE exerciseId AND deletedAt IS NULL
    DB-->>Svc: Exercise
    Svc->>DB: INSERT workout_plan_exercise (planDayId, exerciseId, targetSets, targetReps, restSeconds, ...)
    Svc->>DB: INSERT audit_logs (action=workout_plan.update)
    DB-->>Svc: WorkoutPlanExercise
    Svc-->>API: WorkoutPlanExercise + exercise
    API-->>Client: 201 { success: true, data }
    Client-->>Trainer: Hiển thị bài tập đã thêm vào ngày tập

    Note over Trainer, DB: Luồng 3 — Kích hoạt giáo án (draft → active)
    Trainer->>Client: Nhấn "Kích hoạt giáo án"
    Client->>API: PATCH /api/v1/workout-plans/:id { status: active } [RequirePermission: workout_plan.update]
    API->>Svc: update(planId, { status: active }, caller)
    Svc->>DB: SELECT workout_plan_days WHERE planId INCLUDE exercises
    DB-->>Svc: Days + Exercises

    alt Ngày trống hoặc bài tập thiếu targetReps/Duration hoặc restSeconds
        Svc-->>API: BadRequestException
        API-->>Client: 400 Moi ngay can co bai tap day du
        Client-->>Trainer: Hiển thị lỗi validation
    end

    Svc->>DB: UPDATE workout_plan SET status=active
    Svc->>DB: INSERT audit_logs (action=workout_plan.update)
    DB-->>Svc: WorkoutPlan (status=active)
    Svc-->>API: WorkoutPlan
    API-->>Client: 200 { success: true, data }
    Client-->>Trainer: Giáo án đã được kích hoạt

    Note over Trainer, DB: Luồng 4 — Giao giáo án cho hội viên
    Trainer->>Client: Chọn hội viên và giao giáo án
    Client->>API: POST /api/v1/workout-plans/members/:memberId/assign { planId, startDate }
    API->>Svc: assignPlan(memberId, dto, caller)
    Svc->>DB: SELECT member WHERE memberId AND deletedAt IS NULL
    DB-->>Svc: Member { primaryTrainerId }
    Svc->>Svc: validate trainer là primaryTrainer của member

    alt Trainer không phụ trách member này
        Svc-->>API: ForbiddenException (TRAINER_NOT_ASSIGNED)
        API-->>Client: 403 Forbidden
        Client-->>Trainer: Hiển thị lỗi không có quyền
    end

    Svc->>DB: SELECT workout_plan WHERE planId AND status=active
    DB-->>Svc: WorkoutPlan
    Svc->>DB: $transaction: FOR UPDATE active assignments → UPDATE status=replaced + INSERT new MemberWorkoutPlan (status=active)
    DB-->>Svc: MemberWorkoutPlan
    Svc->>DB: INSERT audit_logs (action=workout_plan.assign)
    DB-->>Svc: OK
    Svc-->>API: MemberWorkoutPlan
    API-->>Client: 201 { success: true, data }
    Client-->>Trainer: Giáo án đã được giao cho hội viên
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    WPP[WorkoutPlanPage] -- "1: POST /workout-plans" --> WPC[WorkoutPlansController]
    WPC -- "2: create(dto, caller)" --> WPS[WorkoutPlansService]
    WPS -- "3: INSERT workout_plan status=draft" --> DB[(Database)]
    WPS -- "4: INSERT audit_log" --> DB
    DB -- "5: WorkoutPlan" --> WPS
    WPS -- "6: WorkoutPlan" --> WPC
    WPC -- "7: 201 { success, data }" --> WPP

    WPP -- "8: POST /workout-plans/:id/days" --> WPC
    WPC -- "9: addDay(planId, dto, caller)" --> WPS
    WPS -- "10: assertCanMutatePlan + assertPlanHasNoLogs" --> WPS
    WPS -- "11: INSERT workout_plan_day" --> DB
    DB -- "12: WorkoutPlanDay" --> WPS

    WPP -- "13: POST /workout-plans/:id/days/:dayId/exercises" --> WPC
    WPC -- "14: addExercise(planId, dayId, dto, caller)" --> WPS
    WPS -- "15: SELECT exercise WHERE exerciseId" --> DB
    WPS -- "16: INSERT workout_plan_exercise" --> DB
    DB -- "17: WorkoutPlanExercise" --> WPS

    WPP -- "18: PATCH /workout-plans/:id { status: active }" --> WPC
    WPC -- "19: update(planId, dto, caller)" --> WPS
    WPS -- "20: SELECT days + exercises để validate" --> DB
    WPS -- "21: UPDATE workout_plan status=active" --> DB
    DB -- "22: WorkoutPlan active" --> WPS

    WPP -- "23: POST /workout-plans/members/:memberId/assign" --> WPC
    WPC -- "24: assignPlan(memberId, dto, caller)" --> WPS
    WPS -- "25: $transaction: UPDATE old=replaced + INSERT MemberWorkoutPlan active" --> DB
    WPS -- "26: INSERT audit_log (workout_plan.assign)" --> DB
    DB -- "27: MemberWorkoutPlan" --> WPS
    WPS -- "28: MemberWorkoutPlan" --> WPC
    WPC -- "29: 201 { success, data }" --> WPP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class WorkoutPlanPage {
        <<boundary>>
        +createPlan()
        +addDay()
        +addExercise()
        +activatePlan()
        +assignPlan(memberId)
    }
    class WorkoutPlansController {
        <<boundary>>
        +list(user)
        +create(dto, user)
        +update(id, dto, user)
        +addDay(id, dto, user)
        +addExercise(id, dayId, dto, user)
        +assign(memberId, dto, user)
    }
    class WorkoutPlansService {
        <<control>>
        +findAll(user)
        +create(dto, caller)
        +update(id, dto, caller)
        +addDay(planId, dto, caller)
        +addExercise(planId, dayId, dto, caller)
        +assignPlan(memberId, dto, caller)
        -assertCanMutatePlan(plan, caller)
        -assertPlanHasNoLogs(planId)
        -assertPlanStructureMutable(status)
    }
    class WorkoutPlan {
        <<entity>>
        +planId: BigInt
        +name: string
        +creatorType: PlanCreatorType
        +creatorStaffId: BigInt?
        +status: WorkoutPlanStatus
    }
    class WorkoutPlanDay {
        <<entity>>
        +planDayId: BigInt
        +planId: BigInt
        +dayNumber: number
        +weekNumber: number
        +dayOfWeek: number
    }
    class WorkoutPlanExercise {
        <<entity>>
        +planExerciseId: BigInt
        +planDayId: BigInt
        +exerciseId: BigInt
        +targetSets: number
        +targetReps: number?
        +targetDurationSec: number?
        +restSeconds: number
    }
    class Exercise {
        <<entity>>
        +exerciseId: BigInt
        +name: string
    }
    class MemberWorkoutPlan {
        <<entity>>
        +assignmentId: BigInt
        +memberId: BigInt
        +planId: BigInt
        +assignedByStaffId: BigInt?
        +status: WorkoutAssignmentStatus
        +startDate: Date
    }
    class AuditLog {
        <<entity>>
        +action: string
        +resourceType: string
        +resourceId: string
    }
    WorkoutPlanPage --> WorkoutPlansController
    WorkoutPlansController --> WorkoutPlansService : delegates
    WorkoutPlansService --> WorkoutPlan : creates + updates
    WorkoutPlansService --> WorkoutPlanDay : creates + deletes
    WorkoutPlansService --> WorkoutPlanExercise : creates + deletes
    WorkoutPlansService --> Exercise : validates existence
    WorkoutPlansService --> MemberWorkoutPlan : creates assignment
    WorkoutPlansService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC11 — Quản lý buổi tập / lịch tập

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Trainer as Trainer
    participant Client as TrainingSchedulePage
    participant API as TrainingController
    participant Svc as TrainingService
    participant DB as Database

    Note over Trainer, DB: Luồng 1 — Tạo buổi tập mới
    Trainer->>Client: Tạo buổi tập cho hội viên
    Client->>API: POST /api/v1/training-sessions [RequirePermission: session.manage]
    API->>Svc: createSession(dto, caller)
    Svc->>Svc: validate endTime > startTime + startTime >= now - 5min grace
    Svc->>DB: SELECT member WHERE memberId AND deletedAt IS NULL
    DB-->>Svc: Member

    alt Member không tồn tại
        Svc-->>API: NotFoundException
        API-->>Client: 404 Not Found
        Client-->>Trainer: Hiển thị lỗi không tìm thấy hội viên
    end

    Svc->>DB: SELECT subscription WHERE memberId AND status=active AND startDate<=now AND endDate>=now
    DB-->>Svc: Subscription

    alt Không có gói tập active
        Svc-->>API: BadRequestException (NO_ACTIVE_SUBSCRIPTION)
        API-->>Client: 400 Bad Request
        Client-->>Trainer: Hiển thị lỗi hội viên không có gói tập active
    end

    Svc->>DB: SELECT gymRoom WHERE roomId AND deletedAt IS NULL
    Svc->>DB: SELECT staff WHERE trainerStaffId AND deletedAt IS NULL
    DB-->>Svc: GymRoom + Staff

    Svc->>DB: checkOverlap: SELECT trainingSession WHERE roomId AND time overlap AND status≠cancelled
    Svc->>DB: checkOverlap: SELECT trainingSession WHERE trainerStaffId AND time overlap AND status≠cancelled
    DB-->>Svc: Overlap results

    alt Phòng tập hoặc trainer bị conflict
        Svc-->>API: ConflictException (ROOM_CONFLICT / TRAINER_CONFLICT)
        API-->>Client: 409 Conflict
        Client-->>Trainer: Hiển thị lỗi lịch bị trùng
    end

    Svc->>DB: resolveSessionPlanLink: SELECT memberWorkoutPlan WHERE memberId AND status=active
    DB-->>Svc: MemberWorkoutPlan (optional)
    Svc->>DB: resolveSessionPlanLink: SELECT workoutPlanDay WHERE planId AND dayNumber matches
    DB-->>Svc: WorkoutPlanDay (optional, linked if found)

    Svc->>DB: INSERT training_session (memberId, trainerStaffId, roomId, startTime, endTime, assignmentId?, planDayId?, status=scheduled)
    DB-->>Svc: TrainingSession
    Svc->>DB: INSERT audit_log (action=training.create, resourceType=training_session)
    DB-->>Svc: OK
    Svc-->>API: TrainingSession (with member, trainer, room)
    API-->>Client: 201 { success: true, data }
    Client-->>Trainer: Hiển thị buổi tập vừa tạo

    Note over Trainer, DB: Luồng 2 — Xem danh sách buổi tập
    Trainer->>Client: Xem lịch tập
    Client->>API: GET /api/v1/training-sessions?memberId=&status=&from=&to= [RequirePermission: session.read]
    API->>Svc: listSessions(dto, caller)
    Svc->>DB: SELECT training_sessions WHERE filters (memberId, trainerStaffId, roomId, status, startTime range) INCLUDE member, trainer, room, assignment, planDay PAGINATE
    DB-->>Svc: TrainingSession[]
    Svc-->>API: { data, total, page, pageSize }
    API-->>Client: 200 { success: true, data }
    Client-->>Trainer: Hiển thị danh sách buổi tập

    Note over Trainer, DB: Luồng 3 — Cập nhật trạng thái buổi tập
    Trainer->>Client: Bắt đầu / kết thúc buổi tập
    Client->>API: POST /api/v1/training-sessions/:id/status { status: in_progress | completed } [RequirePermission: session.manage]
    API->>Svc: updateSessionStatus(id, status, caller)
    Svc->>DB: SELECT training_session WHERE sessionId AND deletedAt IS NULL
    DB-->>Svc: TrainingSession

    alt Transition không hợp lệ (ví dụ: completed → in_progress)
        Svc-->>API: BadRequestException (INVALID_STATUS_TRANSITION)
        API-->>Client: 400 Bad Request
        Client-->>Trainer: Hiển thị lỗi trạng thái không hợp lệ
    end

    Svc->>DB: UPDATE training_session SET status = newStatus
    Svc->>DB: INSERT audit_log (action=training.status.{newStatus})
    DB-->>Svc: TrainingSession (updated)
    Svc-->>API: TrainingSession
    API-->>Client: 200 { success: true, data }
    Client-->>Trainer: Hiển thị trạng thái mới

    Note over Trainer, DB: Luồng 4 — Hủy buổi tập
    Trainer->>Client: Nhấn hủy buổi tập
    Client->>API: POST /api/v1/training-sessions/:id/cancel [RequirePermission: session.manage]
    API->>Svc: cancelSession(id, dto, caller)
    Svc->>DB: SELECT training_session WHERE sessionId AND deletedAt IS NULL
    DB-->>Svc: TrainingSession
    Svc->>Svc: permission check — trainer chỉ cancel được session của mình
    Svc->>DB: UPDATE training_session SET status=cancelled
    Svc->>DB: INSERT audit_log (action=training.cancel)
    DB-->>Svc: OK
    Svc-->>API: TrainingSession (status=cancelled)
    API-->>Client: 200 { success: true, data }
    Client-->>Trainer: Hiển thị buổi tập đã hủy
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    TSP[TrainingSchedulePage] -- "1: POST /training-sessions" --> TC[TrainingController]
    TC -- "2: createSession(dto, caller)" --> TS[TrainingService]
    TS -- "3: SELECT member + validate" --> DB[(Database)]
    TS -- "4: SELECT subscription WHERE status=active" --> DB
    TS -- "5: SELECT gymRoom + staff (trainer)" --> DB
    TS -- "6: checkOverlap room + trainer" --> DB
    DB -- "7: overlap results" --> TS
    TS -- "8: resolveSessionPlanLink: SELECT memberWorkoutPlan + workoutPlanDay" --> DB
    DB -- "9: MemberWorkoutPlan + WorkoutPlanDay (optional)" --> TS
    TS -- "10: INSERT training_session (status=scheduled)" --> DB
    TS -- "11: INSERT audit_log (training.create)" --> DB
    DB -- "12: TrainingSession" --> TS
    TS -- "13: TrainingSession" --> TC
    TC -- "14: 201 { success, data }" --> TSP

    TSP -- "15: GET /training-sessions?filters" --> TC
    TC -- "16: listSessions(dto, caller)" --> TS
    TS -- "17: SELECT training_sessions WITH filters INCLUDE member+trainer+room" --> DB
    DB -- "18: TrainingSession[]" --> TS
    TS -- "19: { data, total }" --> TC
    TC -- "20: 200 { success, data }" --> TSP

    TSP -- "21: POST /training-sessions/:id/status { status }" --> TC
    TC -- "22: updateSessionStatus(id, status, caller)" --> TS
    TS -- "23: SELECT training_session" --> DB
    TS -- "24: UPDATE training_session.status" --> DB
    TS -- "25: INSERT audit_log (training.status.{status})" --> DB
    DB -- "26: TrainingSession (updated)" --> TS
    TS -- "27: TrainingSession" --> TC
    TC -- "28: 200 { success, data }" --> TSP

    TSP -- "29: POST /training-sessions/:id/cancel" --> TC
    TC -- "30: cancelSession(id, dto, caller)" --> TS
    TS -- "31: SELECT + permission check" --> DB
    TS -- "32: UPDATE training_session.status=cancelled" --> DB
    TS -- "33: INSERT audit_log (training.cancel)" --> DB
    DB -- "34: OK" --> TS
    TS -- "35: TrainingSession (cancelled)" --> TC
    TC -- "36: 200 { success, data }" --> TSP
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class TrainingSchedulePage {
        <<boundary>>
        +createSession()
        +listSessions(filters)
        +updateSessionStatus(id, status)
        +cancelSession(id)
    }
    class TrainingController {
        <<boundary>>
        +listSessions(dto, user)
        +getSession(id, user)
        +createSession(dto, user)
        +updateSession(id, dto, user)
        +cancelSession(id, dto, user)
        +updateSessionStatus(id, status, user)
    }
    class TrainingService {
        <<control>>
        +listSessions(dto, caller)
        +getSession(id, caller)
        +createSession(dto, caller)
        +updateSession(id, dto, caller)
        +cancelSession(id, dto, caller)
        +updateSessionStatus(id, status, caller)
        -checkOverlap(roomId, trainerStaffId, startTime, endTime)
        -resolveSessionPlanLink(memberId, startTime)
    }
    class TrainingSession {
        <<entity>>
        +sessionId: BigInt
        +memberId: BigInt
        +trainerStaffId: BigInt
        +roomId: BigInt
        +assignmentId: BigInt?
        +planDayId: BigInt?
        +startTime: DateTime
        +endTime: DateTime
        +status: SessionStatus
    }
    class Member {
        <<entity>>
        +memberId: BigInt
        +primaryTrainerId: BigInt?
    }
    class Staff {
        <<entity>>
        +staffId: BigInt
    }
    class GymRoom {
        <<entity>>
        +roomId: BigInt
        +name: string
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +memberId: BigInt
        +status: SubscriptionStatus
        +endDate: DateTime
    }
    class MemberWorkoutPlan {
        <<entity>>
        +assignmentId: BigInt
        +memberId: BigInt
        +planId: BigInt
        +status: WorkoutAssignmentStatus
    }
    class WorkoutPlanDay {
        <<entity>>
        +planDayId: BigInt
        +planId: BigInt
        +dayNumber: number
    }
    class AuditLog {
        <<entity>>
        +action: string
        +resourceType: string
    }
    TrainingSchedulePage --> TrainingController
    TrainingController --> TrainingService : delegates
    TrainingService --> TrainingSession : creates + updates
    TrainingService --> Member : validates
    TrainingService --> Staff : validates trainer
    TrainingService --> GymRoom : validates + conflict check
    TrainingService --> Subscription : validates active
    TrainingService --> MemberWorkoutPlan : links optional
    TrainingService --> WorkoutPlanDay : links optional
    TrainingService --> AuditLog : writes
```

---

### Thiết kế kiến trúc cho UC12 — Theo dõi và ghi nhận buổi tập

#### Biểu đồ tuần tự - Sequence Diagram

```mermaid
sequenceDiagram
    actor Member as Member
    participant AttPage as AttendancePage
    participant TAPI as TrainingController
    participant AttSvc as AttendanceService
    participant WLPage as WorkoutLogPage
    participant WLAPI as WorkoutLogsController
    participant WLSvc as WorkoutLogsService
    participant DB as Database

    Note over Member, DB: Luồng 1 — Check-in thủ công vào phòng tập
    Member->>AttPage: Check-in vào phòng tập
    AttPage->>TAPI: POST /api/v1/attendance/manual-checkin { memberCode } [RequirePermission: attendance.checkin]
    TAPI->>AttSvc: manualCheckin(dto, caller)
    AttSvc->>DB: SELECT member WHERE memberCode AND deletedAt IS NULL
    DB-->>AttSvc: Member

    alt Không tìm thấy member
        AttSvc-->>TAPI: NotFoundException
        TAPI-->>AttPage: 404 Not Found
        AttPage-->>Member: Hiển thị lỗi không tìm thấy
    end

    AttSvc->>DB: SELECT subscription WHERE memberId AND status=active AND startDate<=today AND endDate>=today
    DB-->>AttSvc: Subscription

    alt Không có gói tập active hôm nay
        AttSvc-->>TAPI: BadRequestException (NO_ACTIVE_SUBSCRIPTION)
        TAPI-->>AttPage: 400 Bad Request
        AttPage-->>Member: Hiển thị lỗi không có gói tập active
    end

    AttSvc->>DB: UPDATE attendance_log SET endTime=now WHERE memberId AND endTime IS NULL (auto-close open)
    AttSvc->>DB: INSERT attendance_log (memberId, subscriptionId, startTime=now, method=manual)
    DB-->>AttSvc: AttendanceLog
    AttSvc->>DB: INSERT audit_log (action=attendance.manual-checkin)
    AttSvc-->>TAPI: AttendanceLog
    TAPI-->>AttPage: 201 { success: true, data }
    AttPage-->>Member: Hiển thị check-in thành công

    Note over Member, DB: Luồng 2 — Check-out khỏi phòng tập
    Member->>AttPage: Check-out
    AttPage->>TAPI: PATCH /api/v1/attendance-logs/:id/checkout { endTime } [RequirePermission: attendance.checkin]
    TAPI->>AttSvc: checkout(id, dto, caller)
    AttSvc->>DB: SELECT attendance_log WHERE attendanceId AND deletedAt IS NULL
    DB-->>AttSvc: AttendanceLog

    alt endTime đã tồn tại (đã checkout trước đó)
        AttSvc-->>TAPI: ConflictException (ALREADY_CHECKED_OUT)
        TAPI-->>AttPage: 409 Conflict
        AttPage-->>Member: Hiển thị lỗi đã checkout rồi
    end

    AttSvc->>DB: UPDATE attendance_log SET endTime = dto.endTime WHERE attendanceId
    AttSvc->>DB: INSERT audit_log (action=attendance.checkout)
    DB-->>AttSvc: AttendanceLog (updated)
    AttSvc-->>TAPI: AttendanceLog
    TAPI-->>AttPage: 200 { success: true, data }
    AttPage-->>Member: Hiển thị thời gian tập đã ghi nhận

    Note over Member, DB: Luồng 3 — Ghi nhận chi tiết buổi tập (workout log)
    Member->>WLPage: Ghi nhận các set đã thực hiện
    WLPage->>WLAPI: POST /api/v1/workout-logs { assignmentId, planDayId, loggedAt, sets[] } [RequirePermission: workout_log.create]
    WLAPI->>WLSvc: create(dto, caller)
    WLSvc->>DB: resolveCallerMember: SELECT member WHERE userId = caller.userId
    DB-->>WLSvc: Member
    WLSvc->>DB: SELECT member_workout_plan WHERE assignmentId AND memberId AND status=active
    DB-->>WLSvc: MemberWorkoutPlan

    alt Assignment không tồn tại hoặc không thuộc member này
        WLSvc-->>WLAPI: NotFoundException / ForbiddenException
        WLAPI-->>WLPage: 404 / 403
        WLPage-->>Member: Hiển thị lỗi
    end

    WLSvc->>DB: SELECT workout_plan_day WHERE planDayId AND planId = assignment.planId
    DB-->>WLSvc: WorkoutPlanDay
    WLSvc->>DB: INSERT workout_log (memberId, assignmentId, planDayId, loggedAt, durationMin, notes)
    DB-->>WLSvc: WorkoutLog (logId)
    WLSvc->>DB: INSERT workout_log_set[] (logId, planExerciseId, setNumber, actualReps, actualWeightKg, completed) — bulk insert
    DB-->>WLSvc: WorkoutLogSet[]
    WLSvc->>DB: INSERT audit_log (action=workout_log.create)
    DB-->>WLSvc: OK
    WLSvc-->>WLAPI: WorkoutLog (with sets)
    WLAPI-->>WLPage: 201 { success: true, data }
    WLPage-->>Member: Hiển thị buổi tập đã được ghi nhận

    Note over Member, DB: Luồng 4 — Cập nhật workout log (trong vòng 24 giờ)
    Member->>WLPage: Chỉnh sửa log
    WLPage->>WLAPI: PATCH /api/v1/workout-logs/:id { sets[] } [RequirePermission: workout_log.update]
    WLAPI->>WLSvc: update(id, dto, caller)
    WLSvc->>DB: SELECT workout_log WHERE logId AND memberId = callerMemberId
    DB-->>WLSvc: WorkoutLog

    alt Log quá 24 giờ
        WLSvc-->>WLAPI: ForbiddenException (LOG_EDIT_WINDOW_EXPIRED)
        WLAPI-->>WLPage: 403 Forbidden
        WLPage-->>Member: Hiển thị lỗi không thể sửa sau 24 giờ
    end

    WLSvc->>DB: UPDATE workout_log (durationMin, notes) + DELETE old sets + INSERT new sets
    WLSvc->>DB: INSERT audit_log (action=workout_log.update)
    DB-->>WLSvc: WorkoutLog (updated)
    WLSvc-->>WLAPI: WorkoutLog
    WLAPI-->>WLPage: 200 { success: true, data }
    WLPage-->>Member: Hiển thị log đã cập nhật
```

#### Biểu đồ giao tiếp

```mermaid
graph LR
    AttPage[AttendancePage] -- "1: POST /attendance/manual-checkin" --> TC[TrainingController]
    TC -- "2: manualCheckin(dto, caller)" --> AttSvc[AttendanceService]
    AttSvc -- "3: SELECT member WHERE memberCode" --> DB[(Database)]
    AttSvc -- "4: SELECT subscription WHERE status=active today" --> DB
    AttSvc -- "5: UPDATE open attendance_log endTime=now" --> DB
    AttSvc -- "6: INSERT attendance_log (method=manual)" --> DB
    AttSvc -- "7: INSERT audit_log (attendance.manual-checkin)" --> DB
    DB -- "8: AttendanceLog" --> AttSvc
    AttSvc -- "9: AttendanceLog" --> TC
    TC -- "10: 201 { success, data }" --> AttPage

    AttPage -- "11: PATCH /attendance-logs/:id/checkout" --> TC
    TC -- "12: checkout(id, dto, caller)" --> AttSvc
    AttSvc -- "13: SELECT attendance_log" --> DB
    AttSvc -- "14: UPDATE attendance_log.endTime" --> DB
    AttSvc -- "15: INSERT audit_log (attendance.checkout)" --> DB
    DB -- "16: AttendanceLog (updated)" --> AttSvc
    AttSvc -- "17: AttendanceLog" --> TC
    TC -- "18: 200 { success, data }" --> AttPage

    WLPage[WorkoutLogPage] -- "19: POST /workout-logs { assignmentId, sets[] }" --> WLC[WorkoutLogsController]
    WLC -- "20: create(dto, caller)" --> WLSvc[WorkoutLogsService]
    WLSvc -- "21: SELECT member WHERE userId (resolveCallerMember)" --> DB
    WLSvc -- "22: SELECT member_workout_plan WHERE assignmentId AND status=active" --> DB
    WLSvc -- "23: SELECT workout_plan_day WHERE planDayId" --> DB
    WLSvc -- "24: INSERT workout_log" --> DB
    WLSvc -- "25: INSERT workout_log_set[] (bulk)" --> DB
    WLSvc -- "26: INSERT audit_log (workout_log.create)" --> DB
    DB -- "27: WorkoutLog + WorkoutLogSet[]" --> WLSvc
    WLSvc -- "28: WorkoutLog" --> WLC
    WLC -- "29: 201 { success, data }" --> WLPage

    WLPage -- "30: PATCH /workout-logs/:id" --> WLC
    WLC -- "31: update(id, dto, caller)" --> WLSvc
    WLSvc -- "32: SELECT workout_log WHERE logId AND validate 24h window" --> DB
    WLSvc -- "33: UPDATE workout_log + DELETE old sets + INSERT new sets" --> DB
    WLSvc -- "34: INSERT audit_log (workout_log.update)" --> DB
    DB -- "35: WorkoutLog (updated)" --> WLSvc
    WLSvc -- "36: WorkoutLog" --> WLC
    WLC -- "37: 200 { success, data }" --> WLPage
```

#### Biểu đồ lớp phân tích

```mermaid
classDiagram
    class AttendancePage {
        <<boundary>>
        +checkin(memberCode)
        +checkout(id, endTime)
        +listAttendance(filters)
    }
    class TrainingController {
        <<boundary>>
        +manualCheckin(dto, user)
        +checkout(id, dto, user)
        +listAttendance(dto, user)
    }
    class AttendanceService {
        <<control>>
        +manualCheckin(dto, caller)
        +checkout(id, dto, caller)
        +listAttendance(dto, caller)
        -serializeAttendance(log)
    }
    class WorkoutLogPage {
        <<boundary>>
        +createLog(assignmentId, sets)
        +updateLog(id, sets)
        +listLogs()
    }
    class WorkoutLogsController {
        <<boundary>>
        +create(dto, user)
        +update(id, dto, user)
        +list(user)
    }
    class WorkoutLogsService {
        <<control>>
        +create(dto, caller)
        +update(id, dto, caller)
        +findAll(caller)
        -resolveCallerMember(caller)
    }
    class AttendanceLog {
        <<entity>>
        +attendanceId: BigInt
        +memberId: BigInt
        +subscriptionId: BigInt
        +sessionId: BigInt?
        +startTime: DateTime
        +endTime: DateTime?
        +method: AttendanceMethod
    }
    class WorkoutLog {
        <<entity>>
        +logId: BigInt
        +memberId: BigInt
        +assignmentId: BigInt
        +planDayId: BigInt
        +loggedAt: DateTime
        +durationMin: Int?
    }
    class WorkoutLogSet {
        <<entity>>
        +logSetId: BigInt
        +logId: BigInt
        +planExerciseId: BigInt
        +setNumber: Int
        +actualReps: Int?
        +actualWeightKg: Decimal?
        +completed: Boolean
    }
    class Subscription {
        <<entity>>
        +subscriptionId: BigInt
        +memberId: BigInt
        +status: SubscriptionStatus
        +endDate: DateTime
    }
    class MemberWorkoutPlan {
        <<entity>>
        +assignmentId: BigInt
        +memberId: BigInt
        +planId: BigInt
        +status: WorkoutAssignmentStatus
    }
    class WorkoutPlanDay {
        <<entity>>
        +planDayId: BigInt
        +planId: BigInt
        +dayNumber: number
    }
    class AuditLog {
        <<entity>>
        +action: string
    }
    AttendancePage --> TrainingController
    TrainingController --> AttendanceService : delegates
    AttendanceService --> AttendanceLog : creates + updates
    AttendanceService --> Subscription : validates active
    AttendanceService --> AuditLog : writes
    WorkoutLogPage --> WorkoutLogsController
    WorkoutLogsController --> WorkoutLogsService : delegates
    WorkoutLogsService --> WorkoutLog : creates + updates
    WorkoutLogsService --> WorkoutLogSet : creates + replaces
    WorkoutLogsService --> MemberWorkoutPlan : validates active assignment
    WorkoutLogsService --> WorkoutPlanDay : validates plan day
    WorkoutLogsService --> AuditLog : writes
```

---

---
