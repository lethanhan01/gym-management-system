import { lazy, Suspense } from 'react'

import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/shared/ProtectedRoute'
import SubscriptionRequired from './components/shared/SubscriptionRequired'
import AuthLayout from './layouts/AuthLayout'

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))

// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))

// Home
const HomePage = lazy(() => import('./pages/home/HomePage'))
const ProgramsPage = lazy(() => import('./pages/home/ProgramsPage'))
const TrainersPage = lazy(() => import('./pages/home/TrainersPage'))
const MemberPackagesHomePage = lazy(() => import('./pages/home/PackagesPage'))
const ContactPage = lazy(() => import('./pages/home/ContactPage'))

// NOTE: Owner's protected PackagesPage is imported below with the same name.
// Keep variable names distinct to avoid TS redeclare errors.

// Member — public registration flow

const RegisterPage = lazy(() => import('./pages/member/register/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/member/register/VerifyEmailPage'))
const PaymentPage = lazy(() => import('./pages/member/subscription/PaymentPage'))
const RegisterSuccessPage = lazy(() => import('./pages/member/register/RegisterSuccessPage'))

// Member — protected
const MemberDashboardPage = lazy(() => import('./pages/member/DashboardPage'))
const MemberProfilePage = lazy(() => import('./pages/member/ProfilePage'))
const PaymentAccountsPage = lazy(() => import('./pages/member/PaymentAccountsPage'))
const CurrentPackagePage = lazy(() => import('./pages/member/subscription/CurrentPackagePage'))
const RenewPackagePage = lazy(() => import('./pages/member/subscription/RenewPackagePage'))
const PackageHistoryPage = lazy(() => import('./pages/member/subscription/PackageHistoryPage'))
const SubscriptionSetupPage = lazy(
  () => import('./pages/member/subscription/SubscriptionSetupPage')
)
const SubscriptionCheckoutPage = lazy(
  () => import('./pages/member/subscription/SubscriptionCheckoutPage')
)
const MyPlanPage = lazy(() => import('./pages/member/workout/MyPlanPage'))
const MemberPlanBuilderPage = lazy(() => import('./pages/member/workout/PlanBuilderPage'))
const MemberExercisesPage = lazy(() => import('./pages/member/workout/ExercisesPage'))
const WorkoutHistoryPage = lazy(() => import('./pages/member/workout/WorkoutHistoryPage'))
const WorkoutSessionPage = lazy(() => import('./pages/member/workout/WorkoutSessionPage'))
const WorkoutSchedulePage = lazy(() => import('./pages/member/workout/WorkoutSchedulePage'))
const CreateWorkoutSessionPage = lazy(
  () => import('./pages/member/workout/CreateWorkoutSessionPage')
)
const MemberAttendancePage = lazy(() => import('./pages/member/attendance/AttendancePage'))
const ProgressPage = lazy(() => import('./pages/member/progress/ProgressPage'))
const MyFeedbackPage = lazy(() => import('./pages/member/feedback/MyFeedbackPage'))
const SendFeedbackPage = lazy(() => import('./pages/member/feedback/SendFeedbackPage'))
const ChooseTrainerPage = lazy(() => import('./pages/member/ChooseTrainerPage'))

// Trainer
const TrainerDashboardPage = lazy(() => import('./pages/trainer/DashboardPage'))
const TrainerProfilePage = lazy(() => import('./pages/trainer/ProfilePage'))
const StudentsListPage = lazy(() => import('./pages/trainer/students/StudentsListPage'))
const StudentDetailPage = lazy(() => import('./pages/trainer/students/StudentDetailPage'))
const AddProgressPage = lazy(() => import('./pages/trainer/students/AddProgressPage'))
const ProgressListPage = lazy(() => import('./pages/trainer/students/ProgressListPage'))
const CreateSessionPage = lazy(() => import('./pages/trainer/sessions/CreateSessionPage'))
const TrainerSessionsPage = lazy(() => import('./pages/trainer/sessions/CalendarPage'))
const WorkoutPlansPage = lazy(() => import('./pages/trainer/plans/WorkoutPlansPage'))
const TrainerPlanBuilderPage = lazy(() => import('./pages/trainer/plans/PlanBuilderPage'))
const LessonPlanListPage = lazy(() => import('./pages/trainer/plans/LessonPlanListPage'))
const CreateLessonPlanPage = lazy(() => import('./pages/trainer/plans/CreateLessonPlanPage'))
const ExercisesPage = lazy(() => import('./pages/trainer/exercises/ExercisesPage'))

