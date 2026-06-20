# Server Class Diagrams

Tài liệu này mô tả các lớp **đang được cài đặt** trong `server/src/` và các
domain model trong `server/prisma/schema.prisma` tại ngày 2026-06-19. Các sơ đồ
được tách theo từng góc nhìn để có thể đọc và bảo trì độc lập.

## Quy ước

- `Controller --> Service`: controller gọi service qua dependency injection.
- `Service --> PrismaService/AuditService`: service phụ thuộc hạ tầng dữ liệu
  hoặc audit.
- `*--`: composition; vòng đời lớp con phụ thuộc lớp cha (`onDelete: Cascade`).
- `-->`: association theo khóa ngoại Prisma.
- Kiểu có hậu tố `?` là nullable; các collection relation không lặp lại trong
  thân class mà được thể hiện bằng cạnh và multiplicity.
- Các lớp xuất hiện lại ở nhiều sơ đồ (ví dụ `Member`, `Staff`) vẫn là cùng một
  Prisma model; chúng được lặp để mỗi bounded context tự đầy đủ.
- Các diagram phản ánh schema và dependency thực tế, không biến các business
  rule chỉ nằm trong service thành database constraint.

## 1. Core, authentication và authorization

```mermaid
classDiagram
    direction LR

    class AppModule {
        <<module>>
    }
    class AuthModule {
        <<module>>
    }
    class PrismaModule {
        <<global-module>>
    }
    class OtpStoreModule {
        <<global-module>>
    }
    class AuthController {
        <<controller>>
        +login(dto, request)
        +logout(user)
        +me(user)
        +forgotPassword(dto, request)
        +resetPassword(dto, request)
        +verifyEmail(dto, request)
        +resendVerify(dto, request)
        +lineLogin(dto, request)
        +changePassword(dto, user, request)
    }
    class AuthService {
        <<service>>
        +login(email, password, context)
        +forgotPassword(email, context)
        +resetPassword(email, otp, newPassword, context)
        +verifyEmail(email, otp, context)
        +resendVerify(email, context)
        +lineLogin(idToken, context)
        +changePassword(userId, currentPassword, newPassword, context)
    }
    class PasswordResetService {
        <<service>>
        +forgotPassword(email, context)
        +resetPassword(email, otp, newPassword, context)
    }
    class EmailVerificationService {
        <<service>>
        +verifyEmail(email, otp, context)
        +resendVerify(email, context)
    }
    class UsersService {
        <<service>>
        +findByEmailWithRoles(email)
        +findByLineIdWithRoles(lineId)
        +findByIdWithRoles(userId)
    }
    class JwtStrategy {
        <<strategy>>
        +validate(payload)
    }
    class JwtAuthGuard {
        <<guard>>
        +canActivate(context)
    }
    class RolesGuard {
        <<guard>>
        +canActivate(context)
    }
    class PermissionsGuard {
        <<guard>>
        +canActivate(context)
    }
    class OtpStoreService {
        <<service>>
        -Map store
        +set(userId, purpose, codeHash, ttlMs)
        +get(userId, purpose)
        +delete(userId, purpose)
        +incrementAttempts(userId, purpose)
    }
    class RateLimitService {
        <<service>>
        -Map store
        +isAllowed(key, limit, windowMs)
    }
    class AuditService {
        <<service>>
        +log(params)
    }
    class PrismaClient {
        <<external>>
    }
    class PrismaService {
        <<service>>
        +onModuleInit()
        +onModuleDestroy()
    }

    AppModule *-- AuthModule
    AppModule *-- PrismaModule
    AppModule *-- OtpStoreModule
    AuthModule *-- AuthController
    AuthModule *-- AuthService
    AuthModule *-- UsersService
    AuthModule *-- PasswordResetService
    AuthModule *-- EmailVerificationService
    PrismaModule *-- PrismaService
    OtpStoreModule *-- OtpStoreService
    AuthController --> AuthService
    AuthController --> UsersService
    AuthService --> UsersService
    AuthService --> PasswordResetService
    AuthService --> EmailVerificationService
    AuthService --> AuditService
    AuthService --> PrismaService
    PasswordResetService --> UsersService
    PasswordResetService --> OtpStoreService
    PasswordResetService --> RateLimitService
    PasswordResetService --> AuditService
    PasswordResetService --> PrismaService
    EmailVerificationService --> UsersService
    EmailVerificationService --> OtpStoreService
    EmailVerificationService --> RateLimitService
    EmailVerificationService --> AuditService
    EmailVerificationService --> PrismaService
    UsersService --> PrismaService
    AuditService --> PrismaService
    JwtStrategy --> PrismaService
    PermissionsGuard --> PrismaService
    PrismaClient <|-- PrismaService
    JwtAuthGuard ..> JwtStrategy : Passport JWT
    AuthModule ..> JwtAuthGuard : global guard
    AuthModule ..> RolesGuard : global guard
```

