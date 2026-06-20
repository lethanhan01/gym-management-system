import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Eye,
  FileDown,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  WalletCards,
} from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'
import { Button } from '@/components/ui/Button'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerModal,
  OwnerPage,
  OwnerPageHeader,
  OwnerPagination,
  OwnerSelect,
  OwnerSkeleton,
  OwnerStatCard,
} from '@/components/OwnerUI'
import { formatVnd } from '@/lib/currency'
import { formatDateTime, monthStart, todayInput } from '@/lib/date'
import { getApiError } from '@/lib/api-error'
import paymentService, {
  type ListPaymentsParams,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from '@/services/payment.service'

const PAGE_SIZE = 12
const EXPORT_PAGE_SIZE = 100

const PAYMENT_METHOD_OPTIONS: Array<{ value: '' | PaymentMethod; label: string }> = [
  { value: '', label: 'Mọi phương thức' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_card', label: 'Thẻ ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
]

const PAYMENT_STATUS_OPTIONS: Array<{ value: '' | PaymentStatus; label: string }> = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'success', label: 'Thành công' },
  { value: 'failed', label: 'Thất bại' },
]

const SORT_OPTIONS = [
  { value: 'paid_at:desc', label: 'Mới nhất' },
  { value: 'paid_at:asc', label: 'Cũ nhất' },
  { value: 'amount:desc', label: 'Số tiền giảm dần' },
  { value: 'amount:asc', label: 'Số tiền tăng dần' },
]

function paymentStatusLabel(status: PaymentStatus): string {
  return status === 'success' ? 'Thành công' : 'Thất bại'
}

function paymentStatusTone(status: PaymentStatus): 'success' | 'danger' {
  return status === 'success' ? 'success' : 'danger'
}

function transactionCode(payment: Payment): string {
  return payment.transactionReference || `PAY-${payment.paymentId.padStart(6, '0')}`
}

function memberName(payment: Payment): string {
  return payment.member?.fullName ?? `Hội viên #${payment.memberId}`
}

function memberCode(payment: Payment): string {
  return payment.member?.memberCode ?? `ID ${payment.memberId}`
}

function serviceName(payment: Payment): string {
  return payment.service?.name ?? payment.packageName
}

function staffName(payment: Payment): string {
  return payment.staff?.fullName ?? 'Chưa phân công'
}

