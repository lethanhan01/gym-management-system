# Plan: i18n Migration — components/ và lib/

Plan file: docs/superpowers/plans/2026-06-22-i18n-components-lib.md
Branch: feat/add-language
Started: 2026-06-22
Progress: docs/superpowers/plans/2026-06-22-i18n-components-lib.md (file này)

---

## Bối cảnh

`client/src/pages/` đã hoàn thành i18n migration (11 tasks + post-plan fixes, xem progress.md plan 1). Còn lại 19 file trong `client/src/components/` và 3 file trong `client/src/lib/` chứa hardcoded tiếng Việt chưa được migrate.

Mục tiêu: toàn bộ codebase frontend không còn hardcoded display text tiếng Việt ngoài file JSON locale.

---

## Kiến trúc (không thay đổi)

- 8 namespaces: `common`, `auth`, `member`, `trainer`, `staff`, `owner`, `home`, `validation`
- Singleton: `import i18n from '@/lib/i18n'` — dùng cho non-React context
- React hook: `useTranslation('namespace')` — dùng trong components
- Không tạo namespace mới

---

## Trạng thái từng task

| # | Mô tả | Trạng thái | Ghi chú |
|---|-------|------------|---------|
| 1 | lib/ utilities: status.ts, owner-constants.ts, api-error.ts | DONE | xem chi tiết bên dưới |
| 2 | Sidebar.tsx (60+ strings, nav 4 roles) | PENDING | đang đọc file |
| 3 | Layout/home: Topbar.tsx, HomeNavbar.tsx, PackagePicker.tsx | PENDING | — |
| 4 | Trainer: SessionDetailModal.tsx, TrainerUI.tsx | PENDING | — |
| 5 | Workout: exercise-data.ts, ExerciseUI.tsx, PlanBuilderUI.tsx | PENDING | — |
| 6 | Small shared/UI: 9 files | PENDING | — |
| 7 | Verify payment-method-data.ts | PENDING | — |
| 8 | Final grep scan + commit | PENDING | — |

---

## Task 1 — lib/ utilities (DONE)

### Kết quả

**`client/src/lib/status.ts`:**
- Xóa module-level `STATUS_LABELS` object (25 hardcoded strings)
- Thêm `import i18n from './i18n'`
- `statusLabel()` mới: camelCase convert key → `i18n.t('status.${key}', { ns: 'common', defaultValue: ... })`
- `statusTone()` giữ nguyên (trả tone enum, không phải display text)

**`client/src/lib/api-error.ts`:**
- Thêm `import i18n from './i18n'`
- Tham số `fallback` đổi từ default string sang optional: `fallback?: string`
- `const defaultFallback = fallback ?? i18n.t('error.unknown', { ns: 'common' })`

**`client/src/lib/owner-constants.ts`:**
- Xóa 3 dead exports: `PACKAGE_STATUS_LABEL`, `USER_STATUS_LABEL`, `FEEDBACK_SEVERITY_LABEL`
- Giữ nguyên: `OWNER_ACCENT`, `PACKAGE_STATUS_COLOR`, `USER_STATUS_COLOR`, `STAFF_POSITION_COLOR`, `FEEDBACK_SEVERITY_COLOR`

**`client/src/locales/vi/common.json`:**
- Thêm 20 keys vào section `status`: scheduled, inProgress, pendingVerification, draft, archived, replaced, realtime, manual, qr, available, broken, repairing, reported, resolved, suspended, retired, deleted, locked, maintenance, unknown

**`client/src/locales/ja/common.json`:**
- Thêm 20 keys tương ứng tiếng Nhật

TypeScript check: `npx tsc --noEmit --skipLibCheck` — 0 errors.

### Phát hiện quan trọng khi thực thi Task 1

