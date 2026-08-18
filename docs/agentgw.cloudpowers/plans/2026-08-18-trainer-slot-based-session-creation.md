# Trainer Slot-Based Session Creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use agentgw.cloudpowers:subagent-driven-development (recommended) or agentgw.cloudpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align trainer-created training sessions with the same slot-based time validation used by member booking, preventing time conflicts and inconsistent scheduling.

**Architecture:** Two changes — (1) server: add trainer-trainer overlap check + 60-minute duration validation to `createSession`, and add a new `getTrainerAvailabilityForTrainer` endpoint so trainers can see slot availability for a selected member; (2) client: replace free-form DateTimePickerInput in `CreateSessionPage` with a slot grid (like `BookPtSessionModal`) that loads availability after member selection.

**Tech Stack:** NestJS, Prisma, React, class-validator, class-transformer

## Global Constraints

- `PrismaService` is always injected, never instantiated directly
- BigInt fields are serialized via `BigInt.prototype.toJSON` in `main.ts`
- Comment language: Vietnamese. Identifier/log message: English
- `ValidationPipe` with `whitelist: true` and `transform: true` globally enabled
- File naming: server kebab-case with suffix; client pages PascalCase
- Path alias `@/` resolves to `src/` in both projects
- No test framework currently configured; testing notes below are for manual verification

---

## Background: What's Missing

**Member booking flow** (`member-session-booking.service.ts`):
- Fixed 60-minute duration enforced
- Time window: 5 min minimum, 7 days maximum
- Max 3 scheduled sessions at once
- Checks trainer overlap + member overlap
- Auto-assigns room

**Trainer create flow** (`training-session.service.ts`):
- Arbitrary duration (no max/min)
- Arbitrary time (free DateTimePickerInput)
- No member overlap check
- No trainer-trainer overlap check (only room + trainer)
- Manual room selection
- No booking limit

**Concrete problems:**
1. Trainer can create a session at a time that overlaps with the member's existing session — `MEMBER_TIME_OVERLAP` not checked
2. Trainer can create a 4-hour session or a 5-minute session — no duration constraint
3. Trainer can book at 3:37 AM — not slot-aligned
4. Trainer has no visibility into slot availability before picking a time

---

## File Structure

