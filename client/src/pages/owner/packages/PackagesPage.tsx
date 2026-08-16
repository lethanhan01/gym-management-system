import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { getApiError, isApiConflict } from '@/lib/api-error'
import { formatVnd } from '@/lib/currency'
import { PACKAGE_STATUS_COLOR } from '@/lib/owner-constants'
import packageService, {
  type Package,
  type CreatePackageDto,
  type ListPackagesParams,
  type UpdatePackageDto,
} from '@/services/package.service'
import {
  Page,
  PageHeader,
  SearchToolbar,
  Select,
  ResponsiveTable,
  Button,
  Modal,
  ConfirmDialog,
  FormField,
  Input,
  Textarea,
  Badge,
  type ColumnDef,
} from '@/components/ui'

const PAGE_SIZE = 20

function PackageModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg?: Package
  onClose: () => void
  onSaved: (p: Package) => void
}) {
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')
  const isEdit = !!pkg
  const [form, setForm] = useState<CreatePackageDto>({
    name: pkg?.name ?? '',
    durationDays: pkg?.durationDays ?? 30,
    price: pkg ? Number(pkg.price) : 500000,
    benefits: pkg?.benefits ?? '',
    status: pkg?.status ?? 'active',
    includesPt: pkg?.includesPt ?? false,
  })

  useEffect(() => {
    setForm({
      name: pkg?.name ?? '',
      durationDays: pkg?.durationDays ?? 30,
      price: pkg ? Number(pkg.price) : 500000,
      benefits: pkg?.benefits ?? '',
      status: pkg?.status ?? 'active',
      includesPt: pkg?.includesPt ?? false,
    })
  }, [pkg])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || form.durationDays <= 0 || form.price <= 0) {
      setError(t('packages.form.fillRequired'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      let saved: Package
      if (isEdit) {
        const payload: UpdatePackageDto = {
          ...(form.name ? { name: form.name } : {}),
          ...(form.durationDays ? { durationDays: form.durationDays } : {}),
          ...(form.price ? { price: form.price } : {}),
          ...(form.benefits !== undefined ? { benefits: form.benefits } : {}),
          ...(form.includesPt !== undefined ? { includesPt: form.includesPt } : {}),
        }
        saved = await packageService.update(pkg.packageId, payload)
        if (form.status && form.status !== pkg.status) {
          saved = await packageService.updateStatus(pkg.packageId, form.status)
        }
      } else {
        saved = await packageService.create(form)
      }
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(getApiError(err, t('packages.form.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={isEdit ? t('packages.modal.editTitle') : t('packages.modal.createTitle')}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="outline-white" onClick={onClose}>
            {tCommon('button.cancel')}
          </Button>
          <Button
            type="submit"
            form="pkg-form"
            variant="primary"
            loading={saving}
          >
            {isEdit ? t('packages.modal.saveChanges') : t('packages.modal.createBtn')}
          </Button>
        </>
      }
    >
      <form id="pkg-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/80">
            {t('packages.form.includesPt')}
          </label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={form.includesPt ? 'primary' : 'outline-white'}
              onClick={() => setForm((f) => ({ ...f, includesPt: true }))}
            >
              {t('packages.form.withPt')}
            </Button>
            <Button
              type="button"
              variant={!form.includesPt ? 'primary' : 'outline-white'}
              onClick={() => setForm((f) => ({ ...f, includesPt: false }))}
            >
              {t('packages.form.withoutPt')}
            </Button>
          </div>
        </div>

        <FormField label={t('packages.form.name')} required>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('packages.form.namePlaceholder')}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('packages.form.duration')} required>
            <Input
              type="number"
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
              min={1}
              max={3650}
              required
            />
          </FormField>
          <FormField label={t('packages.form.price')} required>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
              min={0}
              required
            />
          </FormField>
        </div>

        <FormField label={t('packages.form.benefits')}>
          <Textarea
            rows={3}
            value={form.benefits ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
            placeholder={t('packages.form.benefitsPlaceholder')}
          />
        </FormField>

        {isEdit && (
          <FormField label={t('packages.form.status')} required>
            <Select
              value={form.status ?? 'active'}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as 'active' | 'inactive' }))}
              required
            >
              <option value="active">{t('packages.status.active')}</option>
              <option value="inactive">{t('packages.status.inactive')}</option>
            </Select>
          </FormField>
        )}
      </form>
    </Modal>
  )
}