// Staff
const StaffDashboardPage = lazy(() => import('./pages/staff/DashboardPage'))
const StaffProfilePage = lazy(() => import('./pages/staff/ProfilePage'))
const StaffSchedulePage = lazy(() => import('./pages/staff/SchedulePage'))
const MembersPage = lazy(() => import('./pages/staff/members/MembersPage'))
const MemberDetailPage = lazy(() => import('./pages/staff/members/MemberDetailPage'))
const MemberRegisterPage = lazy(() => import('./pages/staff/members/MemberRegisterPage'))
const RenewalPage = lazy(() => import('./pages/staff/renewal/RenewalPage'))
const CheckInPage = lazy(() => import('./pages/staff/check-in/CheckInPage'))
const StaffAttendancePage = lazy(() => import('./pages/staff/attendance/AttendancePage'))
const StaffFeedbackPage = lazy(() => import('./pages/staff/feedback/FeedbackPage'))
const FacilityPage = lazy(() => import('./pages/staff/facility/FacilityPage'))
const EquipmentPage = lazy(() => import('./pages/staff/equipment/EquipmentPage'))

// Owner
const OwnerDashboardPage = lazy(() => import('./pages/owner/DashboardPage'))
const OwnerProfilePage = lazy(() => import('./pages/owner/ProfilePage'))
const OwnerPackagesPage = lazy(() => import('./pages/owner/packages/PackagesPage'))

