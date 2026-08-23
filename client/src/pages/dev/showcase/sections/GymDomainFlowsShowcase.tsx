import { useState } from 'react'
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  MapPin,
  QrCode,
  Receipt,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Badge,
  Button,
  FormField,
  Input,
  Modal,
  RadioCard,
  RadioGroup,
  Select,
  Separator,
  StatusBadge,
  TimeSlotPicker,
  type TimeSlot,
} from '@/components/ui'
import { PackagePicker } from '@/components/PackagePicker'
import { ExerciseCard } from '@/components/workout/ExerciseUI'
import MemberWeightChart from '@/components/charts/MemberWeightChart'
import StudentProgressChart from '@/components/charts/StudentProgressChart'
import { ComponentPlaygroundCard } from '../components/ComponentPlaygroundCard'
import {
  SHOWCASE_EXERCISES,
  SHOWCASE_NOTIFICATION_ITEMS,
  SHOWCASE_PACKAGES,
  SHOWCASE_STUDENT_PROGRESS,
  SHOWCASE_TIME_SLOTS,
  SHOWCASE_WEIGHT_DATA,
} from '../mock-data/showcaseData'
import type { Exercise } from '@/services/workout.service'
import { formatVnd } from '@/lib/currency'
import { toast } from '@/lib/toast'

