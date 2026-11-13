import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface PaginatedResult<T> {
  pageItems: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Slices an items array for the requested page (default 10 items/page),
 * clamping out-of-range page numbers safely and computing 1-based display bounds.
 */
export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number = 10
): PaginatedResult<T> {
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const rawPage = Number.isFinite(page) ? Math.floor(page) : 1;
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);

  if (totalItems === 0) {
    return {
      pageItems: [],
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
      startIndex: 0,
      endIndex: 0,
    };
  }

  const zeroStart = (currentPage - 1) * safePageSize;
  const zeroEnd = Math.min(zeroStart + safePageSize, totalItems);

  return {
    pageItems: items.slice(zeroStart, zeroEnd),
    totalItems,
    totalPages,
    currentPage,
    startIndex: zeroStart + 1,
    endIndex: zeroEnd,
  };
}

function buildPageTokens(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  totalPages?: number;
  startIndex?: number;
  endIndex?: number;
  pageSize?: number;
  className?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  onPageChange,
  totalPages: totalPagesProp,
  startIndex: startIndexProp,
  endIndex: endIndexProp,
  pageSize = 10,
  className = '',
}) => {
  const { locale } = useI18n();
  const isThai = locale === 'th';

  if (totalItems <= 0) {
    return null;
  }

  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = startIndexProp ?? (safePage - 1) * pageSize + 1;
  const endIndex = endIndexProp ?? Math.min(safePage * pageSize, totalItems);
  const pageTokens = buildPageTokens(safePage, totalPages);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 ${className}`}
    >
      <div className="font-sans">
        {isThai ? (
          <>
            แสดง{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {startIndex}–{endIndex}
            </span>{' '}
            จาก{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {totalItems}
            </span>{' '}
            รายการ
          </>
        ) : (
          <>
            Showing{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {startIndex}–{endIndex}
            </span>{' '}
            of{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {totalItems}
            </span>{' '}
            items
          </>
        )}
      </div>

      <nav
        aria-label={isThai ? 'การแบ่งหน้า' : 'Pagination'}
        className="flex items-center gap-1.5 flex-wrap justify-center"
      >
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label={isThai ? 'หน้าก่อนหน้า' : 'Previous page'}
          className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer font-sans"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isThai ? 'ก่อนหน้า' : 'Prev'}</span>
        </button>

        {pageTokens.map((token, idx) =>
          token === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1.5 text-slate-400 font-mono select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={token}
              type="button"
              onClick={() => onPageChange(token)}
              aria-current={token === safePage ? 'page' : undefined}
              className={`min-h-[36px] min-w-[36px] px-2.5 py-1.5 rounded-md border font-mono tabular-nums font-medium transition-colors cursor-pointer ${
                token === safePage
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {token}
            </button>
          )
        )}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label={isThai ? 'หน้าถัดไป' : 'Next page'}
          className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer font-sans"
        >
          <span>{isThai ? 'ถัดไป' : 'Next'}</span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
};