export default function PackagesPage() {
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')
  const [packages, setPackages] = useState<Package[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ListPackagesParams['status']>('active')

  const [editingPkg, setEditingPkg] = useState<Package | undefined>()
  const [showCreate, setShowCreate] = useState(false)
  const [deletingPkg, setDeletingPkg] = useState<Package | undefined>()
  const [deleting, setDeleting] = useState(false)

  const fetchPackages = useCallback(
    async (pg: number) => {
      setLoading(true)
      setError(null)
      try {
        const params: ListPackagesParams = {
          page: pg,
          pageSize: PAGE_SIZE,
          status: statusFilter,
          search: search || undefined,
        }
        const { data, meta } = await packageService.list(params)
        setPackages(data)
        setTotal(meta.total)
      } catch (err) {
        setError(getApiError(err, t('packages.loadFailed')))
      } finally {
        setLoading(false)
      }
    },
    [search, statusFilter, t]
  )

  useEffect(() => {
    fetchPackages(page)
  }, [fetchPackages, page])

  function handleFilterChange<T extends string>(setter: (v: T) => void, val: T) {
    setter(val)
    setPage(1)
  }

  function handleSaved(pkg: Package) {
    setPackages((prev) =>
      prev.some((p) => p.packageId === pkg.packageId)
        ? prev.map((p) => (p.packageId === pkg.packageId ? pkg : p))
        : [pkg, ...prev]
    )
    setShowCreate(false)
    setEditingPkg(undefined)
  }

  async function handleDeleteConfirm() {
    if (!deletingPkg) return
    setDeleting(true)
    try {
      if (deletingPkg.status === 'active') {
        await packageService.updateStatus(deletingPkg.packageId, 'inactive')
      } else {
        await packageService.delete(deletingPkg.packageId)
      }
      setPackages((prev) => prev.filter((p) => p.packageId !== deletingPkg.packageId))
      setDeletingPkg(undefined)
      fetchPackages(page)
    } catch (err) {
      if (isApiConflict(err)) {
        setError(t('packages.deleteModal.conflictError'))
      } else {
        setError(getApiError(err, t('packages.deleteModal.deleteFailed')))
      }
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: ColumnDef<Package>[] = [
    {
      key: 'code',
      header: t('packages.table.code'),
      render: (pkg) => (
        <span className="font-mono text-xs rogym-text-dim">{pkg.packageCode}</span>
      ),
    },
    {
      key: 'name',
      header: t('packages.table.name'),
      render: (pkg) => <span className="font-semibold text-white">{pkg.name}</span>,
    },
    {
      key: 'duration',
      header: t('packages.table.duration'),
      render: (pkg) => (
        <span className="rogym-text-secondary">
          {t('packages.daysCount', { days: pkg.durationDays })}
        </span>
      ),
    },
    {
      key: 'price',
      header: t('packages.table.price'),
      render: (pkg) => (
        <span className="font-semibold text-[var(--rogym-teal)]">
          {formatVnd(Number(pkg.price))}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('packages.table.status'),
      render: (pkg) => (
        <Badge
          style={{
            borderColor: `${(pkg.deletedAt ? '#6b7280' : PACKAGE_STATUS_COLOR[pkg.status] ?? '#6b7280')}40`,
            color: pkg.deletedAt ? '#6b7280' : (PACKAGE_STATUS_COLOR[pkg.status] ?? '#6b7280'),
          }}
        >
          {pkg.deletedAt
            ? t('packages.deleted')
            : pkg.status === 'active'
              ? t('packages.status.active')
              : pkg.status === 'inactive'
                ? t('packages.status.inactive')
                : pkg.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('packages.table.actions'),
      align: 'right',
      render: (pkg) => (
        <div className="flex items-center justify-end gap-2">
          {pkg.deletedAt ? (
            <span className="text-xs rogym-text-dim">{t('packages.noActions')}</span>
          ) : (
            <>
              <Button
                variant="icon"
                size="compact"
                onClick={() => setEditingPkg(pkg)}
                aria-label={tCommon('button.edit')}
              >
                <Edit2 size={15} />
              </Button>
              <Button
                variant="danger"
                size="compact"
                onClick={() => setDeletingPkg(pkg)}
                aria-label={
                  pkg.status === 'active'
                    ? t('packages.deactivate')
                    : tCommon('button.delete')
                }
              >
                <Trash2 size={15} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={t('packages.eyebrow')}
        title={t('packages.title')}
        description={t('packages.totalCount', { total })}
        actions={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {t('packages.createNew')}
          </Button>
        }
      />

      {/* Filters */}
      <SearchToolbar
        value={search}
        onChange={(v) => handleFilterChange(setSearch, v)}
        placeholder={t('packages.searchPlaceholder')}
        filters={
          <Select
            value={statusFilter ?? 'active'}
            onValueChange={(value) => {
              setStatusFilter(value as ListPackagesParams['status'])
              setPage(1)
            }}
            className="w-full sm:w-[160px]"
            required
          >
            <option value="active">{t('packages.status.active')}</option>
            <option value="inactive">{t('packages.status.inactive')}</option>
          </Select>
        }
      />

      {/* Data Table */}
      <ResponsiveTable
        columns={columns}
        data={packages}
        keyExtractor={(item) => item.packageId}
        loading={loading}
        error={error}
        onRetry={() => fetchPackages(page)}
        emptyTitle={t('packages.notFound')}
        emptyDescription={t('packages.notFoundDesc')}
        emptyAction={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {t('packages.createNew')}
          </Button>
        }
        pagination={
          totalPages > 1
            ? {
                page,
                totalPages,
                onPageChange: setPage,
                totalItems: total,
                pageSize: PAGE_SIZE,
                showItemCount: true,
              }
            : undefined
        }
      />

      {(showCreate || editingPkg) && (
        <PackageModal
          pkg={editingPkg}
          onClose={() => {
            setShowCreate(false)
            setEditingPkg(undefined)
          }}
          onSaved={handleSaved}
        />
      )}

      {deletingPkg && (
        <ConfirmDialog
          open={!!deletingPkg}
          title={t('packages.deleteModal.title')}
          variant="danger"
          loading={deleting}
          onClose={() => setDeletingPkg(undefined)}
          onConfirm={handleDeleteConfirm}
          description={
            deletingPkg.status === 'active'
              ? t('packages.deleteModal.deactivateMsg', { name: deletingPkg.name })
              : t('packages.deleteModal.deleteMsg', { name: deletingPkg.name })
          }
          confirmLabel={
            deletingPkg.status === 'active'
              ? t('packages.deleteModal.deactivateBtn')
              : tCommon('button.delete')
          }
        />
      )}
    </Page>
  )
}
