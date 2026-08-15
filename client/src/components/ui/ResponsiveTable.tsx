import { type ReactNode } from 'react'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from './Table'
import { Pagination, type PaginationProps } from './Pagination'
import { PageEmptyState, PageErrorState, PageSkeleton } from '@/components/shared/PageUI'
import { Card } from './Card'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  key: string
  header: ReactNode
  render?: (item: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
  align?: 'left' | 'center' | 'right'
}

export interface ResponsiveTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  keyExtractor: (item: T, index: number) => string | number
  loading?: boolean
  skeletonRows?: number
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  renderMobileCard?: (item: T, index: number) => ReactNode
  pagination?: PaginationProps
  className?: string
  onRowClick?: (item: T) => void
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  skeletonRows = 5,
  error,
  onRetry,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyAction,
  renderMobileCard,
  pagination,
  className,
  onRowClick,
}: ResponsiveTableProps<T>) {
  if (loading) {
    return <PageSkeleton rows={skeletonRows} />
  }

  if (error) {
    return <PageErrorState message={error} onRetry={onRetry} />
  }

  if (!data || data.length === 0) {
    return (
      <PageEmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const key = keyExtractor(item, index)
                return (
                  <TableRow
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'bg-[var(--rogym-bg-card)]',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={`${key}-${col.key}`}
                        className={cn(
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.className
                        )}
                      >
                        {col.render ? col.render(item, index) : (item as Record<string, unknown>)[col.key] as ReactNode}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-3 md:hidden">
        {data.map((item, index) => {
          const key = keyExtractor(item, index)
          if (renderMobileCard) {
            return <div key={key}>{renderMobileCard(item, index)}</div>
          }

          return (
            <Card
              key={key}
              variant="compact"
              onClick={() => onRowClick?.(item)}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              <div className="space-y-2.5">
                {columns.map((col) => (
                  <div
                    key={`${key}-${col.key}`}
                    className="flex items-start justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-xs font-medium rogym-text-dim">{col.header}</span>
                    <div className="text-right text-sm">
                      {col.render ? col.render(item, index) : (item as Record<string, unknown>)[col.key] as ReactNode}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {pagination && <Pagination {...pagination} />}
    </div>
  )
}