`JwtAuthGuard` và `RolesGuard` được đăng ký global qua `APP_GUARD` trong
`AuthModule`. `PermissionsGuard` được gắn tại các feature controller bằng
`@UseGuards`. `PrismaModule` và `OtpStoreModule` là global module.

## 2. Feature controllers và application services

```mermaid
classDiagram
    direction LR

    class PermissionsController { <<controller>> }
    class GroupsController { <<controller>> }
    class UsersAdminController { <<controller>> }
    class RbacService {
        <<service>>
        +listPermissions()
        +listGroups()
        +createGroup()
        +assignPermissions()
        +listUsers()
        +assignUserGroup()
    }

    class MembersController { <<controller>> }
    class MembersService {
        <<service>>
        +createMember()
        +selfRegister()
        +listMembers()
        +assignTrainer()
        +recordSelfProgress()
    }

    class StaffController { <<controller>> }
    class StaffService {
        <<service>>
        +create()
        +list()
        +createSchedule()
        +attendanceCheckIn()
        +attendanceCheckOut()
    }

    class PackagesController { <<controller>> }
    class PackagesService {
        <<service>>
        +listPackages()
        +createPackage()
        +updatePackage()
        +deletePackage()
    }
    class SubscriptionsController { <<controller>> }
    class SubscriptionsService {
        <<service>>
        +createSubscription()
        +renewSubscription()
        +listSubscriptions()
        +cancelSubscription()
    }
    class SubscriptionScheduleService {
        <<scheduled-service>>
        +expireSubscriptions()
        +activatePendingSubscriptions()
        +cancelUnpaidPendingSubscriptions()
    }

    class PaymentsController { <<controller>> }
    class PaymentAccountsController { <<controller>> }
    class PaymentsService {
        <<service>>
        +createPayment()
        +listPayments()
        +listPaymentAccounts()
        +createPaymentAccount()
        +setDefaultPaymentAccount()
        +removePaymentAccount()
    }

    class TrainingController { <<controller>> }
    class DeviceController { <<controller>> }
    class TrainingService {
        <<service>>
        +listSessions()
        +createSession()
        +updateSession()
        +manualCheckin()
        +checkout()
        +recordProgress()
        +deviceAccessEvent()
    }
    class DeviceApiKeyGuard { <<guard>> }

    class FacilityController { <<controller>> }
    class FacilityService {
        <<service>>
        +listRooms()
        +createRoom()
        +listEquipment()
        +createEquipment()
        +createMaintenanceLog()
    }

    class FeedbackController { <<controller>> }
    class FeedbackService {
        <<service>>
        +list()
        +create()
        +assign()
        +updateStatus()
    }

    class ExercisesController { <<controller>> }
    class ExercisesService {
        <<service>>
        +findAll()
        +create()
        +findFromExerciseDb()
        +importFromExerciseDb()
    }
    class WorkoutPlansController { <<controller>> }
    class WorkoutPlansService {
        <<service>>
        +create()
        +addDay()
        +addExercise()
        +assignPlan()
        +unassignMember()
    }
    class WorkoutLogsController { <<controller>> }
    class WorkoutLogsService {
        <<service>>
        +create()
        +findAll()
        +update()
    }

    class ReportsController { <<controller>> }
    class ReportsService {
        <<service>>
        +revenue()
        +members()
        +renewals()
        +employeePerformance()
        +staffPerformance()
        +topPackages()
    }
    class HealthController { <<controller>> }
    class PrismaService { <<global-service>> }
    class AuditService { <<service>> }

    PermissionsController --> RbacService
    GroupsController --> RbacService
    UsersAdminController --> RbacService
    MembersController --> MembersService
    StaffController --> StaffService
    PackagesController --> PackagesService
    SubscriptionsController --> SubscriptionsService
    PaymentsController --> PaymentsService
    PaymentAccountsController --> PaymentsService
    TrainingController --> TrainingService
    DeviceController --> TrainingService
    DeviceController ..> DeviceApiKeyGuard
    FacilityController --> FacilityService
    FeedbackController --> FeedbackService
    ExercisesController --> ExercisesService
    WorkoutPlansController --> WorkoutPlansService
    WorkoutLogsController --> WorkoutLogsService
    ReportsController --> ReportsService
    HealthController --> PrismaService

    RbacService --> PrismaService
    MembersService --> PrismaService
    StaffService --> PrismaService
    PackagesService --> PrismaService
    SubscriptionsService --> PrismaService
    SubscriptionScheduleService --> PrismaService
    PaymentsService --> PrismaService
    TrainingService --> PrismaService
    FacilityService --> PrismaService
    FeedbackService --> PrismaService
    ExercisesService --> PrismaService
    WorkoutPlansService --> PrismaService
    WorkoutLogsService --> PrismaService
    ReportsService --> PrismaService

    RbacService --> AuditService
    MembersService --> AuditService
    StaffService --> AuditService
    PackagesService --> AuditService
    SubscriptionsService --> AuditService
    PaymentsService --> AuditService
    TrainingService --> AuditService
    FacilityService --> AuditService
    FeedbackService --> AuditService
    ExercisesService --> AuditService
    WorkoutPlansService --> AuditService
    WorkoutLogsService --> AuditService
```