export function GymDomainFlowsShowcase() {
  // Flow 1: Package Picker State
  const [selectedPkgId, setSelectedPkgId] = useState<string>(SHOWCASE_PACKAGES[0].packageId)
  const selectedPkg = SHOWCASE_PACKAGES.find((p) => p.packageId === selectedPkgId) || SHOWCASE_PACKAGES[0]

  // Flow 2: Exercise Library State
  const [muscleFilter, setMuscleFilter] = useState<string>('all')
  const [activeExerciseModal, setActiveExerciseModal] = useState<Exercise | null>(null)

  const filteredExercises = SHOWCASE_EXERCISES.filter((ex) => {
    if (muscleFilter === 'all') return true
    return ex.bodyPart?.name.toLowerCase().includes(muscleFilter.toLowerCase())
  })

  // Flow 3: PT Booking & Check-in State
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(SHOWCASE_TIME_SLOTS[2])
  const [selectedTrainer, setSelectedTrainer] = useState('Alex Mercer (Master PT)')
  const [bookedSessions, setBookedSessions] = useState([
    {
      id: 'SES-001',
      trainer: 'Alex Mercer (Master PT)',
      time: '09:00 - 10:00, Hôm nay',
      room: 'Studio B (Tầng 2)',
      status: 'scheduled' as 'scheduled' | 'checked-in' | 'cancelled',
    },
  ])

  // Flow 4: Charts Range State
  const [chartRange, setChartRange] = useState<'3m' | '6m' | '1y'>('6m')

  // Flow 5: Payment & Checkout State
  const [checkoutPkgId, setCheckoutPkgId] = useState('pkg_vip12')
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo' | 'cash' | 'card'>('vnpay')
  const [discountCode, setDiscountCode] = useState('ROGYM2026')
  const [discountApplied, setDiscountApplied] = useState(true)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const checkoutPkg = SHOWCASE_PACKAGES.find((p) => p.packageId === checkoutPkgId) || SHOWCASE_PACKAGES[0]
  const basePrice = Number(checkoutPkg.price)
  const discountAmount = discountApplied ? basePrice * 0.1 : 0
  const finalPrice = basePrice - discountAmount

  // Flow 6: Notifications State
  const [notifications, setNotifications] = useState(SHOWCASE_NOTIFICATION_ITEMS)
  const unreadCount = notifications.filter((n) => n.unread).length

  const handleBookSession = () => {
    if (!selectedSlot) {
      toast.error('Vui lòng chọn một khung giờ hợp lệ!')
      return
    }
    const newSession = {
      id: `SES-00${bookedSessions.length + 1}`,
      trainer: selectedTrainer,
      time: `${new Date(selectedSlot.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedSlot.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, Hôm nay`,
      room: 'Studio A (Tầng 1)',
      status: 'scheduled' as const,
    }
    setBookedSessions([newSession, ...bookedSessions])
    toast.success(`Đặt lịch thành công cùng ${selectedTrainer}!`)
  }

  const handleCheckInSession = (id: string) => {
    setBookedSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'checked-in' } : s))
    )
    toast.success('Hội viên đã điểm danh thành công qua máy quẹt thẻ!')
  }

  return (
    <div className="space-y-10">
      {/* FLOW 1: PackagePicker With Gallery Lightbox */}
      <ComponentPlaygroundCard
        id="flow-package-picker"
        title="Flow 1: Trình chọn gói tập & Lightbox Gallery (PackagePicker)"
        description="Widget chọn gói tập thực tế tích hợp danh sách quyền lợi, tính giá tiền VND và Lightbox xem ảnh phòng tập."
        badge="Domain Component"
        codeSnippet={`<PackagePicker\n  packages={packages}\n  selectedId={selectedId}\n  onSelect={pkgId => setSelectedId(pkgId)}\n  startDate={new Date()}\n  endDate={new Date(Date.now() + 365 * 86400000)}\n  endDateLabel="23/08/2027"\n  onContinue={handleContinue}\n/>`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Chọn gói hội viên phù hợp với bạn:
            </span>
            <span className="text-xs text-[var(--rogym-teal)] font-medium">
              Đang chọn: <strong>{selectedPkg.name}</strong>
            </span>
          </div>

          {/* Real PackagePicker Component */}
          <PackagePicker
            packages={SHOWCASE_PACKAGES}
            selectedId={selectedPkgId}
            onSelect={(pkgId: string) => {
              setSelectedPkgId(pkgId)
              const found = SHOWCASE_PACKAGES.find((p) => p.packageId === pkgId)
              if (found) {
                toast.info(`Đã chọn gói: ${found.name}`)
              }
            }}
            startDate={new Date()}
            endDate={new Date(Date.now() + selectedPkg.durationDays * 86400000)}
            endDateLabel={`Hạn dùng: ${selectedPkg.durationDays} ngày`}
            onContinue={() => {
              setCheckoutPkgId(selectedPkg.packageId)
              toast.success(`Chuyển ${selectedPkg.name} sang giỏ thanh toán!`)
            }}
          />

          {/* Package Details Bar */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider">Chi phí thanh toán dự kiến:</p>
              <h3 className="text-2xl font-extrabold text-[var(--rogym-teal)]">
                {formatVnd(Number(selectedPkg.price))}
                <span className="text-xs text-white/50 font-normal ml-1">
                  / {selectedPkg.durationDays} ngày
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setCheckoutPkgId(selectedPkg.packageId)
                  toast.success(`Chuyển ${selectedPkg.name} sang giỏ thanh toán!`)
                }}
              >
                Tiếp tục thanh toán
              </Button>
            </div>
          </div>
        </div>
      </ComponentPlaygroundCard>

      {/* FLOW 2: Exercise Library With Hover GIF */}
      <ComponentPlaygroundCard
        id="flow-exercise-library"
        title="Flow 2: Thư viện bài tập tương tác (ExerciseCard)"
        description="Lưới bài tập thể hình trực quan, tự động chạy ảnh động GIF khi rê chuột và xem chi tiết kỹ thuật thực hiện."
        badge="Domain Component"
        controls={
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/60">Lọc theo nhóm cơ:</span>
            <Select
              value={muscleFilter}
              onValueChange={(val) => setMuscleFilter(val)}
              className="w-48 text-xs"
            >
              <option value="all">Tất cả nhóm cơ (4)</option>
              <option value="Ngực">Ngực (Chest)</option>
              <option value="Chân">Chân & Đùi (Legs)</option>
              <option value="Lưng">Lưng & Xô (Back)</option>
              <option value="Vai">Vai (Shoulders)</option>
            </Select>
          </div>
        }
        codeSnippet={`<ExerciseCard\n  exercise={exercise}\n  onClick={() => openModal(exercise)}\n/>`}
      >
        <div className="space-y-6">
          <p className="text-xs text-white/60">
            💡 <em>Mẹo: Rê chuột (Hover) lên bất kỳ thẻ bài tập nào để xem ảnh động GIF hướng dẫn động tác!</em>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.exerciseId}
                exercise={exercise}
                onClick={() => setActiveExerciseModal(exercise)}
              />
            ))}
          </div>
        </div>

        {/* Exercise Details Modal */}
        <Modal
          open={!!activeExerciseModal}
          onClose={() => setActiveExerciseModal(null)}
          size="lg"
          title={activeExerciseModal?.name || 'Chi tiết bài tập'}
          description={`Nhóm cơ chính: ${activeExerciseModal?.bodyPart?.name} • Dụng cụ: ${activeExerciseModal?.equipment?.name}`}
          footer={
            <Button variant="secondary" onClick={() => setActiveExerciseModal(null)}>
              Đóng
            </Button>
          }
        >
          {activeExerciseModal && (
            <div className="space-y-4 py-2 text-sm text-white/80">
              <p className="text-white/90">{activeExerciseModal.description}</p>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--rogym-teal)] mb-2">
                  Hướng dẫn kỹ thuật thực hiện chuẩn:
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-white/70">
                  {activeExerciseModal.instructions?.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs">
                <Badge tone="accent">Khuyến nghị: 4 hiệp x 8-12 lần</Badge>
                <Badge tone="muted">Nghỉ giữa hiệp: 60-90 giây</Badge>
              </div>
            </div>
          )}
        </Modal>
      </ComponentPlaygroundCard>

      {/* FLOW 3: PT Session Booking & Check-in */}
      <ComponentPlaygroundCard
        id="flow-pt-booking"
        title="Flow 3: Đặt lịch PT & Điểm danh buổi tập (Booking & Attendance)"
        description="Mô phỏng quy trình hội viên đặt lịch với huấn luyện viên và nhân viên lễ tân xác nhận điểm danh."
        badge="Gym Interaction"
        codeSnippet={`<TimeSlotPicker slots={slots} selectedSlot={slot} onSelectSlot={setSlot} />`}
      >
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Booking Column */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar size={16} className="text-[var(--rogym-teal)]" />
              <span>Bước 1: Chọn Huấn luyện viên & Khung giờ</span>
            </h4>

            <FormField label="Chọn Huấn luyện viên cá nhân">
              <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                <option value="Alex Mercer (Master PT)">Alex Mercer (Master PT - Chuyên tăng cơ)</option>
                <option value="Sarah Jenkins (Yoga & Pilates)">Sarah Jenkins (Yoga & Giảm mỡ toàn thân)</option>
                <option value="David Nguyễn (Powerlifting)">David Nguyễn (Chuyên gia Powerlifting)</option>
              </Select>
            </FormField>

            <FormField label="Khung giờ tập ngày 23/08/2026">
              <TimeSlotPicker
                slots={SHOWCASE_TIME_SLOTS}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            </FormField>

            <Button fullWidth variant="primary" onClick={handleBookSession} leftIcon={<Sparkles size={16} />}>
              Xác nhận Đặt Lịch PT
            </Button>
          </div>

          {/* Attendance Column */}
          <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8 pt-6 lg:pt-0">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <QrCode size={16} className="text-emerald-400" />
              <span>Bước 2: Danh sách lịch hẹn & Điểm danh</span>
            </h4>

            <div className="space-y-3">
              {bookedSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{session.trainer}</span>
                      <StatusBadge
                        status={session.status === 'checked-in' ? 'checked-in' : 'pending'}
                        label={session.status === 'checked-in' ? 'Đã điểm danh' : 'Chờ tập'}
                      />
                    </div>
                    <p className="text-white/60 flex items-center gap-1.5">
                      <Clock size={12} /> {session.time} • <MapPin size={12} /> {session.room}
                    </p>
                  </div>

                  <div>
                    {session.status === 'scheduled' ? (
                      <Button
                        size="xs"
                        variant="outline-green"
                        onClick={() => handleCheckInSession(session.id)}
                        leftIcon={<CheckCircle2 size={13} />}
                      >
                        Điểm danh
                      </Button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={14} /> Hoàn tất
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ComponentPlaygroundCard>

      {/* FLOW 4: Weight & Student Progress Charts */}
      <ComponentPlaygroundCard
        id="flow-charts"
        title="Flow 4: Biểu đồ theo dõi cân nặng & Thể lực (Recharts)"
        description="Trực quan hóa tiến trình giảm mỡ của hội viên và chỉ số BMI học viên của huấn luyện viên."
        badge="Data Visualization"
        controls={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/60">Mốc thời gian:</span>
            {(['3m', '6m', '1y'] as const).map((range) => (
              <Button
                key={range}
                size="xs"
                variant={chartRange === range ? 'primary' : 'outline-white'}
                onClick={() => {
                  setChartRange(range)
                  toast.info(`Lọc dữ liệu biểu đồ: ${range.toUpperCase()}`)
                }}
              >
                {range === '3m' ? '3 Tháng' : range === '6m' ? '6 Tháng' : '1 Năm'}
              </Button>
            ))}
          </div>
        }
        codeSnippet={`<MemberWeightChart data={weightData} />\n<StudentProgressChart data={progressData} />`}
      >
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Member Weight Chart */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Biến động Cân nặng Hội viên (kg)</h4>
                <p className="text-xs text-white/50">Hội viên: Nguyễn Văn An (Mục tiêu: 70kg)</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-end">
                  <TrendingDown size={14} /> -6.5 kg
                </span>
                <span className="text-[11px] text-white/40">trong 6 tháng qua</span>
              </div>
            </div>
            <div className="h-60">
              <MemberWeightChart data={SHOWCASE_WEIGHT_DATA} />
            </div>
          </div>

          {/* Trainer Student Progress Chart */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Tiến độ Thể lực Học viên PT</h4>
                <p className="text-xs text-white/50">Chỉ số Cân nặng & BMI theo từng tuần</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--rogym-teal)] font-bold flex items-center gap-1 justify-end">
                  <TrendingUp size={14} /> BMI: -1.4
                </span>
                <span className="text-[11px] text-white/40">cải thiện rõ rệt</span>
              </div>
            </div>
            <div className="h-60">
              <StudentProgressChart data={SHOWCASE_STUDENT_PROGRESS} />
            </div>
          </div>
        </div>
      </ComponentPlaygroundCard>

      {/* FLOW 5: Quick Invoice Checkout & Payment Methods */}
      <ComponentPlaygroundCard
        id="flow-checkout"
        title="Flow 5: Thanh toán hóa đơn & Xuất biên lai (Quick Checkout)"
        description="Mô phỏng quy trình lễ tân tạo hóa đơn thanh toán gói tập, áp dụng mã voucher và in biên lai."
        badge="POS Checkout"
        codeSnippet={`<RadioGroup value={method} onValueChange={setMethod}>\n  <RadioCard value="vnpay" title="VNPay QR" />\n</RadioGroup>`}
      >
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <FormField label="Chọn gói tập thanh toán">
              <Select value={checkoutPkgId} onValueChange={setCheckoutPkgId}>
                {SHOWCASE_PACKAGES.map((pkg) => (
                  <option key={pkg.packageId} value={pkg.packageId}>
                    {pkg.name} — {formatVnd(Number(pkg.price))}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Chọn phương thức thanh toán">
              <RadioGroup
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as 'vnpay' | 'momo' | 'cash' | 'card')}
                className="grid grid-cols-2 gap-3"
              >
                <RadioCard
                  value="vnpay"
                  title="VNPay QR Code"
                  description="Quét mã QR qua mọi ứng dụng ngân hàng"
                  badge="Khuyên dùng"
                  icon={<QrCode size={18} className="text-sky-400" />}
                />
                <RadioCard
                  value="momo"
                  title="Ví điện tử MoMo"
                  description="Thanh toán tức thì không tiền mặt"
                  icon={<Sparkles size={18} className="text-pink-400" />}
                />
                <RadioCard
                  value="cash"
                  title="Tiền mặt tại quầy"
                  description="Thu tiền trực tiếp từ hội viên"
                  icon={<Receipt size={18} className="text-emerald-400" />}
                />
                <RadioCard
                  value="card"
                  title="Quẹt thẻ POS"
                  description="Hỗ trợ thẻ Visa, Master, ATM"
                  icon={<CreditCard size={18} className="text-amber-400" />}
                />
              </RadioGroup>
            </FormField>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <FormField label="Mã khuyến mãi / Voucher giảm giá">
                  <Input
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Nhập mã voucher (vd: ROGYM2026)..."
                    leftIcon={<Tag size={16} />}
                  />
                </FormField>
              </div>
              <Button
                variant={discountApplied ? 'secondary' : 'primary'}
                onClick={() => {
                  if (discountCode.toUpperCase() === 'ROGYM2026') {
                    setDiscountApplied(true)
                    toast.success('Áp dụng mã giảm 10% thành công!')
                  } else {
                    toast.error('Mã giảm giá không hợp lệ!')
                  }
                }}
              >
                {discountApplied ? 'Đã áp dụng' : 'Áp dụng'}
              </Button>
            </div>
          </div>

          {/* Invoice Summary Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs uppercase font-bold text-white/70">Tóm tắt hóa đơn</span>
                <Badge tone="accent">#INV-2026-981</Badge>
              </div>

              <div className="space-y-2.5 py-4 text-xs text-white/70">
                <div className="flex justify-between">
                  <span>Hội viên:</span>
                  <strong className="text-white">Nguyễn Văn An</strong>
                </div>
                <div className="flex justify-between">
                  <span>Gói đăng ký:</span>
                  <span className="text-white text-right font-medium">{checkoutPkg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Đơn giá niêm yết:</span>
                  <span className="text-white">{formatVnd(basePrice)}</span>
                </div>
                {discountApplied && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Ưu đãi (Voucher 10%):</span>
                    <span>- {formatVnd(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Thuế VAT:</span>
                  <span className="text-white">Đã bao gồm (0%)</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-bold text-white">Tổng thanh toán:</span>
                <span className="text-xl font-extrabold text-[var(--rogym-teal)]">
                  {formatVnd(finalPrice)}
                </span>
              </div>
            </div>

            <Button
              fullWidth
              variant="primary"
              onClick={() => setReceiptModalOpen(true)}
              leftIcon={<FileCheck size={16} />}
            >
              Xác nhận Thanh toán & In biên lai
            </Button>
          </div>
        </div>

        {/* Receipt Modal */}
        <Modal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          size="md"
          title="Hóa đơn thanh toán dịch vụ RoGym"
          description="Giao dịch đã được ghi nhận thành công vào sổ cái hệ thống."
          footer={
            <div className="flex gap-2 justify-end w-full">
              <Button variant="secondary" onClick={() => setReceiptModalOpen(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setReceiptModalOpen(false)
                  toast.success('Đã gửi hóa đơn điện tử qua Email hội viên!')
                }}
              >
                In / Gửi Email
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-3 text-xs text-white/80 bg-black/30 p-4 rounded-xl border border-white/10 font-mono">
            <div className="text-center pb-2 border-b border-dashed border-white/20">
              <h4 className="font-bold text-sm text-white">HỆ THỐNG GYM CAO CẤP ROGYM</h4>
              <p className="text-[11px] text-white/50">Chi nhánh Quận 1, TP. Hồ Chí Minh</p>
            </div>
            <div className="space-y-1">
              <p>Mã hóa đơn: #INV-2026-981</p>
              <p>Thời gian: 23/08/2026 09:30:15</p>
              <p>Khách hàng: Nguyễn Văn An (MEM-001)</p>
              <p>Phương thức: {paymentMethod.toUpperCase()}</p>
            </div>
            <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-bold text-white text-sm">
              <span>TỔNG CỘNG:</span>
              <span className="text-[var(--rogym-teal)]">{formatVnd(finalPrice)}</span>
            </div>
          </div>
        </Modal>
      </ComponentPlaygroundCard>

      {/* FLOW 6: Notification Center */}
      <ComponentPlaygroundCard
        id="flow-notifications"
        title="Flow 6: Trung tâm thông báo hệ thống (Notification Center)"
        description="Mô phỏng hộp thư thông báo đẩy cho hội viên và huấn luyện viên kèm trạng thái đọc/chưa đọc."
        badge="Real-time Center"
        codeSnippet={`<NotificationBell notifications={list} />`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="dark" size="sm" leftIcon={<Bell size={16} />}>
                  Hộp thông báo
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-white/60">
                ({unreadCount} thông báo chưa đọc)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline-white"
                onClick={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
                  toast.success('Đã đánh dấu tất cả là đã đọc!')
                }}
              >
                Đánh dấu đã đọc tất cả
              </Button>
              <Button
                size="xs"
                variant="primary"
                onClick={() => {
                  const newNotif = {
                    id: `notif_${Date.now()}`,
                    title: 'Lịch tập PT mới được tạo',
                    message: 'HLV Alex Mercer vừa lên lịch tập mới cho bạn vào 08:00 sáng mai.',
                    time: 'Vừa xong',
                    unread: true,
                    tone: 'info' as const,
                  }
                  setNotifications([newNotif, ...notifications])
                  toast.info('Nhận 1 thông báo mới!')
                }}
              >
                Gửi thông báo giả lập
              </Button>
            </div>
          </div>

          <div className="space-y-2.5">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
                  )
                }}
                className={`flex items-start justify-between p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  item.unread
                    ? 'bg-white/[0.05] border-[var(--rogym-teal)]/40 hover:bg-white/[0.08]'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                <div className="space-y-1 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    {item.unread && <span className="h-2 w-2 rounded-full bg-[var(--rogym-teal)]" />}
                    <h5 className="text-xs font-semibold text-white">{item.title}</h5>
                  </div>
                  <p className="text-xs text-white/70">{item.message}</p>
                </div>
                <span className="text-[11px] text-white/40 shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </ComponentPlaygroundCard>
    </div>
  )
}