function staffCode(payment: Payment): string {
  return payment.staff?.staffCode ?? '—'
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function excelStringCell(value: string, styleId?: string): string {
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

function excelNumberCell(value: number, styleId?: string): string {
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="Number">${Number.isFinite(value) ? value : 0}</Data></Cell>`
}

function paymentListExcelXml(
  rows: Payment[],
  filters: { from: string; to: string; method: string; status: string; sort: string },
): string {
  const header = [
    'Ngày thanh toán',
    'Mã giao dịch',
    'Hội viên',
    'Dịch vụ/gói',
    'Số tiền',
    'Phương thức',
    'Trạng thái',
    'Nhân viên phụ trách',
  ]
  const filterText = [
    `Từ ngày: ${filters.from || 'Tất cả'}`,
    `Đến ngày: ${filters.to || 'Tất cả'}`,
    `Phương thức: ${filters.method || 'Mọi phương thức'}`,
    `Trạng thái: ${filters.status || 'Mọi trạng thái'}`,
    `Sắp xếp: ${filters.sort}`,
  ].join(' | ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16"/></Style>
    <Style ss:ID="Meta"><Font ss:Color="#66756D"/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DDF4EA" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Amount"><NumberFormat ss:Format="#,##0"/></Style>
  </Styles>
  <Worksheet ss:Name="Hoa don giao dich">
    <Table>
      <Column ss:Width="150"/>
      <Column ss:Width="150"/>
      <Column ss:Width="190"/>
      <Column ss:Width="190"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="110"/>
      <Column ss:Width="190"/>
      <Row>${excelStringCell('Danh sách hóa đơn giao dịch', 'Title')}</Row>
      <Row>${excelStringCell(filterText, 'Meta')}</Row>
      <Row/>
      <Row>${header.map((cell) => excelStringCell(cell, 'Header')).join('')}</Row>
      ${rows
        .map((payment) => {
          const cells = [
            excelStringCell(formatDateTime(payment.paidAt)),
            excelStringCell(transactionCode(payment)),
            excelStringCell(`${memberName(payment)} (${memberCode(payment)})`),
            excelStringCell(serviceName(payment)),
            excelNumberCell(Number(payment.amount), 'Amount'),
            excelStringCell(getPaymentMethodLabel(payment.method)),
            excelStringCell(paymentStatusLabel(payment.status)),
            excelStringCell(`${staffName(payment)} (${staffCode(payment)})`),
          ]
          return `<Row>${cells.join('')}</Row>`
        })
        .join('')}
    </Table>
  </Worksheet>
</Workbook>`
}

function downloadPaymentListExcel(
  rows: Payment[],
  filters: { from: string; to: string; method: string; status: string; sort: string },
) {
  const blob = new Blob([paymentListExcelXml(rows, filters)], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `danh-sach-hoa-don-${filters.from || 'all'}-${filters.to || 'all'}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rogym-detail-item">
      <span className="rogym-detail-item__label">{label}</span>
      <span className="rogym-detail-item__value">{value}</span>
    </div>
  )
}

export default function TransactionInvoicesPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [method, setMethod] = useState<'' | PaymentMethod>('')
  const [status, setStatus] = useState<'' | PaymentStatus>('')
  const [sort, setSort] = useState('paid_at:desc')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const buildListParams = useCallback(
    (targetPage: number, pageSize: number): ListPaymentsParams => ({
      page: targetPage,
      pageSize,
      from,
      to,
      method: method || undefined,
      status: status || undefined,
      sort,
    }),
    [from, method, sort, status, to],
  )

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      setError(null)
      try {
        const result = await paymentService.list(buildListParams(targetPage, PAGE_SIZE))
        setPayments(result.data)
        setTotalItems(result.meta.totalItems)
        setTotalPages(result.meta.totalPages)
      } catch (err) {
        setError(getApiError(err, 'Không thể tải danh sách hóa đơn giao dịch.'))
      } finally {
        setLoading(false)
      }
    },
    [buildListParams, page],
  )

  const handleExportList = useCallback(async () => {
    setExporting(true)
    setExportError(null)
    try {
      const firstPage = await paymentService.list(buildListParams(1, EXPORT_PAGE_SIZE))
      if (firstPage.meta.totalItems === 0) {
        setExportError('Không có hóa đơn nào phù hợp với bộ lọc hiện tại.')
        return
      }

      const allRows = [...firstPage.data]
      for (let nextPage = 2; nextPage <= firstPage.meta.totalPages; nextPage += 1) {
        const nextResult = await paymentService.list(buildListParams(nextPage, EXPORT_PAGE_SIZE))
        allRows.push(...nextResult.data)
      }

      downloadPaymentListExcel(allRows, {
        from,
        to,
        method:
          PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
          'Mọi phương thức',
        status:
          PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
          'Mọi trạng thái',
        sort: SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort,
      })
    } catch (err) {
      setExportError(getApiError(err, 'Không thể xuất danh sách hóa đơn.'))
    } finally {
      setExporting(false)
    }
  }, [buildListParams, from, method, sort, status, to])

  useEffect(() => {
    load(page)
  }, [load, page])

  function resetToFirstPage() {
    setPage(1)
  }

  const pageTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments],
  )
  const refundableCount = payments.filter((payment) => payment.canRefund).length

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Danh sách hóa đơn giao dịch"
        description="Theo dõi chi tiết thanh toán, xuất hóa đơn và kiểm tra điều kiện hoàn tiền."
        actions={
          <Button
            variant="outline-white"
            onClick={handleExportList}
            disabled={totalItems === 0}
            loading={exporting}
            aria-label="Xuất danh sách hóa đơn theo bộ lọc hiện tại"
            title="Xuất danh sách hóa đơn theo bộ lọc hiện tại"
          >
            <FileDown size={16} />
            Xuất danh sách hóa đơn
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <OwnerStatCard
          icon={<ReceiptText size={18} />}
          label="Tổng giao dịch"
          value={String(totalItems)}
          hint="Theo bộ lọc hiện tại"
          accent
        />
        <OwnerStatCard
          icon={<WalletCards size={18} />}
          label="Tổng tiền trang này"
          value={formatVnd(pageTotal)}
          hint={`${payments.length} giao dịch đang hiển thị`}
        />
        <OwnerStatCard
          icon={<RotateCcw size={18} />}
          label="Có thể hoàn tiền"
          value={String(refundableCount)}
          hint="Giao dịch thành công trong trang này"
        />
      </div>

      <div className="rogym-card rogym-card--compact rogym-report-filter p-5">
        <label className="block space-y-2">
          <span className="rogym-field-label">Từ ngày</span>
          <DatePickerInput
            value={from}
            max={to}
            onChange={(value) => {
              setFrom(value)
              resetToFirstPage()
            }}
            aria-label="Từ ngày"
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Đến ngày</span>
          <DatePickerInput
            value={to}
            min={from}
            max={todayInput()}
            onChange={(value) => {
              setTo(value)
              resetToFirstPage()
            }}
            aria-label="Đến ngày"
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Phương thức</span>
          <OwnerSelect
            value={method}
            onValueChange={(value) => {
              setMethod(value as '' | PaymentMethod)
              resetToFirstPage()
            }}
            ariaLabel="Phương thức thanh toán"
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Trạng thái</span>
          <OwnerSelect
            value={status}
            onValueChange={(value) => {
              setStatus(value as '' | PaymentStatus)
              resetToFirstPage()
            }}
            ariaLabel="Trạng thái thanh toán"
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Sắp xếp</span>
          <OwnerSelect
            value={sort}
            onValueChange={(value) => {
              setSort(value)
              resetToFirstPage()
            }}
            ariaLabel="Sắp xếp giao dịch"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary self-end"
          onClick={() => load(page)}
          disabled={loading}
        >
          {loading && <LoaderCircle size={15} className="animate-spin" />}
          Tải lại
        </button>
      </div>

      {exportError && (
        <div className="rogym-error-alert" role="alert">
          {exportError}
        </div>
      )}

      {loading && payments.length === 0 ? (
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => load(page)} />
      ) : payments.length === 0 ? (
        <OwnerEmptyState
          title="Không có giao dịch"
          description="Thử thay đổi khoảng ngày, phương thức hoặc trạng thái thanh toán."
        />
      ) : (
        <>
          <div className="rogym-owner-table-wrap">
            <table className="rogym-owner-table">
              <thead>
                <tr>
                  <th>Ngày thanh toán</th>
                  <th>Mã giao dịch</th>
                  <th>Hội viên</th>
                  <th>Dịch vụ/gói</th>
                  <th className="is-right">Số tiền</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Nhân viên phụ trách</th>
                  <th className="is-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.paymentId}>
                    <td>
                      <span className="rogym-owner-table__primary">
                        {formatDateTime(payment.paidAt)}
                      </span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__mono">{transactionCode(payment)}</span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__primary">{memberName(payment)}</span>
                      <span className="rogym-owner-table__secondary">{memberCode(payment)}</span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__primary">{serviceName(payment)}</span>
                      <span className="rogym-owner-table__secondary">
                        Gói {payment.service?.packageCode ?? payment.subscriptionId}
                      </span>
                    </td>
                    <td className="is-right">
                      <span className="rogym-owner-table__amount">
                        {formatVnd(payment.amount)}
                      </span>
                    </td>
                    <td>
                      <span className="rogym-method-pill">
                        <PaymentMethodIcon method={payment.method} size={15} />
                        {getPaymentMethodLabel(payment.method, true)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="rogym-tone-badge is-compact"
                        data-tone={paymentStatusTone(payment.status)}
                      >
                        {paymentStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__primary">{staffName(payment)}</span>
                      <span className="rogym-owner-table__secondary">{staffCode(payment)}</span>
                    </td>
                    <td className="is-right">
                      <div className="rogym-owner-table__actions">
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                          onClick={() => setSelectedPayment(payment)}
                          aria-label={`Xem chi tiết giao dịch ${transactionCode(payment)}`}
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OwnerPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <OwnerModal
        open={selectedPayment !== null}
        title="Chi tiết giao dịch"
        onClose={() => setSelectedPayment(null)}
        size="2xl"
        footer={
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => setSelectedPayment(null)}
          >
            Đóng
          </button>
        }
      >
        {selectedPayment && (
          <div className="rogym-detail-grid">
            <DetailItem label="Ngày thanh toán" value={formatDateTime(selectedPayment.paidAt)} />
            <DetailItem label="Mã giao dịch" value={transactionCode(selectedPayment)} />
            <DetailItem
              label="Hội viên"
              value={`${memberName(selectedPayment)} (${memberCode(selectedPayment)})`}
            />
            <DetailItem label="Dịch vụ/gói" value={serviceName(selectedPayment)} />
            <DetailItem label="Số tiền" value={formatVnd(selectedPayment.amount)} />
            <DetailItem
              label="Phương thức"
              value={getPaymentMethodLabel(selectedPayment.method)}
            />
            <DetailItem label="Trạng thái" value={paymentStatusLabel(selectedPayment.status)} />
            <DetailItem
              label="Nhân viên phụ trách"
              value={`${staffName(selectedPayment)} (${staffCode(selectedPayment)})`}
            />
            <DetailItem
              label="Subscription"
              value={`#${selectedPayment.service?.subscriptionId ?? selectedPayment.subscriptionId}`}
            />
          </div>
        )}
      </OwnerModal>

    </OwnerPage>
  )
}
