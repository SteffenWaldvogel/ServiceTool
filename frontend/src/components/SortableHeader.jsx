import React from 'react';

export default function SortableHeader({ field, label, sort, onSort }) {
  const isActive = sort?.by === field;
  const icon = !isActive ? '⇅' : sort.dir === 'asc' ? '▲' : '▼';
  return (
    <span
      style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        color: isActive ? 'var(--accent)' : 'inherit' }}
      onClick={() => onSort(field)}
    >
      {label}
      <span style={{ fontSize: 10, opacity: isActive ? 1 : 0.4 }}>{icon}</span>
    </span>
  );
}
