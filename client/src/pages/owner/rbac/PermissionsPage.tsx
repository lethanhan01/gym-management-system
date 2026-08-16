import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { rbacService, type Permission } from '@/services/rbac.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerSelect,
  OwnerSearchToolbar,
} from '@/components/OwnerUI'

const ACTION_COLOR: Record<string, string> = {
  read: '#3b82f6',
  create: '#22c55e',
  update: '#f59e0b',
  delete: '#ef4444',
  manage: '#8b5cf6',
  view: '#3b82f6',
  handle: '#f97316',
  checkin: '#06bbfb',
  report: '#ec4899',
  resolve: '#06c384',
}

function getActionColor(code: string): string {
  const parts = code.split('.')
  return ACTION_COLOR[parts[1]] ?? '#6b7280'
}

export default function PermissionsPage() {
  const { t } = useTranslation('owner')

  const RESOURCES = [
    { value: '', label: t('rbac.permissions.resources.all') },
    { value: 'user', label: t('rbac.permissions.resources.user') },
    { value: 'member', label: t('rbac.permissions.resources.member') },
    { value: 'staff', label: t('rbac.permissions.resources.staff') },
    { value: 'package', label: t('rbac.permissions.resources.package') },
    { value: 'subscription', label: t('rbac.permissions.resources.subscription') },
    { value: 'payment', label: t('rbac.permissions.resources.payment') },
    { value: 'room', label: t('rbac.permissions.resources.room') },
    { value: 'equipment', label: t('rbac.permissions.resources.equipment') },
    { value: 'maintenance', label: t('rbac.permissions.resources.maintenance') },
    { value: 'session', label: t('rbac.permissions.resources.session') },
    { value: 'attendance', label: t('rbac.permissions.resources.attendance') },
    { value: 'progress', label: t('rbac.permissions.resources.progress') },
    { value: 'feedback', label: t('rbac.permissions.resources.feedback') },
    { value: 'schedule', label: t('rbac.permissions.resources.schedule') },
    { value: 'report', label: t('rbac.permissions.resources.report') },
    { value: 'rbac', label: t('rbac.permissions.resources.rbac') },
  ]

  const ACTION_LABEL: Record<string, string> = {
    read: t('rbac.permissions.actions.read'),
    create: t('rbac.permissions.actions.create'),
    update: t('rbac.permissions.actions.update'),
    delete: t('rbac.permissions.actions.delete'),
    manage: t('rbac.permissions.actions.manage'),
    view: t('rbac.permissions.actions.view'),
    handle: t('rbac.permissions.actions.handle'),
    checkin: t('rbac.permissions.actions.checkin'),
    report: t('rbac.permissions.actions.report'),
    resolve: t('rbac.permissions.actions.resolve'),
  }

  function getAction(code: string): string {
    const parts = code.split('.')
    return ACTION_LABEL[parts[1]] ?? parts[1] ?? ''
  }

  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [resource, setResource] = useState('')

  useEffect(() => {
    setLoading(true)
    rbacService
      .listPermissions({ pageSize: 100, resource: resource || undefined })
      .then(({ data }) => setPermissions(data))
      .catch(() => setError(t('rbac.permissions.loadFailed')))
      .finally(() => setLoading(false))
  }, [resource, t])

  const filtered = permissions.filter(
    (p) =>
      !search ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filtered.reduce<Record<string, Permission[]>>((acc, p) => {
    const resource = p.code.split('.')[0]
    if (!acc[resource]) acc[resource] = []
    acc[resource].push(p)
    return acc
  }, {})

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow={t('rbac.permissions.eyebrow')}
        title={t('rbac.permissions.catalogTitle')}
        description={t('rbac.permissions.totalCount', { count: permissions.length })}
      />

      {/* Filters */}
      <OwnerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={t('rbac.permissions.searchPlaceholder')}
        filters={
          <OwnerSelect
            value={resource}
            onValueChange={setResource}
            className="w-full sm:w-[160px]"
          >
            {RESOURCES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </OwnerSelect>
        }
      />

      {loading ? (
        <OwnerSkeleton rows={8} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <div className="space-y-4 md:space-y-8">
          {Object.entries(grouped).map(([res, perms]) => (
            <div key={res}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider rogym-text-accent">
                  {RESOURCES.find((r) => r.value === res)?.label ?? res}
                </h2>
                <div className="h-px flex-1 border-t border-white/5" />
                <span className="text-xs rogym-text-dim">{t('rbac.permissions.sectionCount', { count: perms.length })}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {perms.map((p) => (
                  <div
                    key={p.permissionId}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <code className="text-xs font-mono rogym-text-accent">{p.code}</code>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background: `${getActionColor(p.code)}22`,
                          color: getActionColor(p.code),
                          border: `1px solid ${getActionColor(p.code)}44`,
                        }}
                      >
                        {getAction(p.code)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    {p.description && (
                      <p className="mt-1 text-xs rogym-text-dim">{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <OwnerEmptyState
              title={t('rbac.permissions.notFound')}
              description={t('rbac.permissions.notFoundDesc')}
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-xs rogym-text-dim">
        <Lock size={14} />
        {t('rbac.permissions.readonlyNote')}
      </div>
    </OwnerPage>
  )
}
