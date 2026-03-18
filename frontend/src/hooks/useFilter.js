import { useState, useCallback } from 'react';

/**
 * useFilter – unified filter/sort/pagination state hook
 *
 * Usage:
 *   const { filters, sort, page, setFilter, setSort, setPage, clearFilters, buildParams } = useFilter(defaults);
 *
 * defaults – optional initial filter values object
 */
export function useFilter(defaults = {}) {
  const [filters, setFiltersState] = useState(defaults);
  const [sort, setSortState] = useState({ by: 'default', dir: 'desc' });
  const [page, setPageState] = useState({ limit: 25, offset: 0 });

  const setFilter = useCallback((key, value) => {
    setFiltersState(f => ({ ...f, [key]: value }));
    setPageState(p => ({ ...p, offset: 0 })); // reset page on filter change
  }, []);

  const setSort = useCallback((field) => {
    setSortState(s => ({
      by: field,
      dir: s.by === field && s.dir === 'asc' ? 'desc' : 'asc'
    }));
    setPageState(p => ({ ...p, offset: 0 }));
  }, []);

  const setPage = useCallback((updater) => {
    setPageState(typeof updater === 'function' ? updater : () => updater);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaults);
    setPageState(p => ({ ...p, offset: 0 }));
  }, [defaults]);

  const buildParams = useCallback(() => {
    const params = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== '' && v !== null && v !== undefined) params[k] = v;
    }
    if (sort.by !== 'default') params.sort = sort.by;
    params.dir = sort.dir;
    params.limit = page.limit;
    params.offset = page.offset;
    return params;
  }, [filters, sort, page]);

  return { filters, sort, page, setFilter, setSort, setPage, clearFilters, buildParams };
}

export default useFilter;