- `PACKAGE_STATUS_LABEL`, `USER_STATUS_LABEL`, `FEEDBACK_SEVERITY_LABEL` trong `owner-constants.ts` KHÔNG được import bởi bất kỳ page nào → dead code. Pages có local redefinition dùng `t()` rồi.
- `vi/owner.json` và `ja/owner.json` đã có section `status` đầy đủ (26 keys) — nhưng dùng camelCase keys (`inProgress`, `pendingVerification`). Đã copy sang `common.json` thay vì reuse `owner` namespace, vì `statusLabel()` là shared utility dùng ở tất cả roles.
- `statusLabel()` cần convert snake_case input (`in_progress`) sang camelCase (`inProgress`) trước khi lookup: `status.replace(/_([a-z])/g, (_, c) => c.toUpperCase())`

---

## Task 2 — Sidebar.tsx (PENDING)

**File:** `client/src/components/shared/Sidebar.tsx`

**Strings cần migrate:**
- Module-level const arrays: `BASE_SUBSCRIPTION_CHILDREN_*`, `TRAINER_SECTIONS`, `STAFF_SECTIONS`, `OWNER_SECTIONS` — tất cả chứa `label: 'Tiếng Việt'`
- `memberNav` (useMemo): nhiều label hardcoded
- Owner mode switch buttons: `'Quay về Owner'`, `'Chế độ vận hành'`

**Vấn đề thiết kế:**
- Các const arrays là module-level → không thể dùng React hook
- `TRAINER_SECTIONS`, `STAFF_SECTIONS`, `OWNER_SECTIONS` cần chuyển thành functions trả array (gọi bên trong component), hoặc dùng i18n singleton
- `memberNav` đã trong `useMemo` → có thể dùng `t()` trực tiếp nếu truyền `t` vào hoặc dùng singleton

**Namespace mapping:**
- `member.nav.*` — subscriptionMenu, current, history, renew, buy, progress, checkIn, feedback, feedbackMine, feedbackSend, workoutPlan, workoutCreate, workoutHistory, workoutSessions, workoutBuilder, workoutExercises
- `trainer.nav.*` — students, sessions, plans, exercises, profile
- `staff.nav.*` — members, registerMember, renewal, checkIn, facility, equipment, feedback, schedule, attendance, profile, facility (section labels: members, facility, operations, personal)
- `owner.nav.*` — staff, addStaff, schedules, packages, reports, revenue, invoices, performance, equipment, rbac, profile, modeBack, modeOperation (section labels: staff, business, facility, system)

**Approach:** Convert module-level arrays thành functions nhận `t` hoặc dùng singleton `i18n.t()`. Dùng multiple `useTranslation` calls hoặc một call với namespace array.

---

## Task 3 — Layout/home components (PENDING)

### Topbar.tsx
4 strings, tất cả đều có key sẵn trong JSON:
- `'Đăng ký gói tập'` → `member.subscription.setup.title`
- `'Hồ sơ'` → `common.nav.profile`
- `'Tài khoản thanh toán'` → `member.paymentAccounts.title`
- `'Đăng xuất'` → `common.nav.logout`

Pattern: `useTranslation(['common', 'member'])`

### HomeNavbar.tsx
Cần verify: commit 659ba58 là "minor fix" — có thể chưa migrate i18n strings.
Nếu còn hardcode: `'Đăng nhập'` → `home.nav.login` (đã có), `'Đăng ký'` → `home.nav.register` (đã có), `'Đóng menu'`/`'Mở menu'` → `common.nav.closeMenu/openMenu` (keys mới).

### PackagePicker.tsx
~13 strings → `member.packagePicker.*` (keys mới).
Keys dự kiến: current, days, selfTrain, withPt, benefits, noPackage, start, end, continue, scrollToSelect.

---

## Task 4 — Trainer components (PENDING)

### SessionDetailModal.tsx
35+ strings → `trainer.sessionModal.*` (keys mới).
Pattern: `useTranslation(['trainer', 'common'])`

### TrainerUI.tsx
1 string: `'Chọn học viên'` → `trainer.students.selectStudent` (key mới).

---

## Task 5 — Workout components (PENDING)

### exercise-data.ts
Module-level const với 5 category names: `'Tất cả'`, `'Sức mạnh'`, `'Tim mạch'`, `'Linh hoạt'`, `'Thăng bằng'`

Không thể dùng hook (non-React context). Approach:
- Convert sang function `getExerciseCategories()` gọi `i18n.t()` tại call time
- Keys mới: `member.workout.categories.*`