## 3. Identity, profile, RBAC, file và audit models

```mermaid
classDiagram
    direction LR

    class User {
        +BigInt userId
        +String email
        +String? phone
        +String? passwordHash
        +String fullName
        +UserStatus status
        +DateTime createdAt
        +BigInt? avatarFileId
        +DateTime? deletedAt
        +DateTime? emailVerifiedAt
        +String? lineId
    }
    class Member {
        +BigInt memberId
        +BigInt userId
        +String memberCode
        +DateTime? dateOfBirth
        +String? address
        +DateTime createdAt
        +DateTime? deletedAt
        +BigInt? primaryTrainerId
    }
    class Staff {
        +BigInt staffId
        +BigInt userId
        +String staffCode
        +String position
        +DateTime? deletedAt
    }
    class Group {
        +BigInt groupId
        +String name
        +String? description
        +DateTime? deletedAt
    }
    class Permission {
        +BigInt permissionId
        +String code
        +String name
        +String? description
    }
    class UserGroup {
        +BigInt userId
        +BigInt groupId
    }
    class GroupPermission {
        +BigInt groupId
        +BigInt permissionId
    }
    class File {
        +BigInt fileId
        +BigInt ownerUserId
        +FileType fileType
        +String storagePath
        +String? publicUrl
        +String mimeType
        +BigInt sizeBytes
        +DateTime? deletedAt
        +DateTime createdAt
    }
    class AuditLog {
        +BigInt auditId
        +BigInt? actorUserId
        +String action
        +String resourceType
        +String? resourceId
        +Json? beforeData
        +Json? afterData
        +String? ipAddress
        +String? userAgent
        +DateTime createdAt
    }
    class UserStatus {
        <<enumeration>>
        active
        locked
        pending_verification
    }
    class FileType {
        <<enumeration>>
        avatar
        document
        equipment_doc
    }

    User "1" <-- "0..1" Member : account
    User "1" <-- "0..1" Staff : account
    Staff "0..1" <-- "0..*" Member : primaryTrainer
    User "1" <-- "0..*" UserGroup
    Group "1" <-- "0..*" UserGroup
    Group "1" <-- "0..*" GroupPermission
    Permission "1" <-- "0..*" GroupPermission
    User "1" <-- "0..*" File : owner
    File "0..1" <-- "0..*" User : avatarFile
    User "0..1" <-- "0..*" AuditLog : actor
    User --> UserStatus : status
    File --> FileType : fileType
```

`UserGroup` và `GroupPermission` dùng composite primary key. Quan hệ
`User.avatarFile` là quan hệ riêng với quan hệ `File.owner`.

## 4. Membership và payment models

