# i18n Implementation Progress

Plan: `docs/superpowers/plans/2026-06-21-i18n-vi-ja.md`  
Branch: `feat/add-language`  
Started: 2026-06-21  
Last updated: 2026-06-22  
HEAD commit: `f3b0f30` (`fix lỗi UI`)  
Working tree: verified owner formatting/review refinements are staged; this progress file is untracked

## Current Status

- Tasks 1-9: implementation complete.
- Task 9: review and VI/JA runtime acceptance complete.
- Task 10: next — Japanese layout walkthrough and scoped overflow fixes.
- Task 11: pending — final cross-role verification, full hard-coded text scan, review, and commit.

At task level, 9 of 11 tasks have completed implementation. Task 10 and Task 11 remain.

## Completed Tasks

### Task 1: Install packages, i18n config, TypeScript types

Status: complete (`21eb8ca`)

- Added i18next, react-i18next, and browser language detection.
- Added the i18n singleton, TypeScript resource declarations, application bootstrap import, and
  `<html lang>` synchronization.

### Task 2: Create all translation files

Status: complete (`42130ac`)

- Added all 16 VI/JA JSON files for the eight namespaces.

### Task 3: LanguageSwitcher and layout integration

Status: complete (`86932a9`)

- Added the language switcher to dashboard, public, and auth layouts.
- Removed the root Japanese font-size override because it caused full-page rem reflow.

### Task 4: Reactive date and locale utilities

Status: complete (`655bda4`), hardened during Task 9 review

- Date/time display reads the current i18n language at call time.
- Missing and invalid date labels now also switch between VI and JA.

### Task 5: Auth and home pages

Status: complete (`36f452f..f0721bd`)

### Task 6: Member pages

Status: implementation recorded complete (`8e628c9..c4cac73`)

Task 11 must still run the final broad hard-coded text scan across member pages. This Task 9 pass
did not widen into member-page cleanup.

### Task 7: Trainer pages

Status: complete (`8249ec8..a4fb039`)

### Task 8: Staff pages

Status: complete (`28586fd..02a8a9b`)

### Task 9: Owner pages

Status: complete after review (`0e3e1f0` implementation, `f3b0f30` review fixes)

Reviewed all 13 owner routes/pages:

1. `/owner`
2. `/owner/profile`
3. `/owner/packages`
4. `/owner/users`
5. `/owner/staff`
6. `/owner/staff/new`
7. `/owner/staff/schedules`
8. `/owner/equipment`
9. `/owner/rbac/groups`
10. `/owner/rbac/permissions`
11. `/owner/revenue`
12. `/owner/reports/employee-performance`
13. `/owner/reports/transaction-invoices`

Review fixes:

- Removed remaining hard-coded Vietnamese UI strings from owner pages.
- Localized owner status badges, package statuses, feedback severity/type, staff positions/statuses,
  payment methods, report units, export metadata, accessible labels, and modal section headings.
- Replaced the employee report's fixed `vi-VN` time formatter with the reactive shared formatter.
- Restored the staff status filter values to `active`, `pending_verification`, `locked`, and
  `deleted`; the first Task 9 migration had accidentally changed these business values.
- Added missing/invalid date translations used by owner tables.
- Fixed all owner React Hook dependency warnings so language-dependent callbacks refresh safely.

Verification on 2026-06-22:

- Owner-only ESLint: pass with 0 errors and 0 warnings.
- Full frontend ESLint: pass with 0 errors; 25 pre-existing warnings remain outside owner pages.
- TypeScript: pass.
- Vitest: 6 files, 33/33 tests pass.
- Production build: pass; 3,526 modules transformed.
- VI/JA owner locale key parity: 496/496 keys, no missing keys.
- Browser runtime: logged in with the seeded owner account, verified the VI dashboard, switched to
  JA, and opened all 13 owner routes. Every route rendered its expected Japanese heading,
  `document.documentElement.lang` and `gym-locale` remained `ja`, and no runtime exception was
  reported.

## Pending Tasks

### Task 10: Japanese layout adjustments — NEXT

- Walk through every role in JA mode at desktop and narrow/mobile widths.
- Fix only confirmed overflow, wrapping, truncation, and alignment defects.
- Keep Japanese font sizing scoped; do not restore a root `html[lang="ja"]` font-size override.

### Task 11: Final verification and commit

- Verify language persistence after closing/reopening the browser.
- Verify the switcher on public, auth, member, trainer, staff, and owner layouts.
- Run both the plan's phrase scan and a broader Unicode/UI-literal scan across all pages.
- Verify reactive date formatting and form validation messages in both languages.
- Review the complete i18n diff, commit the verified working tree, and push when requested.

## Known Follow-ups

- Full ESLint currently reports 25 warnings in member/trainer code; owner pages contribute none.
- The i18n config still sets `lng` directly from localStorage while also registering
  `LanguageDetector`; the detector configuration is redundant but not functionally harmful.
- The branch is four commits ahead of `origin/feat/add-language`. Additional verified owner
  formatting/review refinements are staged, and this progress file is not yet tracked.