### Server (new/modified)

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/training/dto/trainer-availability-query.dto.ts` | Modify | Add optional `trainerStaffId` + `memberId` fields |
| `server/src/training/trainer-session-availability.service.ts` | **Create** | Shared slot availability logic for both member and trainer |
| `server/src/training/training-session.service.ts` | Modify | Add member overlap check to `createSession` |
| `server/src/training/training.controller.ts` | Modify | New endpoint `GET /training-sessions/trainer-availability-for-trainer` |
| `server/src/training/training.module.ts` | Modify | Register new service |
| `server/src/training/dto/create-session.dto.ts` | Modify | Add duration/time alignment validation |

### Client (modified)

| File | Action | Responsibility |
|------|--------|----------------|
| `client/src/pages/trainer/sessions/CreateSessionPage.tsx` | Modify | Replace DateTimePickerInput with slot grid |
| `client/src/services/training-session.service.ts` | Modify | Add `getTrainerAvailabilityForTrainer(date, trainerStaffId, memberId)` method |

---

## Task 1: Add overlap + duration checks to `createSession` (server)

**Goal:** Server-side validation for trainer-created sessions matches member booking constraints.

**Files:**
- Modify: `server/src/training/training-session.service.ts:100-241` (`createSession` method)

**Interfaces:**
- Consumes: `TrainingSessionSchedulingService.checkOverlap()` (already exists)
- Produces: Nothing new — same return shape

- [x] **Step 1: Add member overlap check to `createSession`**

In `server/src/training/training-session.service.ts`, inside `createSession()` method, after the existing room and trainer overlap checks (lines 206-207), add a member overlap check:

```typescript
// After line 207 (existing checks):
await this.scheduling.checkOverlap(
  null,
  null,
  startTime,
  endTime,
  'MEMBER_TIME_OVERLAP',
  undefined,
  memberId
)
```

- [x] **Step 2: Add 60-minute duration validation**

In `createSession()`, after the existing `endTime <= startTime` check (line 109), add:

```typescript
const durationMs = endTime.getTime() - startTime.getTime()
if (durationMs !== 60 * 60 * 1000) {
  throw new BadRequestException({
    success: false,
    code: 'INVALID_DURATION',
    message: 'Thoi luong buoi tap phai dung 60 phut',
  })
}
```

- [x] **Step 3: Add booking window validation**

After the duration check, add:

```typescript
const now = new Date()
const minBookingTime = new Date(now.getTime() + 5 * 60 * 1000)
if (startTime < minBookingTime) {
  throw new BadRequestException({
    success: false,
    code: 'VALIDATION_ERROR',
    message: 'startTime phai nam trong tuong lai, toi thieu 5 phut',
  })
}
```

- [x] **Step 4: Remove redundant `graceTime` check**

The existing `graceTime` check (lines 117-124) is a weaker version of the new `minBookingTime` check. Remove lines 117-124 since the new check is stricter and clearer.

- [x] **Step 5: Verify no existing tests break**

Run: `cd server && npm run build`
Expected: Build succeeds (no test framework yet, only build check)

- [x] **Step 6: Commit**

```bash
git add server/src/training/training-session.service.ts
git commit -m "fix(training): add member overlap + 60m duration validation to createSession"
```

---

## Task 2: Create `TrainerSessionAvailabilityService` (shared slot logic)

**Goal:** Extract slot availability logic so both member-booking and trainer-creating flows can use it, and extend it to accept arbitrary trainer+member pairs.

**Files:**
- Create: `server/src/training/trainer-session-availability.service.ts`

**Interfaces:**
- Consumes: `PrismaService`, `TrainingCallerResolverService`
- Produces: `getAvailabilitySlots(date, trainerStaffId, memberId?)` → `AvailabilitySlotsResponse`

- [x] **Step 1: Create the service file**

Create `server/src/training/trainer-session-availability.service.ts`:

```typescript
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { TrainingSessionStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface SlotData {
  slotIndex: number
  startTime: string
  endTime: string
  available: boolean
  reason?: 'PAST_TIME' | 'TRAINER_BUSY' | 'MEMBER_BUSY'
}

@Injectable()
export class TrainerSessionAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get slot availability for a given date, trainer, and optionally a member.
   * Used by both member-booking and trainer-creating flows.
   */
  async getAvailabilitySlots(
    date: string,       // YYYY-MM-DD
    trainerStaffId: bigint,
    memberId?: bigint,
  ): Promise<{
    date: string
    trainer: { staffId: string; fullName: string; avatarFileId: string | null }
    slots: SlotData[]
  }> {
    // Validate trainer exists
    const trainer = await this.prisma.staff.findFirst({
      where: { staffId: trainerStaffId, deletedAt: null },
      select: {
        staffId: true,
        user: { select: { fullName: true, avatarFileId: true } },
      },
    })
    if (!trainer) {
      throw new NotFoundException({
        success: false,
        code: 'TRAINER_NOT_FOUND',
        message: 'Trainer khong ton tai',
      })
    }

    // Parse date to UTC range (with VN timezone offset = UTC-7)
    const [yStr, mStr, dStr] = date.split('-')
    const year = parseInt(yStr, 10)
    const month = parseInt(mStr, 10) - 1
    const day = parseInt(dStr, 10)

    const dayStart = new Date(Date.UTC(year, month, day, 0 - 7, 0, 0, 0))
    const dayEnd = new Date(Date.UTC(year, month, day, 24 - 7, 0, 0, 0))

    // Fetch existing sessions for trainer (and optionally member)
    const queries: Promise<{ startTime: Date; endTime: Date }[]>[] = [
      this.prisma.trainingSession.findMany({
        where: {
          trainerStaffId,
          status: { not: TrainingSessionStatus.cancelled },
          deletedAt: null,
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      }),
    ]

    if (memberId) {
      queries.push(
        this.prisma.trainingSession.findMany({
          where: {
            memberId,
            status: { not: TrainingSessionStatus.cancelled },
            deletedAt: null,
            startTime: { lt: dayEnd },
            endTime: { gt: dayStart },
          },
          select: { startTime: true, endTime: true },
        })
      )
    }

    const [trainerSessions, memberSessions] = await Promise.all(queries)
    const memberSess = memberId ? memberSessions : []

    // Build 15 slots from 06:00 to 21:00 (Vietnam time)
    const now = new Date()
    const graceThreshold = new Date(now.getTime() + 5 * 60 * 1000)

    const slots: SlotData[] = []
    for (let hour = 6; hour < 21; hour++) {
      const slotIndex = hour - 5
      const slotStart = new Date(Date.UTC(year, month, day, hour - 7, 0, 0, 0))
      const slotEnd = new Date(Date.UTC(year, month, day, hour + 1 - 7, 0, 0, 0))

      let available = true
      let reason: SlotData['reason']

      if (slotStart <= graceThreshold) {
        available = false
        reason = 'PAST_TIME'
      } else if (trainerSessions.some(s => s.startTime < slotEnd && s.endTime > slotStart)) {
        available = false
        reason = 'TRAINER_BUSY'
      } else if (memberSess.some(s => s.startTime < slotEnd && s.endTime > slotStart)) {
        available = false
        reason = 'MEMBER_BUSY'
      }

      slots.push({
        slotIndex,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        available,
        ...(reason ? { reason } : {}),
      })
    }

    return {
      date,
      trainer: {
        staffId: trainer.staffId.toString(),
        fullName: trainer.user.fullName,
        avatarFileId: trainer.user.avatarFileId?.toString() ?? null,
      },
      slots,
    }
  }
}
```

- [x] **Step 2: Register in module**

In `server/src/training/training.module.ts`, add the service to imports and providers. Read the file first to understand current structure, then add `TrainerSessionAvailabilityService` to the providers array and export it.

- [x] **Step 3: Verify build**

Run: `cd server && npm run build`
Expected: Build succeeds

- [x] **Step 4: Commit**

```bash
git add server/src/training/trainer-session-availability.service.ts server/src/training/training.module.ts
git commit -m "feat(training): add TrainerSessionAvailabilityService for shared slot logic"
```

---

## Task 3: Add `getTrainerAvailabilityForTrainer` endpoint

**Goal:** Trainer can query slot availability for any of their assigned members.

**Files:**
- Modify: `server/src/training/dto/trainer-availability-query.dto.ts`
- Modify: `server/src/training/training.controller.ts`
- Modify: `server/src/training/training-session.service.ts`

**Interfaces:**
- Consumes: `TrainerSessionAvailabilityService.getAvailabilitySlots()`
- Produces: `GET /training-sessions/trainer-availability-for-trainer?date=YYYY-MM-DD&trainerStaffId=X&memberId=Y`

- [x] **Step 1: Extend `TrainerAvailabilityQueryDto`**

In `server/src/training/dto/trainer-availability-query.dto.ts`, add optional fields:

```typescript
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'

export class TrainerAvailabilityQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  trainerStaffId?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  memberId?: string
}
```

- [x] **Step 2: Add controller endpoint**

In `server/src/training/training.controller.ts`, add a new endpoint after the existing `getTrainerAvailability`. Read the file first to understand current structure, then add:

```typescript
@Get('training-sessions/trainer-availability-for-trainer')
@DatabaseRetryable()
@RequirePermission('session.manage')
async getTrainerAvailabilityForTrainer(
  @Query() query: TrainerAvailabilityQueryDto,
  @CurrentUser() user: AuthenticatedUser
) {
  const trainerStaffId = query.trainerStaffId
    ? BigInt(query.trainerStaffId)
    : await this.caller.resolveStaffId(user)
  if (!trainerStaffId) {
    throw new BadRequestException({
      success: false,
      code: 'FK_CONSTRAINT',
      message: 'trainerStaffId la bat buoc',
    })
  }
  const memberId = query.memberId ? BigInt(query.memberId) : undefined
  const result = await this.availability.getAvailabilitySlots(
    query.date,
    trainerStaffId,
    memberId,
  )
  return { success: true, ...result }
}
```

Inject `TrainerSessionAvailabilityService` in the controller constructor. Add the necessary import for `BadRequestException`.

- [x] **Step 3: Verify build**

Run: `cd server && npm run build`
Expected: Build succeeds

- [x] **Step 4: Commit**

```bash
git add server/src/training/dto/trainer-availability-query.dto.ts server/src/training/training.controller.ts
git commit -m "feat(training): add trainer-availability-for-trainer endpoint"
```

---

## Task 4: Add client-side `getTrainerAvailabilityForTrainer` service method

**Goal:** Client can call the new trainer availability endpoint.

**Files:**
- Modify: `client/src/services/training-session.service.ts`

**Interfaces:**
- Consumes: `GET /training-sessions/trainer-availability-for-trainer`
- Produces: `trainingSessionService.getTrainerAvailabilityForTrainer(date, trainerStaffId, memberId)`

- [x] **Step 1: Add the service method**

Read `client/src/services/training-session.service.ts` first. Find where `getTrainerAvailability` is defined (search for that string). Add a new method right after it. The new method follows the same pattern but uses the new endpoint and accepts `trainerStaffId` and `memberId` parameters:

```typescript
async getTrainerAvailabilityForTrainer(
  date: string,
  trainerStaffId: string,
  memberId?: string,
): Promise<TrainerAvailabilityData> {
  const params = new URLSearchParams({ date, trainerStaffId })
  if (memberId) params.set('memberId', memberId)
  const { data } = await api.get<TrainerAvailabilityData>(
    `/training-sessions/trainer-availability-for-trainer?${params.toString()}`
  )
  return data
}
```

Also check if the `TrainerAvailabilityData` type is already exported from this file — if so, reuse it.

- [x] **Step 2: Verify client build**

Run: `cd client && npm run build`
Expected: Build succeeds

- [x] **Step 3: Commit**

```bash
git add client/src/services/training-session.service.ts
git commit -m "feat(training): add getTrainerAvailabilityForTrainer client service method"
```

---

## Task 5: Replace free-form time picker with slot grid in `CreateSessionPage`

**Goal:** Trainer selects time via the same slot grid UI that members use.

**Files:**
- Modify: `client/src/pages/trainer/sessions/CreateSessionPage.tsx`

**Interfaces:**
- Consumes: `trainingSessionService.getTrainerAvailabilityForTrainer(date, trainerStaffId, memberId)`
- Produces: Session created via existing `trainingSessionService.createSession()`

- [x] **Step 1: Read current CreateSessionPage structure**

Read `client/src/pages/trainer/sessions/CreateSessionPage.tsx` in full to understand existing state variables and imports.

- [x] **Step 2: Add slot-related state variables**

After the existing state declarations (around line 53), add:

```typescript
const [selectedDate, setSelectedDate] = useState(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const [availabilitySlots, setAvailabilitySlots] = useState<Array<{
  slotIndex: number
  startTime: string
  endTime: string
  available: boolean
  reason?: string
}>>([])
const [selectedSlot, setSelectedSlot] = useState<{
  startTime: string
  endTime: string
} | null>(null)
const [slotsLoading, setSlotsLoading] = useState(false)
```

- [x] **Step 3: Add effect to load slots when member or date changes**

After existing `useEffect` blocks, add a new one. This runs only when `editing` is false, `memberId` is set, and `selectedDate` changes:

```typescript
useEffect(() => {
  if (editing || !memberId) {
    setAvailabilitySlots([])
    setSelectedSlot(null)
    return
  }

  let active = true
  setSlotsLoading(true)
  setSelectedSlot(null)

  trainingSessionService
    .getTrainerAvailabilityForTrainer(selectedDate, /* trainerStaffId from caller */ '', memberId)
    .then((data) => {
      if (!active) return
      setAvailabilitySlots(data.slots)
    })
    .catch(() => {
      if (!active) return
      setAvailabilitySlots([])
    })
    .finally(() => {
      if (active) setSlotsLoading(false)
    })

  return () => { active = false }
}, [editing, memberId, selectedDate])
```

Note: The `trainerStaffId` parameter is resolved server-side from the JWT when omitted. Pass `''` or omit it — the endpoint resolves it from the caller's JWT if `trainerStaffId` is not provided.

- [x] **Step 4: Update `endTime` derivation to use selected slot**

The current `endTime` useMemo (line 158) derives from `startTime` + `duration`. Replace it so that when a slot is selected, `startTime` and `endTime` come from the slot:

```typescript
const computedStartTime = useMemo(() => {
  if (selectedSlot) return selectedSlot.startTime
  const iso = localDateTimeInputToIso(startTime)
  return iso || ''
}, [selectedSlot, startTime])

const computedEndTime = useMemo(() => {
  if (selectedSlot) return selectedSlot.endTime
  if (!computedStartTime || !Number.isFinite(duration) || duration <= 0) return ''
  const start = new Date(computedStartTime)
  return new Date(start.getTime() + duration * 60000).toISOString()
}, [selectedSlot, computedStartTime, duration])
```

- [x] **Step 5: Replace DateTimePickerInput + Duration fields with slot grid**

In the JSX, find the `<div className="grid gap-4 md:grid-cols-2">` block containing the DateTimePickerInput and duration input (around lines 342-365). Replace it with:

```tsx
{/* Slot Grid — visible when member is selected and not editing */}
{memberId && !editing ? (
  <div className="space-y-2">
    <span className="rogym-field-label">
      {t('sessions.create.fieldStartTime')}
    </span>
    {/* Date picker row */}
    <input
      type="date"
      className="rogym-input"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      min={new Date().toISOString().slice(0, 10)}
    />
    {/* Slot grid */}
    {slotsLoading ? (
      <div className="grid grid-cols-3 gap-2 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    ) : availabilitySlots.length > 0 ? (
      <div className="grid grid-cols-3 gap-2">
        {availabilitySlots.map((slot) => {
          const isSelected =
            selectedSlot?.startTime === slot.startTime &&
            selectedSlot?.endTime === slot.endTime
          const fmt = (iso: string) =>
            new Date(iso).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Ho_Chi_Minh',
            })
          return (
            <button
              key={slot.slotIndex}
              type="button"
              disabled={!slot.available}
              onClick={() => setSelectedSlot(slot)}
              className={`rounded-xl px-3 py-2 text-center text-sm font-semibold transition-all ${
                isSelected
                  ? 'border border-[var(--rogym-accent)] bg-[var(--rogym-accent)]/20 text-white'
                  : slot.available
                    ? 'border border-white/10 bg-white/[0.02] text-white hover:border-[var(--rogym-accent)]/40'
                    : 'cursor-not-allowed border border-white/5 bg-white/[0.01] text-white/25 opacity-50'
              }`}
            >
              {fmt(slot.startTime)} - {fmt(slot.endTime)}
              {!slot.available && (
                <span className="mt-0.5 block text-[10px] font-normal text-rose-400/80">
                  {slot.reason === 'PAST_TIME'
                    ? t('sessions.create.slotPast', { defaultValue: 'Qua gio' })
                    : t('sessions.create.slotBusy', { defaultValue: 'Da dat' })}
                </span>
              )}
            </button>
          )
        })}
      </div>
    ) : memberId ? (
      <p className="text-xs text-white/50">
        {t('sessions.create.noSlots', { defaultValue: 'Khong co khung gio nao' })}
      </p>
    ) : null}
  </div>
) : editing ? (
  /* Editing mode: keep existing DateTimePickerInput */
  <div className="grid gap-4 md:grid-cols-2">
    <div className="block space-y-2">
      <span className="rogym-field-label">{t('sessions.create.fieldStartTime')}</span>
      <DateTimePickerInput
        value={startTime}
        onChange={setStartTime}
        placeholder={t('sessions.create.startTimePlaceholder')}
        aria-label={t('sessions.create.fieldStartTime')}
        disabled={editBlocked}
      />
    </div>
    <label className="block space-y-2">
      <span className="rogym-field-label">{t('sessions.create.fieldDuration')}</span>
      <input
        className="rogym-input"
        type="number"
        min={15}
        max={360}
        step={15}
        value={duration}
        onChange={(event) => setDuration(Number(event.target.value))}
        required
      />
    </label>
  </div>
) : null}
```

- [x] **Step 6: Update submit payload to use slot times**

In `handleSubmit`, find the payload construction (around line 191). Change `startTime` and `endTime` to use `computedStartTime` and `computedEndTime`:

```typescript
const payload = {
  roomId,
  startTime: computedStartTime,
  endTime: computedEndTime,
}
```

- [x] **Step 7: Update submit button disabled condition**

Add `!selectedSlot` to the disabled condition (unless editing):

```typescript
disabled={
  editBlocked ||
  !memberId ||
  !roomId ||
  (!editing && !selectedSlot) ||
  (editing && !endTime) ||
  !Number.isFinite(duration) ||
  duration <= 0 ||
  !hasWorkoutPlanLink
}
```

- [x] **Step 8: Update estimated end display**

The estimated end display (line 367-371) should show `computedEndTime` instead of `endTime`:

```tsx
{computedEndTime ? toDateTimeLocalInput(computedEndTime).replace('T', ' ') : t('sessions.create.endUnknown')}
```

- [x] **Step 9: Verify client build**

Run: `cd client && npm run build`
Expected: Build succeeds with no type errors

- [x] **Step 10: Commit**

```bash
git add client/src/pages/trainer/sessions/CreateSessionPage.tsx
git commit -m "feat(training): replace free time picker with slot grid in trainer CreateSessionPage"
```

---

## Task 6: Refactor `getTrainerAvailability` to use shared service

**Goal:** Eliminate duplicate slot logic in `MemberSessionBookingService` by delegating to `TrainerSessionAvailabilityService`.

**Files:**
- Modify: `server/src/training/member-session-booking.service.ts`

**Interfaces:**
- Consumes: `TrainerSessionAvailabilityService.getAvailabilitySlots()`
- Produces: Same `getTrainerAvailability()` return shape

- [x] **Step 1: Read current `getTrainerAvailability` method**

Read `server/src/training/member-session-booking.service.ts:14-142` to see the current implementation.

- [x] **Step 2: Replace method body to delegate to shared service**

Replace the entire `getTrainerAvailability` method body. The current implementation duplicates slot logic — replace it with a delegation to the shared service:

```typescript
async getTrainerAvailability(query: TrainerAvailabilityQueryDto, caller: Caller) {
  const memberId = await this.caller.resolveMemberId(caller)
  if (!memberId) {
    throw new ForbiddenException({
      success: false,
      code: 'FORBIDDEN',
      message: 'Khong tim thay member profile',
    })
  }

  const member = await this.prisma.member.findFirst({
    where: { memberId, deletedAt: null },
    select: { primaryTrainerId: true },
  })

  if (!member) {
    throw new NotFoundException({
      success: false,
      code: 'NOT_FOUND',
      message: 'Member khong ton tai',
    })
  }

  if (!member.primaryTrainerId) {
    throw new BadRequestException({
      success: false,
      code: 'NO_PRIMARY_TRAINER',
      message: 'Ban chua duoc gan PT phu trach',
    })
  }

  return this.availability.getAvailabilitySlots(
    query.date,
    member.primaryTrainerId,
    memberId,
  )
}
```

Inject `TrainerSessionAvailabilityService` into the `MemberSessionBookingService` constructor.

- [x] **Step 3: Remove dead code**

After replacing, the old slot-building logic (the `for` loop building 15 slots, the session queries, the `graceThreshold` calculation) is now dead. The `TrainerAvailabilityQueryDto` import might change — the `date` field is still the same so no change needed there. Remove the `Prisma` import from this file if no longer used.

- [x] **Step 4: Verify build**

Run: `cd server && npm run build`
Expected: Build succeeds

- [x] **Step 5: Commit**

```bash
git add server/src/training/member-session-booking.service.ts
git commit -m "refactor(training): delegate getTrainerAvailability to shared TrainerSessionAvailabilityService"
```

---

## Task 7: End-to-end manual verification

**Goal:** Verify both flows work correctly with the new validations.

- [ ] **Step 1: Start server and run `npm run prisma:generate` if schema changed**

```bash
cd server && npm run prisma:generate && npm run dev
```

- [ ] **Step 2: Test trainer creates session — valid slot**

Via Swagger or API client:
- `POST /api/v1/training-sessions` with valid member, room, startTime/endTime = one of the 15 standard slots (e.g. `2026-08-25T13:00:00.000Z` to `2026-08-25T14:00:00.000Z` for 20:00-21:00 VN time)
- Expected: 201 Created

- [ ] **Step 3: Test trainer creates session — member overlap**

- Create session A for member M at 10:00-11:00 VN
- Try to create session B for same member M at 10:30-11:30 VN
- Expected: 409 Conflict with code `MEMBER_TIME_OVERLAP`

- [ ] **Step 4: Test trainer creates session — invalid duration**

- `POST /api/v1/training-sessions` with startTime/endTime = 45 minutes apart
- Expected: 400 with code `INVALID_DURATION`

- [ ] **Step 5: Test trainer creates session — past time**

- `POST /api/v1/training-sessions` with startTime in the past
- Expected: 400 with code `VALIDATION_ERROR`

- [ ] **Step 6: Test trainer availability endpoint**

- `GET /api/v1/training-sessions/trainer-availability-for-trainer?date=2026-08-25&memberId=X`
- Expected: 200 with 15 slots, unavailable slots marked with reasons

- [ ] **Step 7: Test client slot grid UI**

- Open trainer session creation page
- Select a member → slots should load
- Select a date → slots should update
- Pick an available slot → submit
- Verify session is created with correct times

- [ ] **Step 8: Test client slot grid — conflict handling**

- Select a member who already has a session at 10:00
- Navigate to that date → 10:00-11:00 slot should show as unavailable
- Verify it's not clickable

---

## Summary of Changes

| Problem | Before | After |
|---------|--------|-------|
| Member overlap | Not checked in trainer flow | Checked via `checkOverlap(..., memberId)` |
| Duration | Any duration allowed | Fixed 60 minutes |
| Past booking | Weak grace check | Strict 5-minute minimum |
| Time selection | Free DateTimePickerInput | Slot grid (15 slots, 06:00-21:00 VN) |
| Slot visibility | Trainer has no availability view | Slot grid shows busy/available status |
| Duplicate logic | Slot logic duplicated in booking service | Shared `TrainerSessionAvailabilityService` |

---

## Progress Log

### Task 1 — DONE (`b06495b`)
- Member overlap check added via `checkOverlap(..., memberId)`
- 60-minute duration enforcement (`INVALID_DURATION`)
- 5-minute minimum booking window (replaced weak `graceTime`)
- `nest build` passes

### Task 2 — DONE (`6e3d449`)
- Created `trainer-session-availability.service.ts` with `getAvailabilitySlots(date, trainerStaffId, memberId?)`
- 15 daily slots (06:00-21:00 VN time), checks PAST_TIME / TRAINER_BUSY / MEMBER_BUSY
- Registered in `TrainingModule` providers
- Fixed TS2339: explicit type annotation for `Promise.resolve([])` to avoid `never[]`
- `nest build` passes

### Task 3 — DONE (`cd85754`)
- Extended `TrainerAvailabilityQueryDto` with optional `trainerStaffId` + `memberId`
- Added `GET /training-sessions/trainer-availability-for-trainer` endpoint
- Injected `TrainerSessionAvailabilityService` + `TrainingCallerResolverService` into controller
- `nest build` passes

### Task 4 — DONE (`a19d405`)
- Added `getTrainerAvailabilityForTrainer(date, trainerStaffId, memberId?)` to client service
- Reuses existing `TrainerAvailabilityData` type
- `tsc --noEmit` passes

### Task 5 — DONE (`1c6c928`)
- Replaced free-form DateTimePickerInput with slot grid in `CreateSessionPage`
- Added `selectedDate`, `availabilitySlots`, `selectedSlot`, `slotsLoading` state
- Added `useEffect` to load slots when member or date changes
- Added `computedStartTime` / `computedEndTime` useMemos for slot-based time
- Updated submit payload, disabled condition, and estimated end display
- `tsc --noEmit` passes

### Task 6 — DONE (`e9f9e5d`)
- Replaced `getTrainerAvailability` method body with delegation to `TrainerSessionAvailabilityService`
- Removed 100 lines of duplicated slot-building logic
- Simplified member query to only select `primaryTrainerId`
- `tsc --noEmit` passes
