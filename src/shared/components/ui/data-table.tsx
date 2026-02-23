'use client';

import { DEFAULT_PAGE_SIZE_OPTIONS } from '../../constants/common';
import { cn } from '../../lib/utils';
import { SelectGroup } from '@radix-ui/react-select';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type Cell,
    type ColumnDef,
    type FilterFn,
    type HeaderGroup,
    type PaginationOptions,
    type PaginationState,
    type Row,
    type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';
import { Input } from './input';
import { Pagination, PaginationContent, PaginationItem, PaginationRange } from './pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  pagination: PaginationState;
  paginationOptions: Pick<PaginationOptions, 'onPaginationChange' | 'rowCount'>;
  totalPages?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T | string;
  emptyMessage?: string;
  className?: string;
  enableGlobalFilter?: boolean;
  globalFilterFn?: FilterFn<T>;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

function DataTable<T extends Record<string, unknown>>({
  data,
  paginationOptions,
  columns,
  totalPages = 0,
  searchable = false,
  searchPlaceholder,
  searchKey,
  emptyMessage,
  className,
  enableGlobalFilter = true,
  globalFilterFn,
  pagination,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    getRowId: (row, index) => {
      // Try to use 'id' field from row, fallback to index if not available
      if ('id' in row && row.id != null) {
        return String(row.id);
      }
      // Fallback to index as string
      return String(index);
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    globalFilterFn:
      globalFilterFn ||
      ((row, _columnId, filterValue) => {
        if (!searchKey) {
          // Search all columns
          return Object.values(row.original).some((value) =>
            String(value).toLowerCase().includes(String(filterValue).toLowerCase()),
          );
        }
        // Search specific column
        const value = row.original[searchKey as keyof T];
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      }),
    enableGlobalFilter: searchable && enableGlobalFilter,
    state: {
      sorting,
      pagination,
      columnPinning: {
        right: ['actions'],
      },
    },
    ...paginationOptions,
  });

  return (
    <div className={cn('space-y-4', className)}>
      {searchable && (
        <Input
          placeholder={searchPlaceholder || 'Search...'}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<T>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div className="flex gap-2 items-center">
                          <div
                            className={cn(
                              canSort && 'cursor-pointer select-none hover:text-foreground',
                            )}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                          {canSort && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-4 h-4"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {isSorted === 'asc' ? (
                                <ArrowUp className="size-3.5 text-primary" />
                              ) : isSorted === 'desc' ? (
                                <ArrowDown className="size-3.5 text-primary" />
                              ) : (
                                <ArrowUpDown className="size-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: Row<T>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    rowClassName && rowClassName(row.original),
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell: Cell<T, unknown>) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="py-8 text-center">
                  {emptyMessage || 'No data available'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {typeof totalPages === 'number' && totalPages > 1 && (
        <DataTablePagination table={table} totalPages={totalPages} />
      )}
    </div>
  );
}

interface DataTablePaginationProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  totalPages: number;
}

function DataTablePagination<TData>({ table, totalPages }: DataTablePaginationProps<TData>) {
  return (
    <Pagination>
      <PaginationContent className="flex-1 gap-4 justify-end">
        <PaginationItem>
          <PaginationRange
            currentPage={table.getState().pagination.pageIndex + 1}
            pageSize={table.getState().pagination.pageSize}
            totalPages={totalPages}
            isGroupButton
            onPageChange={(page) => {
              table.setPageIndex(page - 1);
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <Select
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
            value={table.getState().pagination.pageSize.toString()}
          >
            <SelectTrigger className="w-[130px]" size={'sm'}>
              <SelectValue placeholder="Chọn" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DEFAULT_PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id.toString()}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export type { ColumnDef } from '@tanstack/react-table';
export { DataTable };

