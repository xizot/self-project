'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  MoreHorizontalIcon,
} from 'lucide-react';
import * as React from 'react';

import { buttonVariants, type Button } from './button';
import { cn } from '../../lib/utils';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('flex justify-center mx-auto w-full', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row gap-1 items-center', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  disabled?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>;

function PaginationLink({
  className,
  isActive,
  disabled,
  size = 'icon-sm',
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
          className: cn(
            'rounded-full',
            isActive && '!bg-primary/25 text-primary',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          ),
        }),
      )}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="md"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
    </PaginationLink>
  );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="md"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex justify-center items-center size-9', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
type PaginationRangeProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  siblingCount?: number;
  isGroupButton?: boolean;
  onPageChange: (pageIndex: number, pageSize: number) => void;
};

const generatePaginationRange = (
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1,
) => {
  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPageIndex);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPageIndex);

  const shouldShowLeftDots = leftSiblingIndex > firstPageIndex + 1;
  const shouldShowRightDots = rightSiblingIndex < lastPageIndex - 1;

  const range: (number | 'left-ellipsis' | 'right-ellipsis')[] = [];

  range.push(firstPageIndex);

  if (shouldShowLeftDots) {
    range.push('left-ellipsis');
  } else if (firstPageIndex + 1 < leftSiblingIndex) {
    range.push(firstPageIndex + 1);
  }

  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    if (i !== firstPageIndex && i !== lastPageIndex) {
      range.push(i);
    }
  }

  if (shouldShowRightDots) {
    range.push('right-ellipsis');
  } else if (rightSiblingIndex < lastPageIndex - 1) {
    range.push(lastPageIndex - 1);
  }

  if (lastPageIndex !== firstPageIndex) {
    range.push(lastPageIndex);
  }

  return range;
};

const LeftEllipsis = ({ className, ...props }: Omit<PaginationLinkProps, 'children'>) => {
  return (
    <PaginationLink
      className={cn(
        'relative cursor-pointer group border-secondary-hover text-secondary-foreground hover:text-secondary-foreground-hover',
        className,
      )}
      {...props}
    >
      {/* Default icon */}
      <MoreHorizontal className="opacity-100 transition-opacity group-hover:opacity-0" />
      {/* Hover icon */}
      <ChevronsLeft className="absolute opacity-0 transition-opacity text-brand-500 group-hover:opacity-100" />
    </PaginationLink>
  );
};

const RightEllipsis = ({ className, ...props }: Omit<PaginationLinkProps, 'children'>) => {
  return (
    <PaginationLink
      className={cn(
        'relative cursor-pointer group border-secondary-hover text-secondary-foreground hover:text-secondary-foreground-hover',
        className,
      )}
      {...props}
    >
      <MoreHorizontal className="opacity-100 transition-opacity group-hover:opacity-0" />
      {/* Hover icon */}
      <ChevronsRight className="absolute opacity-0 transition-opacity text-brand-500 group-hover:opacity-100 text-primary" />
    </PaginationLink>
  );
};

const PaginationRange = ({
  currentPage,
  totalPages,
  pageSize,
  siblingCount = 1,
  onPageChange,
}: PaginationRangeProps) => {
  const paginationRange = React.useMemo(
    () => generatePaginationRange(currentPage, totalPages, siblingCount),
    [currentPage, totalPages, siblingCount],
  );

  return (
    <div className="flex gap-2 items-center">
      <PaginationPrevious
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1, pageSize)}
        disabled={currentPage === 1}
        aria-disabled={currentPage === 1}
        className="cursor-pointer"
      />
      {paginationRange.map((pageNumber, index) => {
        if (pageNumber === 'left-ellipsis') {
          return (
            <PaginationItem key={`ellipsis-${index}`}>
              <LeftEllipsis onClick={() => onPageChange(currentPage - siblingCount, pageSize)} />
            </PaginationItem>
          );
        }

        if (pageNumber === 'right-ellipsis') {
          return (
            <PaginationItem key={`ellipsis-${index}`}>
              <RightEllipsis onClick={() => onPageChange(currentPage + siblingCount, pageSize)} />
            </PaginationItem>
          );
        }

        return (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              isActive={currentPage === pageNumber}
              onClick={() => pageNumber !== currentPage && onPageChange(pageNumber, pageSize)}
              className="cursor-pointer"
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        );
      })}

      <PaginationNext
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1, pageSize)}
        disabled={currentPage === totalPages}
        aria-disabled={currentPage === totalPages}
        className="cursor-pointer"
      />
    </div>
  );
};

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationRange,
};
