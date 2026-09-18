import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import CheckInPage from './CheckInPage'
import { attendanceService, type AttendanceLog } from '@/services/attendance.service'

const mockStop = vi.fn()
let mockDecodeCallback: ((result: { getText: () => string }) => void) | null = null
const mockDecodeFromVideoDevice = vi.fn()

vi.mock('@zxing/browser', () => {
  return {
    BrowserQRCodeReader: class {
      decodeFromVideoDevice = (...args: unknown[]) => mockDecodeFromVideoDevice(...args)
    },
  }
})

vi.mock('@/services/attendance.service', () => ({
  attendanceService: {
    qrCheckin: vi.fn(),
  },
}))

describe('Member CheckInPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDecodeCallback = null
    mockDecodeFromVideoDevice.mockImplementation(
      async (
        _deviceId: string | undefined,
        _video: HTMLVideoElement,
        callback: (result: { getText: () => string }) => void
      ) => {
        mockDecodeCallback = callback
        return {
          stop: mockStop,
        }
      }
    )
  })

  it('TC-CK-01: renders header, instructions, and video element correctly', async () => {
    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(document.querySelector('video')).toBeInTheDocument()
  })

  it('TC-CK-02: dynamically imports zxing, initiates scan, and submits detected token', async () => {
    const mockLog: AttendanceLog = {
      attendanceId: 'att-123',
      memberId: 'mem-001',
      memberCode: 'MEM001',
      memberName: 'Nguyen Van A',
      subscriptionId: 'sub-001',
      sessionId: null,
      startTime: '2026-09-19T08:00:00Z',
      endTime: null,
      method: 'qr',
    }
    vi.mocked(attendanceService.qrCheckin).mockResolvedValueOnce(mockLog)

    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>
    )

    // Wait for scanner to mount and register callback
    await waitFor(() => {
      expect(mockDecodeCallback).not.toBeNull()
    })

    // Simulate detection of a QR token
    mockDecodeCallback!({ getText: () => 'valid-qr-token-xyz' })

    await waitFor(() => {
      expect(attendanceService.qrCheckin).toHaveBeenCalledWith('valid-qr-token-xyz')
    })
  })

  it('TC-CK-03: handles camera access rejection and shows error message', async () => {
    mockDecodeFromVideoDevice.mockRejectedValueOnce(new Error('Permission denied'))

    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Không thể mở camera/i)).toBeInTheDocument()
    })
  })

  it('TC-CK-04: calls controls.stop() when component unmounts to prevent camera media stream leak', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockDecodeCallback).not.toBeNull()
    })

    unmount()

    expect(mockStop).toHaveBeenCalled()
  })
})