```mermaid
classDiagram
    direction LR

    class Member {
        +BigInt memberId
        +BigInt userId
        +String memberCode
    }
    class Staff {
        +BigInt staffId
        +String staffCode
        +String position
    }
    class Package {
        +BigInt packageId
        +String packageCode
        +String name
        +Int durationDays
        +Decimal price
        +String? benefits
        +Boolean includesPt
        +PackageStatus status
        +DateTime createdAt
        +DateTime? deletedAt
    }
    class Subscription {
        +BigInt subscriptionId
        +BigInt memberId
        +BigInt packageId
        +BigInt? trainerId
        +DateTime startDate
        +DateTime endDate
        +DateTime createdAt
        +DateTime? cancelledAt
        +DateTime? deletedAt
        +SubscriptionStatus status
    }
    class Payment {
        +BigInt paymentId
        +BigInt memberId
        +BigInt subscriptionId
        +Decimal amount
        +PaymentMethod method
        +PaymentStatus status
        +String? transactionReference
        +DateTime paidAt
    }
    class PaymentAccount {
        +BigInt accountId
        +BigInt memberId
        +PaymentMethod type
        +String? provider
        +String? accountRef
        +String? label
        +Boolean isDefault
        +DateTime createdAt
        +DateTime? deletedAt
    }
    class PackageStatus {
        <<enumeration>>
        active
        inactive
    }
    class SubscriptionStatus {
        <<enumeration>>
        pending
        active
        expired
        cancelled
    }
    class PaymentMethod {
        <<enumeration>>
        cash
        bank_card
        ewallet
    }
    class PaymentStatus {
        <<enumeration>>
        success
        failed
    }

    Member "1" <-- "0..*" Subscription
    Package "1" <-- "0..*" Subscription
    Staff "0..1" <-- "0..*" Subscription : trainer
    Member "1" <-- "0..*" Payment
    Subscription "1" <-- "0..*" Payment
    Member "1" <-- "0..*" PaymentAccount
    Package --> PackageStatus : status
    Subscription --> SubscriptionStatus : status
    Payment --> PaymentMethod : method
    Payment --> PaymentStatus : status
    PaymentAccount --> PaymentMethod : type
```

## 5. Staff, facility và feedback models

```mermaid
classDiagram
    direction LR

    class Member {
        +BigInt memberId
        +String memberCode
    }
    class Staff {
        +BigInt staffId
        +String staffCode
        +String position
    }
    class StaffSchedule {
        +BigInt scheduleId
        +BigInt staffId
        +StaffShift shift
        +DateTime workDate
        +DateTime? deletedAt
    }
    class StaffAttendanceLog {
        +BigInt logId
        +BigInt staffId
        +DateTime checkIn
        +DateTime? checkOut
    }
    class GymRoom {
        +BigInt roomId
        +String roomCode
        +String name
        +String? roomType
        +Int capacity
        +String? description
    }
    class Equipment {
        +BigInt equipmentId
        +BigInt roomId
        +String equipmentCode
        +String name
        +DateTime importDate
        +DateTime? warrantyUntil
        +EquipmentStatus status
    }
    class MaintenanceLog {
        +BigInt maintenanceId
        +BigInt equipmentId
        +BigInt reportedByStaffId
        +String description
        +MaintenanceStatus status
        +DateTime reportedAt
        +DateTime? resolvedAt
    }
    class Feedback {
        +BigInt feedbackId
        +BigInt memberId
        +FeedbackType feedbackType
        +String content
        +FeedbackSeverity severity
        +FeedbackStatus status
        +BigInt? handledByStaffId
        +DateTime? handledAt
        +BigInt? subjectStaffId
        +BigInt? subjectEquipmentId
        +DateTime createdAt
        +DateTime? deletedAt
    }
    class StaffShift {
        <<enumeration>>
        morning
        afternoon
        evening
    }
    class EquipmentStatus {
        <<enumeration>>
        active
        broken
        repairing
        retired
    }
    class MaintenanceStatus {
        <<enumeration>>
        reported
        repairing
        resolved
        failed
    }
    class FeedbackType {
        <<enumeration>>
        staff
        equipment
        service
    }
    class FeedbackSeverity {
        <<enumeration>>
        low
        medium
        high
    }
    class FeedbackStatus {
        <<enumeration>>
        open
        in_progress
        resolved
        rejected
    }

    Staff "1" <-- "0..*" StaffSchedule
    Staff "1" <-- "0..*" StaffAttendanceLog
    GymRoom "1" <-- "0..*" Equipment
    Equipment "1" <-- "0..*" MaintenanceLog
    Staff "1" <-- "0..*" MaintenanceLog : reportedBy
    Member "1" <-- "0..*" Feedback : author
    Staff "0..1" <-- "0..*" Feedback : handledBy
    Staff "0..1" <-- "0..*" Feedback : subjectStaff
    Equipment "0..1" <-- "0..*" Feedback : subjectEquipment
    StaffSchedule --> StaffShift : shift
    Equipment --> EquipmentStatus : status
    MaintenanceLog --> MaintenanceStatus : status
    Feedback --> FeedbackType : type
    Feedback --> FeedbackSeverity : severity
    Feedback --> FeedbackStatus : status
```

