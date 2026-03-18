import React, { useState } from 'react';

export default function FilterBar({ filterConfig = [], filters = {}, onFilterChange, onClear, activeCount = 0 }) {
  const [expanded, setExpanded] = useState(false);

  const primaryFilters = filterConfig.filter(f => !f.advanced);
  const advancedFilters = filterConfig.filter(f => f.advanced);

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
        {primaryFilters.map(f => renderFilter(f, filters, onFilterChange))}
        {advancedFilters.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Weniger ▲' : `Mehr Filter ${activeCount > 0 ? `(${activeCount})` : ''} ▼`}
          </button>
        )}
        {activeCount > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={onClear}>
            ✕ Filter löschen
          </button>
        )}
      </div>
      {expanded && advancedFilters.length > 0 && (
        <div className="filter-bar" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
          {advancedFilters.map(f => renderFilter(f, filters, onFilterChange))}
        </div>
      )}
      {/* Active filter chips */}
      {activeCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {filterConfig.map(f => {
            const val = filters[f.key];
            if (!val) return null;
            const label = f.type === 'select' || f.type === 'multiselect'
              ? (f.options?.find(o => String(o.id) === String(val))?.label || val)
              : val === 'true' ? f.label : val;
            return (
              <span key={f.key} className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}
                onClick={() => onFilterChange(f.key, '')}>
                {f.label}: {label} ✕
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderFilter(f, filters, onChange) {
  if (f.type === 'search') {
    return (
      <input key={f.key} className="form-control" style={{ flex: 2, minWidth: 160 }}
        placeholder={f.placeholder || f.label}
        value={filters[f.key] || ''}
        onChange={e => onChange(f.key, e.target.value)} />
    );
  }
  if (f.type === 'select') {
    return (
      <select key={f.key} className="form-control" style={{ minWidth: 140 }}
        value={filters[f.key] || ''}
        onChange={e => onChange(f.key, e.target.value)}>
        <option value="">{f.label}: Alle</option>
        {(f.options || []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    );
  }
  if (f.type === 'boolean') {
    return (
      <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
        <input type="checkbox" checked={filters[f.key] === 'true'} onChange={e => onChange(f.key, e.target.checked ? 'true' : '')} />
        {f.label}
      </label>
    );
  }
  if (f.type === 'number') {
    return (
      <input
        key={f.key}
        type="number"
        className="form-control"
        style={{ width: 100 }}
        placeholder={f.placeholder}
        value={filters[f.key] || ''}
        onChange={e => onChange(f.key, e.target.value || '')}
      />
    );
  }
  if (f.type === 'daterange') {
    return (
      <React.Fragment key={f.key}>
        <input className="form-control" type="date" style={{ minWidth: 140 }}
          placeholder="Von" value={filters[f.key + '_from'] || ''}
          onChange={e => onChange(f.key + '_from', e.target.value)} />
        <input className="form-control" type="date" style={{ minWidth: 140 }}
          placeholder="Bis" value={filters[f.key + '_to'] || ''}
          onChange={e => onChange(f.key + '_to', e.target.value)} />
      </React.Fragment>
    );
  }
  return null;
}