### ExerciseUI.tsx
~10 strings → `member.workout.exercises.*` (keys mới)

### PlanBuilderUI.tsx
~5 form labels → `member.workout.planBuilder.*` (keys mới hoặc reuse existing)

---

## Task 6 — Small shared/UI components (PENDING)

| File | Strings | Keys |
|------|---------|------|
| shared/PageUI.tsx | `'Đang tải'`, `'Thử lại'` | `common.loading` (có sẵn), `common.button.retry` (mới) |
| ui/SearchInput.tsx | `'Tìm kiếm...'`, `'Xóa tìm kiếm'` | `common.search.placeholder`, `common.search.clear` (mới) |
| shared/OwnerPagination.tsx | `'Trước'`, `'Sau'`, `'Trang'` | `common.pagination.*` (mới) |
| shared/OwnerDateRangeFilter.tsx | `'Từ ngày'`, `'Đến ngày'`, `'Tải báo cáo'` | `common.dateRange.*` (mới) |
| ui/Modal.tsx | `'Đóng'` (aria-label) | `common.button.close` (có sẵn) |
| DatePickerInput.tsx | `'Mở lịch'` | `common.datePicker.open` (mới) |
| DateTimePickerInput.tsx | `'Chọn ngày & giờ'`, `'Thời gian'` | `common.datePicker.placeholder/time` (mới) |
| staff/StaffScheduleCalendar.tsx | 4 default prop strings | keys trong `common` |
| charts/MemberWeightChart.tsx | `'Cân nặng'` | `member.progress.weightLabel` (mới) |
| charts/StudentProgressChart.tsx | `'Cân nặng'` | `trainer.students.weightLabel` (mới) |

---

## Task 7 — Verify payment-method-data.ts (PENDING)

Commit `dec24d0` đã rewrite `getPaymentMethodLabel()` dùng `i18n.t()`.
Cần đọc file hiện tại để xác nhận không còn hardcode. Nếu clean → skip.

---

## Task 8 — Final scan + commit (PENDING)

```bash
grep -rn "[àáảãạăắặằẳẵâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]" \
  client/src/components/ client/src/lib/ \
  --include="*.tsx" --include="*.ts"
```

Mọi match không nằm trong comment hoặc locale JSON = còn missed translation.

Commit: `feat(i18n): migrate components and lib utilities to useTranslation`

---

## Quyết định quan trọng

1. **PACKAGE_STATUS_LABEL / USER_STATUS_LABEL / FEEDBACK_SEVERITY_LABEL bị xóa khỏi owner-constants.ts (không convert).**
   Lý do: Grep xác nhận không có page nào import chúng. Các pages có local redefinition dùng `t()` rồi → dead code thuần túy.

2. **statusLabel() dùng `common` namespace (không dùng `owner`).**
   Lý do: `owner.json` đã có full status section nhưng dùng nó cho shared utility sẽ sai về mặt semantic và dễ break nếu namespace lazy-load sau này.

3. **statusLabel() convert snake_case → camelCase trước khi lookup.**
   Lý do: DB trả `in_progress`/`pending_verification` (snake_case) nhưng JSON keys theo convention camelCase (`inProgress`/`pendingVerification`). Cần bridge.

4. **Existing common.json status keys giữ nguyên (active, inactive, pending, expired, completed, cancelled).**
   Lý do: Có component khác đang dùng qua `t('status.active', { ns: 'common' })`. Thay giá trị sẽ làm thay đổi display text của subscription badges. Chỉ thêm keys mới.

5. **Module-level NavSection arrays trong Sidebar.tsx → functions hoặc singleton.**
   Lý do: React hooks không thể gọi ở module scope. Pattern đã thiết lập trong plan cũ (Decision 12 của progress.md plan 1).

6. **api-error.ts: `fallback` param đổi từ `default string` sang `optional`.**
   Lý do: Default parameter expression `i18n.t(...)` được evaluate một lần lúc module load — i18n có thể chưa init, và string sẽ không reactive. Dùng `fallback ?? i18n.t(...)` bên trong function body để evaluate tại call time.