const UsersPage = lazy(() => import('./pages/owner/staff-management/UsersPage'))
const UsersOverviewPage = lazy(() => import('./pages/owner/users/UsersOverviewPage'))
const UserDetailPage = lazy(() => import('./pages/owner/staff-management/UserDetailPage'))
const OwnerSchedulePage = lazy(() => import('./pages/owner/staff-management/SchedulePage'))
const GroupsPage = lazy(() => import('./pages/owner/rbac/GroupsPage'))
const PermissionsPage = lazy(() => import('./pages/owner/rbac/PermissionsPage'))
const RevenuePage = lazy(() => import('./pages/owner/reports/RevenuePage'))
const OwnerEquipmentPage = lazy(() => import('./pages/owner/equipment/EquipmentPage'))
const EmployeePerformanceReportPage = lazy(
  () => import('./pages/owner/reports/EmployeePerformanceReportPage')
)
const TransactionInvoicesPage = lazy(
  () => import('./pages/owner/reports/TransactionInvoicesPage')
)

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#080e0b] px-6 py-10" role="status" aria-label="Đang tải trang">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-white/10" />
        <div className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
        <div className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/trainers" element={<TrainersPage />} />
        <Route path="/packages" element={<MemberPackagesHomePage />} />

        <Route path="/contact" element={<ContactPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Member — public registration flow */}
        <Route path="/member/register" element={<RegisterPage />} />
        <Route path="/member/verify-email" element={<VerifyEmailPage />} />
        <Route path="/member/payment" element={<PaymentPage />} />
        <Route path="/member/register-success" element={<RegisterSuccessPage />} />

        {/* Member — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['member']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Accessible regardless of subscription */}
          <Route path="/member/profile" element={<MemberProfilePage />} />
          <Route path="/member/payment-accounts" element={<PaymentAccountsPage />} />
          <Route path="/member/subscription/setup" element={<SubscriptionSetupPage />} />
          <Route path="/member/subscription/buy" element={<SubscriptionSetupPage />} />
          <Route
            path="/member/subscription/buy/payment"
            element={<SubscriptionCheckoutPage mode="buy" />}
          />
          <Route path="/member/subscription/current" element={<CurrentPackagePage />} />
          <Route path="/member/subscription/renew" element={<RenewPackagePage />} />
          <Route
            path="/member/subscription/renew/payment"
            element={<SubscriptionCheckoutPage mode="renew" />}
          />
          <Route path="/member/subscription/history" element={<PackageHistoryPage />} />

          {/* Require active subscription */}
          <Route element={<SubscriptionRequired />}>
            <Route path="/member" element={<MemberDashboardPage />} />
            <Route path="/member/workout/plan" element={<MyPlanPage />} />
            <Route path="/member/workout/exercises" element={<MemberExercisesPage />} />
            <Route path="/member/workout/builder" element={<MemberPlanBuilderPage />} />
            <Route path="/member/workout/builder/:planId" element={<MemberPlanBuilderPage />} />
            <Route path="/member/workout/history" element={<WorkoutHistoryPage />} />
            <Route path="/member/workout/session/:id" element={<WorkoutSessionPage />} />
            <Route path="/member/workout/sessions" element={<WorkoutSchedulePage />} />
            <Route path="/member/workout/create-session" element={<CreateWorkoutSessionPage />} />
            <Route path="/member/attendance" element={<MemberAttendancePage />} />
            <Route path="/member/progress" element={<ProgressPage />} />
            <Route path="/member/feedback" element={<MyFeedbackPage />} />
            <Route path="/member/feedback/send" element={<SendFeedbackPage />} />
            <Route path="/member/choose-trainer" element={<ChooseTrainerPage />} />
          </Route>
        </Route>

        {/* Trainer — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/trainer" element={<TrainerDashboardPage />} />
          <Route path="/trainer/profile" element={<TrainerProfilePage />} />
          <Route path="/trainer/students" element={<StudentsListPage />} />
          <Route path="/trainer/students/:id" element={<StudentDetailPage />} />
          <Route path="/trainer/students/:id/progress" element={<AddProgressPage />} />
          <Route path="/trainer/students/:id/progress/list" element={<ProgressListPage />} />
          <Route path="/trainer/sessions" element={<TrainerSessionsPage />} />
          <Route path="/trainer/sessions/create" element={<CreateSessionPage />} />
          <Route path="/trainer/plans" element={<WorkoutPlansPage />} />
          <Route path="/trainer/plans/:id/builder" element={<TrainerPlanBuilderPage />} />
          <Route path="/trainer/lesson-plans" element={<LessonPlanListPage />} />
          <Route path="/trainer/lesson-plans/create" element={<CreateLessonPlanPage />} />
          <Route path="/trainer/lesson-plans/:id/edit" element={<CreateLessonPlanPage />} />
          <Route path="/trainer/exercises" element={<ExercisesPage />} />
        </Route>

        {/* Staff + Owner — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['staff', 'owner']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/staff" element={<StaffDashboardPage />} />
          <Route path="/staff/profile" element={<StaffProfilePage />} />
          <Route path="/staff/schedule" element={<Navigate to="/staff/schedules" replace />} />
          <Route path="/staff/schedules" element={<StaffSchedulePage />} />
          <Route path="/staff/members" element={<MembersPage />} />
          <Route path="/staff/members/register" element={<MemberRegisterPage />} />
          <Route path="/staff/members/:id" element={<MemberDetailPage />} />
          <Route path="/staff/renewal" element={<RenewalPage />} />
          <Route path="/staff/check-in" element={<CheckInPage />} />
          <Route path="/staff/attendance" element={<StaffAttendancePage />} />
          <Route path="/staff/feedback" element={<StaffFeedbackPage />} />
          <Route path="/staff/facility" element={<FacilityPage />} />
          <Route path="/staff/equipment" element={<EquipmentPage />} />
        </Route>

        {/* Owner only — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/owner" element={<OwnerDashboardPage />} />
          <Route path="/owner/profile" element={<OwnerProfilePage />} />
          <Route path="/owner/packages" element={<OwnerPackagesPage />} />
          <Route path="/owner/users" element={<UsersOverviewPage />} />
          <Route path="/owner/staff" element={<UsersPage />} />
          <Route path="/owner/staff/new" element={<UserDetailPage />} />
          <Route path="/owner/staff/schedules" element={<OwnerSchedulePage />} />
          <Route path="/owner/staff/:id" element={<UserDetailPage />} />
          <Route path="/owner/equipment" element={<OwnerEquipmentPage />} />
          <Route path="/owner/rbac/groups" element={<GroupsPage />} />
          <Route path="/owner/rbac/permissions" element={<PermissionsPage />} />
          <Route path="/owner/revenue" element={<RevenuePage />} />
          <Route
            path="/owner/reports/staff-performance"
            element={<Navigate to="/owner/reports/employee-performance" replace />}
          />
          <Route
            path="/owner/reports/employee-performance"
            element={<EmployeePerformanceReportPage />}
          />
          <Route path="/owner/reports/transaction-invoices" element={<TransactionInvoicesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
