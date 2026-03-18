import React, { useState, useRef, useEffect } from 'react';
import DuplicateWarning from './DuplicateWarning';

function QuickCreateModal({ title, onClose, onSubmit, creating, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 0' }}>{children}</div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={creating}>
            {creating ? 'Speichern…' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuickCreate({
  value, onChange, options = [], onCreateNew,
  createFields, label, placeholder, disabled, nullable, matchFn
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [createError, setCreateError] = useState('');
  const [duplicates, setDuplicates] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o =>
    !search || o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find(o => String(o.id) === String(value))?.label;

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      if (matchFn) {
        const result = await matchFn(createForm);
        if (result?.matches?.length > 0) {
          setDuplicates(result.matches);
          setCreating(false);
          return;
        }
      }
      const newItem = await onCreateNew(createForm);
      onChange(String(newItem.id ?? newItem[Object.keys(newItem)[0]]));
      setShowCreate(false);
      setCreateForm({});
      setDuplicates(null);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const setField = k => e => setCreateForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        className="form-control"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none', opacity: disabled ? 0.6 : 1 }}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ color: selectedLabel ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {selectedLabel || placeholder || '— Auswählen —'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 300, top: '100%', left: 0, right: 0,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius)', maxHeight: 260, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: 2
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              className="form-control"
              style={{ height: 30, fontSize: 12 }}
              placeholder="Suchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          {nullable && (
            <div
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}
              onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
            >— Keine —</div>
          )}
          {filtered.map(o => (
            <div
              key={o.id}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: String(o.id) === String(value) ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: String(o.id) === String(value) ? 'var(--accent)' : 'var(--text-primary)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = String(o.id) === String(value) ? 'rgba(59,130,246,0.1)' : 'transparent'}
              onClick={() => { onChange(String(o.id)); setOpen(false); setSearch(''); }}
            >
              {o.label}
              {o.sublabel && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{o.sublabel}</span>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>Keine Treffer</div>
          )}
          {onCreateNew && (
            <div
              style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => { setOpen(false); setShowCreate(true); setSearch(''); }}
            >
              + Neu anlegen
            </div>
          )}
        </div>
      )}

      {/* Mini-Modal */}
      {showCreate && (
        <QuickCreateModal
          title={`Neu: ${label}`}
          onClose={() => { setShowCreate(false); setCreateForm({}); setCreateError(''); setDuplicates(null); }}
          onSubmit={handleCreate}
          creating={creating}
        >
          {duplicates && (
            <DuplicateWarning
              matches={duplicates}
              entityType={label}
              onContinue={async () => {
                setDuplicates(null);
                setCreating(true);
                setCreateError('');
                try {
                  const newItem = await onCreateNew(createForm);
                  onChange(String(newItem.id ?? newItem[Object.keys(newItem)[0]]));
                  setShowCreate(false);
                  setCreateForm({});
                } catch (err) {
                  setCreateError(err.message);
                } finally {
                  setCreating(false);
                }
              }}
            />
          )}
          {createError && <div className="error-banner" style={{ marginBottom: 12 }}>{createError}</div>}
          {(createFields || []).map(field => (
            <div className="form-group" key={field.key}>
              <label className="form-label">{field.label}{field.required ? ' *' : ''}</label>
              {field.type === 'select' ? (
                <select className="form-control" value={createForm[field.key] ?? ''} onChange={setField(field.key)}>
                  <option value="">— Wählen —</option>
                  {(field.options || []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea className="form-control" rows={2} value={createForm[field.key] ?? ''} onChange={setField(field.key)} />
              ) : (
                <input className="form-control" type={field.type || 'text'} value={createForm[field.key] ?? ''} onChange={setField(field.key)} placeholder={field.placeholder} />
              )}
            </div>
          ))}
        </QuickCreateModal>
      )}
    </div>
  );
}
