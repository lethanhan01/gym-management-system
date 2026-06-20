import { EquipmentStatus, MaintenanceStatus } from '@prisma/client'
import { prisma } from './client'

const ROOMS_DATA = [
  {
    roomCode: 'ROOM-001',
    name: 'Phong Cardio',
    roomType: 'cardio',
    capacity: 30,
    description: 'May chay bo, xe dap tap, elliptical trainer',
  },
  {
    roomCode: 'ROOM-002',
    name: 'Phong Ta & May',
    roomType: 'weights',
    capacity: 20,
    description: 'Ta tu do, may tap co bap da chuc nang',
  },
  {
    roomCode: 'ROOM-003',
    name: 'Phong Yoga & PT',
    roomType: 'multipurpose',
    capacity: 15,
    description: 'Yoga, gian co va PT ca nhan 1-1',
  },
]

const EQUIPMENT_DATA: {
  roomCode: string
  equipmentCode: string
  name: string
  importDate: Date
  warrantyUntil: Date | null
  status: EquipmentStatus
}[] = [
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C001',
    name: 'May Chay Bo Life Fitness #1',
    importDate: new Date('2024-01-15'),
    warrantyUntil: new Date('2027-01-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C002',
    name: 'May Chay Bo Life Fitness #2',
    importDate: new Date('2024-01-15'),
    warrantyUntil: new Date('2027-01-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C003',
    name: 'Xe Dap Tap Technogym',
    importDate: new Date('2024-03-10'),
    warrantyUntil: new Date('2027-03-10'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W001',
    name: 'Bo Ta Don 5-40kg',
    importDate: new Date('2024-01-20'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W002',
    name: 'May Ep Nguc Life Fitness',
    importDate: new Date('2023-06-01'),
    warrantyUntil: new Date('2026-06-01'),
    status: EquipmentStatus.repairing,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W003',
    name: 'May Keo Cap Lat Pulldown',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W004',
    name: 'Ghe Tap Bung Bao Ve Lung',
    importDate: new Date('2024-02-10'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-003',
    equipmentCode: 'EQP-Y001',
    name: 'Bo 15 Tham Yoga Manduka',
    importDate: new Date('2024-02-01'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-003',
    equipmentCode: 'EQP-Y002',
    name: 'Bo Day Khang Luc Theraband',
    importDate: new Date('2024-02-01'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  // Cardio bo sung (ROOM-001)
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C004',
    name: 'Elliptical Trainer Technogym',
    importDate: new Date('2024-03-10'),
    warrantyUntil: new Date('2027-03-10'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C005',
    name: 'May Cheo Thuyen Concept2',
    importDate: new Date('2024-06-15'),
    warrantyUntil: new Date('2027-06-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C006',
    name: 'Air Bike Assault Fitness',
    importDate: new Date('2024-08-20'),
    warrantyUntil: new Date('2026-08-20'),
    status: EquipmentStatus.active,
  },
  // Strength bo sung (ROOM-002)
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W005',
    name: 'May Ep Chan Life Fitness',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W006',
    name: 'May Dui Truoc Leg Extension',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W007',
    name: 'May Dui Sau Leg Curl',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W008',
    name: 'May Cap Da Nang Functional Trainer',
    importDate: new Date('2024-01-20'),
    warrantyUntil: new Date('2027-01-20'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W009',
    name: 'Smith Machine',
    importDate: new Date('2024-01-20'),
    warrantyUntil: new Date('2027-01-20'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W010',
    name: 'Cable Machine Don Nang',
    importDate: new Date('2024-05-01'),
    warrantyUntil: new Date('2027-05-01'),
    status: EquipmentStatus.broken,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W011',
    name: 'Hack Squat Machine',
    importDate: new Date('2021-03-15'),
    warrantyUntil: null,
    status: EquipmentStatus.retired,
  },
]

export async function seedRoomsAndEquipment(): Promise<{
  roomMap: Map<string, bigint>
  equipMap: Map<string, bigint>
}> {
  const roomMap = new Map<string, bigint>()
  for (const r of ROOMS_DATA) {
    const row = await prisma.gymRoom.upsert({
      where: { roomCode: r.roomCode },
      update: {
        name: r.name,
        roomType: r.roomType,
        capacity: r.capacity,
        description: r.description,
      },
      create: r,
    })
    roomMap.set(r.roomCode, row.roomId)
  }

  const equipMap = new Map<string, bigint>()
  for (const e of EQUIPMENT_DATA) {
    const roomId = roomMap.get(e.roomCode)!
    const row = await prisma.equipment.upsert({
      where: { equipmentCode: e.equipmentCode },
      update: { name: e.name, status: e.status },
      create: {
        roomId,
        equipmentCode: e.equipmentCode,
        name: e.name,
        importDate: e.importDate,
        warrantyUntil: e.warrantyUntil,
        status: e.status,
      },
    })
    equipMap.set(e.equipmentCode, row.equipmentId)
  }

  // maintenance logs
  const staffLinh = await prisma.staff.findUnique({ where: { staffCode: 'STF-STA-001' } })
  if (staffLinh) {
    await prisma.maintenanceLog.deleteMany({ where: { equipmentId: equipMap.get('EQP-W002') } })
    await prisma.maintenanceLog.create({
      data: {
        equipmentId: equipMap.get('EQP-W002')!,
        reportedByStaffId: staffLinh.staffId,
        description:
          'May ep nguc bi tieng keu bat thuong, lo xo ben phai co dau hieu gian ra. Can kiem tra va thay the linh kien.',
        status: MaintenanceStatus.repairing,
        reportedAt: new Date('2026-05-20T09:00:00'),
      },
    })
    await prisma.maintenanceLog.deleteMany({ where: { equipmentId: equipMap.get('EQP-W010') } })
    await prisma.maintenanceLog.create({
      data: {
        equipmentId: equipMap.get('EQP-W010')!,
        reportedByStaffId: staffLinh.staffId,
        description: 'Cable machine bi dut cap, khong the su dung. Can thay the cap moi.',
        status: MaintenanceStatus.reported,
        reportedAt: new Date('2026-06-10T08:30:00'),
      },
    })
    await prisma.maintenanceLog.deleteMany({ where: { equipmentId: equipMap.get('EQP-C001') } })
    await prisma.maintenanceLog.create({
      data: {
        equipmentId: equipMap.get('EQP-C001')!,
        reportedByStaffId: staffLinh.staffId,
        description: 'May chay bo bi loi cam bien toc do, da thay the va kiem tra xong.',
        status: MaintenanceStatus.resolved,
        reportedAt: new Date('2026-03-10T09:00:00'),
        resolvedAt: new Date('2026-03-18T14:00:00'),
      },
    })
    await prisma.maintenanceLog.deleteMany({ where: { equipmentId: equipMap.get('EQP-W011') } })
    await prisma.maintenanceLog.create({
      data: {
        equipmentId: equipMap.get('EQP-W011')!,
        reportedByStaffId: staffLinh.staffId,
        description: 'Hack squat machine bi hong nang, khong the sua chua, da loai bien.',
        status: MaintenanceStatus.failed,
        reportedAt: new Date('2025-12-01T10:00:00'),
      },
    })
  }

  console.log(
    `[seed] seeded ${ROOMS_DATA.length} rooms, ${EQUIPMENT_DATA.length} equipment, 4 maintenance logs`
  )
  return { roomMap, equipMap }
}

export async function seedNewRoomsAndEquipment(): Promise<{ newRoomMap: Map<string, bigint> }> {
  const rooms = [
    {
      roomCode: 'ROOM-004',
      name: 'Phòng Yoga & Thiền',
      roomType: 'yoga',
      capacity: 20,
      description: 'Phòng chuyên luyện yoga và thiền định',
    },
    {
      roomCode: 'ROOM-005',
      name: 'Phòng Functional Training',
      roomType: 'functional',
      capacity: 15,
      description: 'Phòng tập vận động chức năng',
    },
    {
      roomCode: 'ROOM-006',
      name: 'Phòng Group Class',
      roomType: 'group_class',
      capacity: 25,
      description: 'Phòng lớp học nhóm',
    },
    {
      roomCode: 'ROOM-007',
      name: 'Phòng Spinning',
      roomType: 'spinning',
      capacity: 20,
      description: 'Phòng đạp xe spinning',
    },
    {
      roomCode: 'ROOM-008',
      name: 'Phòng Calisthenics',
      roomType: 'calisthenics',
      capacity: 12,
      description: 'Phòng tập thể dục tự thân',
    },
    {
      roomCode: 'ROOM-009',
      name: 'Phòng Phục Hồi Chức Năng',
      roomType: 'rehabilitation',
      capacity: 10,
      description: 'Phòng phục hồi và vật lý trị liệu',
    },
    {
      roomCode: 'ROOM-010',
      name: 'Phòng VIP PT',
      roomType: 'vip_pt',
      capacity: 6,
      description: 'Phòng PT VIP dành cho huấn luyện cá nhân',
    },
  ]

  const newRoomMap = new Map<string, bigint>()
  for (const room of rooms) {
    const row = await prisma.gymRoom.upsert({
      where: { roomCode: room.roomCode },
      update: {},
      create: room,
    })
    newRoomMap.set(room.roomCode, row.roomId)
  }
  console.log(`[seed] seeded ${rooms.length} new rooms (ROOM-004..010)`)

  type EquipmentInput = {
    roomCode: string
    equipmentCode: string
    name: string
    importDate: Date
    warrantyUntil: Date | null
    status: EquipmentStatus
  }

  const equipment: EquipmentInput[] = [
    // ROOM-004 yoga (3 items)
    {
      roomCode: 'ROOM-004',
      equipmentCode: 'EQP-R4-001',
      name: 'Thảm Yoga Premium',
      importDate: new Date('2024-03-01'),
      warrantyUntil: new Date('2027-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-004',
      equipmentCode: 'EQP-R4-002',
      name: 'Gối Thiền Zafu',
      importDate: new Date('2024-03-01'),
      warrantyUntil: null,
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-004',
      equipmentCode: 'EQP-R4-003',
      name: 'Khối Yoga Cork',
      importDate: new Date('2024-06-15'),
      warrantyUntil: new Date('2027-06-15'),
      status: EquipmentStatus.active,
    },
    // ROOM-005 functional (4 items)
    {
      roomCode: 'ROOM-005',
      equipmentCode: 'EQP-R5-001',
      name: 'Xà Đơn Treo Trần',
      importDate: new Date('2024-01-10'),
      warrantyUntil: new Date('2026-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-005',
      equipmentCode: 'EQP-R5-002',
      name: 'Vòng TRX Suspension',
      importDate: new Date('2024-01-10'),
      warrantyUntil: new Date('2025-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-005',
      equipmentCode: 'EQP-R5-003',
      name: 'Thang Leo Crossfit',
      importDate: new Date('2023-09-01'),
      warrantyUntil: null,
      status: EquipmentStatus.repairing,
    },
    {
      roomCode: 'ROOM-005',
      equipmentCode: 'EQP-R5-004',
      name: 'Bánh Xe Lăn Bụng',
      importDate: new Date('2024-08-20'),
      warrantyUntil: new Date('2027-06-30'),
      status: EquipmentStatus.active,
    },
    // ROOM-006 group_class (3 items)
    {
      roomCode: 'ROOM-006',
      equipmentCode: 'EQP-R6-001',
      name: 'Loa Âm Thanh Bluetooth',
      importDate: new Date('2024-02-14'),
      warrantyUntil: new Date('2027-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-006',
      equipmentCode: 'EQP-R6-002',
      name: 'Tạ Tay Nhựa Màu Set 12 Cặp',
      importDate: new Date('2023-06-01'),
      warrantyUntil: new Date('2026-03-01'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-006',
      equipmentCode: 'EQP-R6-003',
      name: 'Máy Chiếu Mini',
      importDate: new Date('2022-11-01'),
      warrantyUntil: null,
      status: EquipmentStatus.broken,
    },
    // ROOM-007 spinning (3 items)
    {
      roomCode: 'ROOM-007',
      equipmentCode: 'EQP-R7-001',
      name: 'Xe Đạp Spinning Schwinn',
      importDate: new Date('2024-04-01'),
      warrantyUntil: new Date('2026-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-007',
      equipmentCode: 'EQP-R7-002',
      name: 'Xe Đạp Spinning Keiser',
      importDate: new Date('2024-04-01'),
      warrantyUntil: null,
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-007',
      equipmentCode: 'EQP-R7-003',
      name: 'Xe Đạp Spinning Echelon',
      importDate: new Date('2023-03-15'),
      warrantyUntil: new Date('2025-06-01'),
      status: EquipmentStatus.repairing,
    },
    // ROOM-008 calisthenics (3 items)
    {
      roomCode: 'ROOM-008',
      equipmentCode: 'EQP-R8-001',
      name: 'Khung Xà Kép Dip Station',
      importDate: new Date('2024-05-01'),
      warrantyUntil: new Date('2027-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-008',
      equipmentCode: 'EQP-R8-002',
      name: 'Thanh Xà Đơn Gắn Tường',
      importDate: new Date('2024-05-01'),
      warrantyUntil: new Date('2026-06-01'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-008',
      equipmentCode: 'EQP-R8-003',
      name: 'Vòng Gymnastic Ring',
      importDate: new Date('2022-07-01'),
      warrantyUntil: null,
      status: EquipmentStatus.broken,
    },
    // ROOM-009 rehabilitation (3 items)
    {
      roomCode: 'ROOM-009',
      equipmentCode: 'EQP-R9-001',
      name: 'Bóng Phục Hồi Bosu',
      importDate: new Date('2024-07-01'),
      warrantyUntil: new Date('2026-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-009',
      equipmentCode: 'EQP-R9-002',
      name: 'Dây Kháng Lực Thun',
      importDate: new Date('2024-07-01'),
      warrantyUntil: null,
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-009',
      equipmentCode: 'EQP-R9-003',
      name: 'Bàn Massage Trị Liệu',
      importDate: new Date('2023-10-01'),
      warrantyUntil: new Date('2027-12-31'),
      status: EquipmentStatus.repairing,
    },
    // ROOM-010 vip_pt (3 items)
    {
      roomCode: 'ROOM-010',
      equipmentCode: 'EQP-R10-001',
      name: 'Tạ Đơn Điều Chỉnh Bowflex',
      importDate: new Date('2024-09-01'),
      warrantyUntil: new Date('2027-12-31'),
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-010',
      equipmentCode: 'EQP-R10-002',
      name: 'Ghế Đa Năng FID Bench',
      importDate: new Date('2024-09-01'),
      warrantyUntil: null,
      status: EquipmentStatus.active,
    },
    {
      roomCode: 'ROOM-010',
      equipmentCode: 'EQP-R10-003',
      name: 'Máy Kéo Cáp Cable Machine',
      importDate: new Date('2021-05-01'),
      warrantyUntil: new Date('2026-01-01'),
      status: EquipmentStatus.retired,
    },
  ]

  const newEquipMap = new Map<string, bigint>()
  let eqCount = 0
  for (const eq of equipment) {
    const roomId = newRoomMap.get(eq.roomCode)!
    const row = await prisma.equipment.upsert({
      where: { equipmentCode: eq.equipmentCode },
      update: {},
      create: {
        roomId,
        equipmentCode: eq.equipmentCode,
        name: eq.name,
        importDate: eq.importDate,
        warrantyUntil: eq.warrantyUntil,
        status: eq.status,
      },
    })
    newEquipMap.set(eq.equipmentCode, row.equipmentId)
    eqCount++
  }
  console.log(`[seed] seeded ${eqCount} new equipment items`)

  // maintenance logs for non-active equipment (broken / repairing / retired)
  const staffLinh = await prisma.staff.findUnique({ where: { staffCode: 'STF-STA-001' } })
  if (staffLinh) {
    await prisma.maintenanceLog.createMany({
      data: [
        {
          equipmentId: newEquipMap.get('EQP-R5-003')!,
          reportedByStaffId: staffLinh.staffId,
          description:
            'Thang leo crossfit bị gãy một bậc thang, đang chờ nhà cung cấp gửi linh kiện thay thế.',
          status: MaintenanceStatus.repairing,
          reportedAt: new Date('2026-05-28T08:00:00'),
        },
        {
          equipmentId: newEquipMap.get('EQP-R6-003')!,
          reportedByStaffId: staffLinh.staffId,
          description:
            'Máy chiếu mini không lên nguồn, đèn báo đỏ liên tục. Đã kiểm tra, bo mạch nguồn bị hỏng.',
          status: MaintenanceStatus.reported,
          reportedAt: new Date('2026-06-02T09:30:00'),
        },
        {
          equipmentId: newEquipMap.get('EQP-R7-003')!,
          reportedByStaffId: staffLinh.staffId,
          description:
            'Xe đạp spinning Echelon bị tiếng kêu lạ ở ổ trục, kỹ thuật viên đang kiểm tra và bôi trơn.',
          status: MaintenanceStatus.repairing,
          reportedAt: new Date('2026-06-05T10:00:00'),
        },
        {
          equipmentId: newEquipMap.get('EQP-R8-003')!,
          reportedByStaffId: staffLinh.staffId,
          description:
            'Vòng gymnastic ring bị nứt gỗ, nguy hiểm khi sử dụng. Đã khóa khu vực và báo cáo chờ xử lý.',
          status: MaintenanceStatus.reported,
          reportedAt: new Date('2026-06-08T14:00:00'),
        },
        {
          equipmentId: newEquipMap.get('EQP-R9-003')!,
          reportedByStaffId: staffLinh.staffId,
          description:
            'Bàn massage bị gãy cơ chế điều chỉnh góc nghiêng, đang chờ thợ sửa chuyên dụng.',
          status: MaintenanceStatus.repairing,
          reportedAt: new Date('2026-06-01T11:00:00'),
        },
        {
          equipmentId: newEquipMap.get('EQP-R10-003')!,
          reportedByStaffId: staffLinh.staffId,
          description:
            'Cable machine cũ (2021) bị hỏng hệ thống puli, chi phí sửa vượt giá trị thiết bị. Đã loại biên.',
          status: MaintenanceStatus.failed,
          reportedAt: new Date('2026-05-15T09:00:00'),
        },
      ],
    })
    console.log('[seed] seeded 6 maintenance logs for new rooms equipment')
  }

  return { newRoomMap }
}
