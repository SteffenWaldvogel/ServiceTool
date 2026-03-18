'use strict';

/**
 * buildQuery(queryObj, filterDefs, sortDefs, options)
 *
 * queryObj   – req.query (or any object with string values)
 * filterDefs – { paramKey: { type, col } }
 *   types: 'in', 'exact', 'ilike', 'date_from', 'date_to', 'boolean'
 * sortDefs   – { aliasKey: 'table.column' }  (first key = default sort)
 * options    – { defaultDir: 'asc'|'desc' }
 *
 * Returns { conditions: string[], params: any[], orderBy: string, limit: number, offset: number }
 */
function buildQuery(queryObj, filterDefs, sortDefs, options = {}) {
  const params = [];
  const conditions = [];

  for (const [key, def] of Object.entries(filterDefs)) {
    const raw = queryObj[key];
    if (!raw && raw !== 0) continue;

    switch (def.type) {
      case 'in': {
        // Support comma-separated or single value
        const vals = String(raw).split(',').map(v => v.trim()).filter(Boolean);
        if (vals.length === 1) {
          params.push(vals[0]);
          conditions.push(`${def.col} = $${params.length}`);
        } else if (vals.length > 1) {
          const placeholders = vals.map(v => { params.push(v); return `$${params.length}`; });
          conditions.push(`${def.col} IN (${placeholders.join(',')})`);
        }
        break;
      }
      case 'exact': {
        params.push(raw);
        conditions.push(`${def.col} = $${params.length}`);
        break;
      }
      case 'ilike': {
        params.push(`%${raw}%`);
        conditions.push(`${def.col} ILIKE $${params.length}`);
        break;
      }
      case 'date_from': {
        params.push(raw);
        conditions.push(`${def.col} >= $${params.length}`);
        break;
      }
      case 'date_to': {
        params.push(raw);
        conditions.push(`${def.col} <= $${params.length}::date + INTERVAL '1 day'`);
        break;
      }
      case 'boolean': {
        if (raw === 'true' || raw === true) {
          conditions.push(`${def.col} = TRUE`);
        } else if (raw === 'false' || raw === false) {
          conditions.push(`${def.col} = FALSE`);
        }
        break;
      }
      default:
        break;
    }
  }

  // Sort
  const sortKeys = Object.keys(sortDefs);
  const defaultSortCol = sortDefs[sortKeys[0]] || sortKeys[0];
  const requestedSort = queryObj.sort;
  const requestedDir = queryObj.dir;

  const sortCol = (requestedSort && sortDefs[requestedSort]) ? sortDefs[requestedSort] : defaultSortCol;
  const dirRaw = requestedDir === 'asc' ? 'ASC' : requestedDir === 'desc' ? 'DESC' : (options.defaultDir === 'asc' ? 'ASC' : 'DESC');
  const orderBy = `${sortCol} ${dirRaw}`;

  // Pagination
  const limit = Math.min(parseInt(queryObj.limit) || 25, 1000);
  const offset = parseInt(queryObj.offset) || 0;

  return { conditions, params, orderBy, limit, offset };
}

module.exports = buildQuery;
