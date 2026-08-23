import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  TrainerCard,
  TrainerStatCard,
  TrainerModal,
  TrainerSelect,
  TrainerStatusBadge,
  StudentCombobox,
} from './TrainerUI'
import {
  OwnerCard,
  OwnerStatCard,
  OwnerModal,
  OwnerBadge,
  OwnerStatusBadge,
} from './OwnerUI'
import {
  StaffCard,
  StaffStatCard,
  StaffModal,
  StaffStatusBadge,
} from './StaffUI'
import {
  MemberCard,
  MemberStatCard,
  MemberModal,
  MemberStatusBadge,
} from './MemberUI'

describe('Role Facade Components - 100% Backwards Compatibility', () => {
  it('renders TrainerUI components with proper roles and elements', () => {
    render(
      <TrainerCard>
        <TrainerStatCard label="Học viên" value="24" icon={<span data-testid="icon">icon</span>} />
        <TrainerStatusBadge status="active" label="Đang dạy" />
        <StudentCombobox
          students={
            [
              { memberId: '1', memberCode: 'MEM-01', fullName: 'An' },
            ] as unknown as import('@/services/member.service').TrainerStudentSummary[]
          }
          value="1"
          onChange={vi.fn()}
        />

        <TrainerSelect value="" onValueChange={vi.fn()}>
          <option value="">Chọn</option>
        </TrainerSelect>
        <TrainerModal open={false} title="Modal Test" onClose={vi.fn()}>
          <p>Modal</p>
        </TrainerModal>
      </TrainerCard>
    )

    expect(screen.getByText('Học viên')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('Đang dạy')).toBeInTheDocument()
    expect(screen.getByText('MEM-01 - An')).toBeInTheDocument()
  })

  it('renders OwnerUI components with role badges and stat cards', () => {
    render(
      <OwnerCard>
        <OwnerStatCard label="Doanh thu" value="100.000.000đ" icon={<span data-testid="icon">icon</span>} />
        <OwnerBadge label="Admin" color="#f59e0b" />
        <OwnerStatusBadge status="active" label="Hoạt động" />
        <OwnerModal open={false} title="Owner Modal" onClose={vi.fn()}>
          <p>Owner</p>
        </OwnerModal>
      </OwnerCard>
    )

    expect(screen.getByText('Doanh thu')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Hoạt động')).toBeInTheDocument()
  })

  it('renders StaffUI and MemberUI components correctly', () => {
    render(
      <div>
        <StaffCard>
          <StaffStatCard label="Ca trực" value="Ca Sáng" icon={<span data-testid="icon">icon</span>} />
          <StaffStatusBadge status="active" label="Đang trực" />
          <StaffModal open={false} title="Staff Modal" onClose={vi.fn()}>
            <p>Staff</p>
          </StaffModal>
        </StaffCard>
        <MemberCard>
          <MemberStatCard label="Số buổi còn lại" value="12" icon={<span data-testid="icon">icon</span>} />
          <MemberStatusBadge status="active" label="Hội viên VIP" />
          <MemberModal open={false} title="Member Modal" onClose={vi.fn()}>
            <p>Member</p>
          </MemberModal>
        </MemberCard>
      </div>
    )



    expect(screen.getByText('Ca trực')).toBeInTheDocument()
    expect(screen.getByText('Đang trực')).toBeInTheDocument()
    expect(screen.getByText('Số buổi còn lại')).toBeInTheDocument()
    expect(screen.getByText('Hội viên VIP')).toBeInTheDocument()
  })
})