## 6. Training, attendance và progress models

```mermaid
classDiagram
    direction LR

    class Member {
        +BigInt memberId
        +String memberCode
    }
    class Staff {
        +BigInt staffId
        +String staffCode
    }
    class GymRoom {
        +BigInt roomId
        +String roomCode
        +String name
    }
    class Subscription {
        +BigInt subscriptionId
        +BigInt memberId
        +SubscriptionStatus status
    }
    class MemberWorkoutPlan {
        +BigInt assignmentId
        +BigInt memberId
        +BigInt planId
    }
    class WorkoutPlanDay {
        +BigInt planDayId
        +BigInt planId
        +Int dayNumber
    }
    class TrainingSession {
        +BigInt sessionId
        +BigInt memberId
        +BigInt trainerStaffId
        +BigInt roomId
        +BigInt? assignmentId
        +BigInt? planDayId
        +DateTime startTime
        +DateTime endTime
        +DateTime? deletedAt
        +TrainingSessionStatus status
    }
    class AttendanceLog {
        +BigInt attendanceId
        +BigInt memberId
        +BigInt subscriptionId
        +BigInt? sessionId
        +DateTime startTime
        +DateTime? endTime
        +AttendanceMethod method
    }
    class MemberProgress {
        +BigInt progressId
        +BigInt memberId
        +BigInt? staffId
        +Decimal? weight
        +Decimal? height
        +Decimal? bmi
        +String? goal
        +String? notes
        +DateTime recordedAt
        +DateTime? deletedAt
    }
    class TrainingSessionStatus {
        <<enumeration>>
        scheduled
        in_progress
        completed
        cancelled
    }
    class AttendanceMethod {
        <<enumeration>>
        realtime
        manual
        qr
    }
    class SubscriptionStatus {
        <<enumeration>>
        pending
        active
        expired
        cancelled
    }

    Member "1" <-- "0..*" TrainingSession
    Staff "1" <-- "0..*" TrainingSession : trainer
    GymRoom "1" <-- "0..*" TrainingSession
    MemberWorkoutPlan "0..1" <-- "0..*" TrainingSession : assignment
    WorkoutPlanDay "0..1" <-- "0..*" TrainingSession : planDay
    Member "1" <-- "0..*" AttendanceLog
    Subscription "1" <-- "0..*" AttendanceLog
    TrainingSession "0..1" <-- "0..*" AttendanceLog
    Member "1" <-- "0..*" MemberProgress
    Staff "0..1" <-- "0..*" MemberProgress : recordedBy
    Subscription --> SubscriptionStatus : status
    TrainingSession --> TrainingSessionStatus : status
    AttendanceLog --> AttendanceMethod : method
```

`TrainingSession.assignmentId` và `TrainingSession.planDayId` là hai liên kết
nullable tới luồng workout plan; service xác thực plan day thuộc đúng assignment
trước khi tạo hoặc cập nhật buổi tập.

## 7. Workout planning và workout logging models

