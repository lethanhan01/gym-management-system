import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, FileDown, LoaderCircle, ReceiptText, RotateCcw, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DatePickerInput } from '@/components/ui'
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
type Translate = (key: string, opts?: Record<string, unknown>) => string

function paymentStatusTone(status: PaymentStatus): 'success' | 'danger' {
  return status === 'success' ? 'success' : 'danger'
}

function transactionCode(payment: Payment): string {
  return payment.transactionReference || `PAY-${payment.paymentId.padStart(6, '0')}`
}

function memberName(payment: Payment, t: Translate): string {
  return payment.member?.fullName ?? t('reports.invoices.memberFallback', { id: payment.memberId })
}

function memberCode(payment: Payment): string {
  return payment.member?.memberCode ?? `ID ${payment.memberId}`
}

function serviceName(payment: Payment): string {
  return payment.service?.name ?? payment.packageName
}

function paymentMethodLabel(method: PaymentMethod, t: Translate): string {
  if (method === 'cash') return t('reports.revenue.paymentMethod.cash')
  if (method === 'bank_card') return t('reports.invoices.methodBankCard')
  if (method === 'ewallet') return t('reports.invoices.methodEwallet')
  return method
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
  staffNameFn: (p: Payment) => string,
  statusLabelFn: (s: PaymentStatus) => string,
  t: Translate
): string {
  const header = [
    t('reports.invoices.export.colDate'),
    t('reports.invoices.export.colId'),
    t('reports.invoices.export.colMember'),
    t('reports.invoices.export.colPackage'),
    t('reports.invoices.export.colAmount'),
    t('reports.invoices.export.colMethod'),
    t('reports.invoices.export.colStatus'),
    t('reports.invoices.export.colStaff'),
  ]
  const filterText = [
    t('reports.invoices.export.filterFrom', {
      value: filters.from || t('reports.revenue.paymentMethod.all'),
    }),
    t('reports.invoices.export.filterTo', {
      value: filters.to || t('reports.revenue.paymentMethod.all'),
    }),
    t('reports.invoices.export.filterMethod', { value: filters.method }),
    t('reports.invoices.export.filterStatus', { value: filters.status }),
    t('reports.invoices.export.filterSort', { value: filters.sort }),
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
  <Worksheet ss:Name="${escapeXml(t('reports.invoices.export.worksheetName'))}">
    <Table>
      <Column ss:Width="150"/>
      <Column ss:Width="150"/>
      <Column ss:Width="190"/>
      <Column ss:Width="190"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="110"/>
      <Column ss:Width="190"/>
      <Row>${excelStringCell(t('reports.invoices.exportSheetTitle'), 'Title')}</Row>
      <Row>${excelStringCell(filterText, 'Meta')}</Row>
      <Row/>
      <Row>${header.map((cell) => excelStringCell(cell, 'Header')).join('')}</Row>
      ${rows
        .map((payment) => {
          const cells = [
            excelStringCell(formatDateTime(payment.paidAt)),
            excelStringCell(transactionCode(payment)),
            excelStringCell(`${memberName(payment, t)} (${memberCode(payment)})`),
            excelStringCell(serviceName(payment)),
            excelNumberCell(Number(payment.amount), 'Amount'),
            excelStringCell(paymentMethodLabel(payment.method, t)),
            excelStringCell(statusLabelFn(payment.status)),
            excelStringCell(`${staffNameFn(payment)} (${staffCode(payment)})`),
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
  staffNameFn: (p: Payment) => string,
  statusLabelFn: (s: PaymentStatus) => string,
  t: Translate
) {
  const blob = new Blob([paymentListExcelXml(rows, filters, staffNameFn, statusLabelFn, t)], {
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
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')
  const translate = t as Translate

  const PAYMENT_METHOD_OPTIONS: Array<{ value: '' | PaymentMethod; label: string }> = [
    { value: '', label: t('reports.revenue.paymentMethod.all') },
    { value: 'cash', label: t('reports.revenue.paymentMethod.cash') },
    { value: 'bank_card', label: t('reports.invoices.methodBankCard') },
    { value: 'ewallet', label: t('reports.invoices.methodEwallet') },
  ]

  const PAYMENT_STATUS_OPTIONS: Array<{ value: '' | PaymentStatus; label: string }> = [
    { value: '', label: t('reports.invoices.filterStatus.all') },
    { value: 'success', label: t('reports.invoices.filterStatus.success') },
    { value: 'failed', label: t('reports.invoices.filterStatus.failed') },
  ]

  const SORT_OPTIONS = [
    { value: 'paid_at:desc', label: t('reports.invoices.sort.newest') },
    { value: 'paid_at:asc', label: t('reports.invoices.sort.oldest') },
    { value: 'amount:desc', label: t('reports.invoices.sort.amountDesc') },
    { value: 'amount:asc', label: t('reports.invoices.sort.amountAsc') },
  ]

  function paymentStatusLabel(status: PaymentStatus): string {
    return status === 'success'
      ? t('reports.invoices.status.success')
      : t('reports.invoices.status.failed')
  }

  function staffName(payment: Payment): string {
    return payment.staff?.fullName ?? t('reports.invoices.unassigned')
  }

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
    [from, method, sort, status, to]
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
        setError(getApiError(err, t('reports.invoices.loadFailed')))
      } finally {
        setLoading(false)
      }
    },
    [buildListParams, page, t]
  )

  async function handleExportList() {
    setExporting(true)
    setExportError(null)
    try {
      const firstPage = await paymentService.list(buildListParams(1, EXPORT_PAGE_SIZE))
      if (firstPage.meta.totalItems === 0) {
        setExportError(t('reports.invoices.noMatchingInvoices'))
        return
      }

      const allRows = [...firstPage.data]
      for (let nextPage = 2; nextPage <= firstPage.meta.totalPages; nextPage += 1) {
        const nextResult = await paymentService.list(buildListParams(nextPage, EXPORT_PAGE_SIZE))
        allRows.push(...nextResult.data)
      }

      downloadPaymentListExcel(
        allRows,
        {
          from,
          to,
          method:
            PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
            t('reports.revenue.paymentMethod.all'),
          status:
            PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
            t('reports.invoices.filterStatus.all'),
          sort: SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort,
        },
        staffName,
        paymentStatusLabel,
        translate
      )
    } catch (err) {
      setExportError(getApiError(err, t('reports.invoices.exportFailed')))
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    load(page)
  }, [load, page])

  function resetToFirstPage() {
    setPage(1)
  }

  const pageTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments]
  )
  const refundableCount = payments.filter((payment) => payment.canRefund).length

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow={t('reports.invoices.eyebrow')}
        title={t('reports.invoices.title')}
        description={t('reports.invoices.subtitle')}
        actions={
          <Button
            variant="outline-white"
            onClick={handleExportList}
            disabled={totalItems === 0}
            loading={exporting}
            aria-label={t('reports.invoices.exportBtn')}
            title={t('reports.invoices.exportBtn')}
          >
            <FileDown size={16} />
            {t('reports.invoices.exportBtn')}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <OwnerStatCard
          icon={<ReceiptText size={18} />}
          label={t('reports.invoices.kpi.totalTransactions')}
          value={String(totalItems)}
          hint={t('reports.invoices.byCurrentFilter')}
          accent
        />
        <OwnerStatCard
          icon={<WalletCards size={18} />}
          label={t('reports.invoices.kpi.pageTotal')}
          value={formatVnd(pageTotal)}
          hint={t('reports.invoices.pageTransactionsHint', { count: payments.length })}
        />
        <OwnerStatCard
          icon={<RotateCcw size={18} />}
          label={t('reports.invoices.kpi.refundable')}
          value={String(refundableCount)}
          hint={t('reports.invoices.successInPage')}
        />
      </div>

      <div className="rogym-card rogym-card--compact rogym-report-filter p-5">
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('reports.invoices.filter.from')}</span>
          <DatePickerInput
            value={from}
            max={to}
            onChange={(value) => {
              setFrom(value)
              resetToFirstPage()
            }}
            aria-label={t('reports.invoices.filter.from')}
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('reports.invoices.filter.to')}</span>
          <DatePickerInput
            value={to}
            min={from}
            max={todayInput()}
            onChange={(value) => {
              setTo(value)
              resetToFirstPage()
            }}
            aria-label={t('reports.invoices.filter.to')}
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('reports.invoices.filter.method')}</span>
          <OwnerSelect
            value={method}
            onValueChange={(value) => {
              setMethod(value as '' | PaymentMethod)
              resetToFirstPage()
            }}
            ariaLabel={t('reports.invoices.filter.method')}
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('reports.invoices.filter.status')}</span>
          <OwnerSelect
            value={status}
            onValueChange={(value) => {
              setStatus(value as '' | PaymentStatus)
              resetToFirstPage()
            }}
            ariaLabel={t('reports.invoices.filter.status')}
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('reports.invoices.filter.sort')}</span>
          <OwnerSelect
            value={sort}
            onValueChange={(value) => {
              setSort(value)
              resetToFirstPage()
            }}
            ariaLabel={t('reports.invoices.filter.sort')}
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
          {t('reports.invoices.filter.reload')}
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
          title={t('reports.invoices.noTransactions')}
          description={t('reports.invoices.tryOtherFilter')}
        />
      ) : (
        <>
          <div className="rogym-owner-table-wrap">
            <table className="rogym-owner-table">
              <thead>
                <tr>
                  <th>{t('reports.invoices.table.date')}</th>
                  <th>{t('reports.invoices.table.id')}</th>
                  <th>{t('reports.invoices.table.member')}</th>
                  <th>{t('reports.invoices.table.package')}</th>
                  <th className="is-right">{t('reports.invoices.table.amount')}</th>
                  <th>{t('reports.invoices.table.method')}</th>
                  <th>{t('reports.invoices.table.status')}</th>
                  <th>{t('reports.invoices.table.staff')}</th>
                  <th className="is-right">{t('reports.invoices.table.detail')}</th>
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
                      <span className="rogym-owner-table__primary">
                        {memberName(payment, translate)}
                      </span>
                      <span className="rogym-owner-table__secondary">{memberCode(payment)}</span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__primary">{serviceName(payment)}</span>
                      <span className="rogym-owner-table__secondary">
                        {t('reports.invoices.packageReference', {
                          code: payment.service?.packageCode ?? payment.subscriptionId,
                        })}
                      </span>
                    </td>
                    <td className="is-right">
                      <span className="rogym-owner-table__amount">{formatVnd(payment.amount)}</span>
                    </td>
                    <td>
                      <span className="rogym-method-pill">
                        <PaymentMethodIcon method={payment.method} size={15} />
                        {paymentMethodLabel(payment.method, translate)}
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
                          aria-label={t('reports.invoices.viewDetailAria', {
                            code: transactionCode(payment),
                          })}
                          title={t('reports.invoices.table.detail')}
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
        title={t('reports.invoices.detailModal.title')}
        onClose={() => setSelectedPayment(null)}
        size="2xl"
        footer={
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => setSelectedPayment(null)}
          >
            {tCommon('button.close')}
          </button>
        }
      >
        {selectedPayment && (
          <div className="rogym-detail-grid">
            <DetailItem
              label={t('reports.invoices.table.date')}
              value={formatDateTime(selectedPayment.paidAt)}
            />
            <DetailItem
              label={t('reports.invoices.table.id')}
              value={transactionCode(selectedPayment)}
            />
            <DetailItem
              label={t('reports.invoices.table.member')}
              value={`${memberName(selectedPayment, translate)} (${memberCode(selectedPayment)})`}
            />
            <DetailItem
              label={t('reports.invoices.table.package')}
              value={serviceName(selectedPayment)}
            />
            <DetailItem
              label={t('reports.invoices.table.amount')}
              value={formatVnd(selectedPayment.amount)}
            />
            <DetailItem
              label={t('reports.invoices.table.method')}
              value={paymentMethodLabel(selectedPayment.method, translate)}
            />
            <DetailItem
              label={t('reports.invoices.table.status')}
              value={paymentStatusLabel(selectedPayment.status)}
            />
            <DetailItem
              label={t('reports.invoices.table.staff')}
              value={`${staffName(selectedPayment)} (${staffCode(selectedPayment)})`}
            />
            <DetailItem
              label={t('reports.invoices.subscriptionLabel')}
              value={`#${selectedPayment.service?.subscriptionId ?? selectedPayment.subscriptionId}`}
            />
          </div>
        )}
      </OwnerModal>
    </OwnerPage>
  )
}
