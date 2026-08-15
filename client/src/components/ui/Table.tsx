import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean
}

export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(
  ({ className, bordered = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full overflow-auto',
          bordered && 'rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TableContainer.displayName = 'TableContainer'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  containerBordered?: boolean
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => {
    return (
      <table
        ref={ref}
        className={cn('w-full caption-bottom border-collapse text-left text-sm', className)}
        {...props}
      />
    )
  }
)
Table.displayName = 'Table'

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn('border-b border-white/5 bg-white/5 text-xs font-semibold uppercase tracking-wider rogym-text-dim', className)}
        {...props}
      />
    )
  }
)
TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  }
)
TableBody.displayName = 'TableBody'

export const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return (
      <tfoot
        ref={ref}
        className={cn('border-t border-white/10 bg-white/5 font-medium text-white', className)}
        {...props}
      />
    )
  }
)
TableFooter.displayName = 'TableFooter'

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          'border-t border-white/5 transition-colors duration-150 hover:bg-white/[0.03]',
          className
        )}
        {...props}
      />
    )
  }
)
TableRow.displayName = 'TableRow'

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          'h-12 px-5 py-3.5 text-left align-middle font-medium rogym-text-dim [&:has([role=checkbox])]:pr-0',
          className
        )}
        {...props}
      />
    )
  }
)
TableHead.displayName = 'TableHead'

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn('p-5 align-middle [&:has([role=checkbox])]:pr-0', className)}
        {...props}
      />
    )
  }
)
TableCell.displayName = 'TableCell'