```mermaid
classDiagram
    direction LR

    class Member {
        +BigInt memberId
        +String memberCode
    }
    class Staff {
        +BigInt staffId
        +String staffCode
    }
    class Exercise {
        +BigInt exerciseId
        +String name
        +ExerciseCategory category
        +String? muscleGroup
        +String? equipmentNeeded
        +String? description
        +BigInt? createdByStaffId
        +DateTime? deletedAt
        +DateTime createdAt
        +String? imageUrl
    }
    class WorkoutPlan {
        +BigInt planId
        +BigInt? creatorStaffId
        +BigInt? creatorMemberId
        +PlanCreatorType creatorType
        +String name
        +String? description
        +WorkoutPlanStatus status
        +DateTime? deletedAt
        +DateTime createdAt
    }
    class WorkoutPlanDay {
        +BigInt planDayId
        +BigInt planId
        +Int dayNumber
        +String name
        +String? notes
        +Int weekNumber
        +Int dayOfWeek
    }
    class WorkoutPlanExercise {
        +BigInt planExerciseId
        +BigInt planDayId
        +BigInt exerciseId
        +Int orderIndex
        +Int targetSets
        +Int? targetReps
        +Int? targetDurationSec
        +Decimal? targetWeightKg
        +Int? restSeconds
        +String? notes
    }
    class MemberWorkoutPlan {
        +BigInt assignmentId
        +BigInt memberId
        +BigInt planId
        +BigInt? assignedByStaffId
        +DateTime startDate
        +WorkoutAssignmentStatus status
        +DateTime? endedAt
        +String? notes
        +DateTime createdAt
    }
    class WorkoutLog {
        +BigInt logId
        +BigInt memberId
        +BigInt assignmentId
        +BigInt planDayId
        +DateTime loggedAt
        +Int? durationMin
        +String? notes
    }
    class WorkoutLogSet {
        +BigInt logSetId
        +BigInt logId
        +BigInt planExerciseId
        +Int setNumber
        +Int? actualReps
        +Decimal? actualWeightKg
        +Int? actualDurationSec
        +Boolean completed
    }
    class TrainingSession {
        +BigInt sessionId
        +BigInt? assignmentId
        +BigInt? planDayId
    }
    class ExerciseCategory {
        <<enumeration>>
        strength
        cardio
        flexibility
        balance
    }
    class WorkoutPlanStatus {
        <<enumeration>>
        draft
        active
        archived
    }
    class WorkoutAssignmentStatus {
        <<enumeration>>
        active
        completed
        replaced
    }
    class PlanCreatorType {
        <<enumeration>>
        staff
        member
    }

    Staff "0..1" <-- "0..*" Exercise : createdBy
    Staff "0..1" <-- "0..*" WorkoutPlan : creatorStaff
    Member "0..1" <-- "0..*" WorkoutPlan : creatorMember
    WorkoutPlan "1" *-- "0..*" WorkoutPlanDay : days
    WorkoutPlanDay "1" *-- "0..*" WorkoutPlanExercise : exercises
    Exercise "1" <-- "0..*" WorkoutPlanExercise
    Member "1" <-- "0..*" MemberWorkoutPlan
    WorkoutPlan "1" <-- "0..*" MemberWorkoutPlan : assignments
    Staff "0..1" <-- "0..*" MemberWorkoutPlan : assignedBy
    Member "1" <-- "0..*" WorkoutLog
    MemberWorkoutPlan "1" <-- "0..*" WorkoutLog
    WorkoutPlanDay "1" <-- "0..*" WorkoutLog
    WorkoutLog "1" *-- "0..*" WorkoutLogSet : sets
    WorkoutPlanExercise "1" <-- "0..*" WorkoutLogSet
    MemberWorkoutPlan "0..1" <-- "0..*" TrainingSession
    WorkoutPlanDay "0..1" <-- "0..*" TrainingSession
    Exercise --> ExerciseCategory : category
    WorkoutPlan --> WorkoutPlanStatus : status
    WorkoutPlan --> PlanCreatorType : creatorType
    MemberWorkoutPlan --> WorkoutAssignmentStatus : status
```

Các composition `WorkoutPlan -> WorkoutPlanDay`, `WorkoutPlanDay ->
WorkoutPlanExercise` và `WorkoutLog -> WorkoutLogSet` tương ứng với các relation
Prisma có `onDelete: Cascade`. Các unique constraint quan trọng gồm
`(planId, dayNumber)`, `(planId, weekNumber, dayOfWeek)`,
`(planDayId, orderIndex)` và `(logId, planExerciseId, setNumber)`.
