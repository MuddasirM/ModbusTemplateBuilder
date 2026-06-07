import { useState } from 'react';
import Select, { type StylesConfig } from 'react-select';

import type { Mapping } from '../core/variants/argos/prepareRows';
import type { FieldDef } from '../core/variants/types';

type DropdownOption = { value: string; label: string };

const selectStyles: StylesConfig<DropdownOption> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--c-bg)',
    borderColor: state.isFocused ? 'var(--c-accent)' : 'var(--c-border)',
    boxShadow: state.isFocused ? '0 0 0 1px oklch(0.60 0.18 72)' : 'none',
    borderRadius: 0,
    minHeight: '30px',
    fontSize: '0.75rem',
    fontFamily: 'var(--f-mono)',
    '&:hover': { borderColor: 'var(--c-ink-dim)' },
  }),
  valueContainer: (base) => ({ ...base, padding: '2px 6px' }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--c-surface)',
    border: '1px solid var(--c-border)',
    boxShadow: '0 8px 24px oklch(0 0 0 / 0.60)',
    borderRadius: 0,
    zIndex: 9999,
  }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--c-accent-deep)'
      : state.isFocused
        ? 'var(--c-surface-raised)'
        : 'transparent',
    color: state.isSelected ? 'oklch(0.07 0.010 60)' : 'var(--c-ink)',
    fontSize: '0.75rem',
    fontFamily: 'var(--f-mono)',
    padding: '5px 8px',
    borderRadius: 0,
    cursor: 'pointer',
  }),
  singleValue:        (base) => ({ ...base, color: 'var(--c-ink)', fontFamily: 'var(--f-mono)', fontSize: '0.75rem' }),
  input:              (base) => ({ ...base, color: 'var(--c-ink)', margin: 0, padding: 0, fontFamily: 'var(--f-mono)' }),
  placeholder:        (base) => ({ ...base, color: 'var(--c-ink-dim)' }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--c-border)' }),
  dropdownIndicator:  (base) => ({
    ...base,
    color: 'var(--c-ink-dim)',
    padding: '0 6px',
    '&:hover': { color: 'var(--c-ink-muted)' },
  }),
};

interface Props {
  fields: FieldDef[];
  fileCols: string[];
  mapping: Mapping;
  setMapping: (m: Mapping) => void;
  defaults: Record<string, string>;
  setDefaults: (d: Record<string, string>) => void;
  onBack: () => void;
  onApply: () => string | null;
}

const SKIP = '__skip__';

export function MappingStep({
  fields,
  fileCols,
  mapping,
  setMapping,
  defaults,
  setDefaults,
  onBack,
  onApply,
}: Props) {
  const [error, setError] = useState('');

  const colOptions: DropdownOption[] = [
    { value: SKIP, label: '(skip)' },
    ...fileCols.map((c) => ({ value: c, label: c })),
  ];

  function setMap(key: string, val: string | null) {
    setMapping({ ...mapping, [key]: val });
  }

  return (
    <div className="flex flex-col grow overflow-hidden">
      <div className="flex items-center gap-3" style={{ marginBottom: 12, flexShrink: 0 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back
        </button>
        <span style={{ fontSize: '0.6875rem', color: 'var(--c-ink-dim)' }}>
          {fileCols.length} columns detected
        </span>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      <div className="table-scroll grow">
        <table className="mapping-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Template field</th>
              <th style={{ width: '12%' }}>Required</th>
              <th style={{ width: '38%' }}>File column</th>
              <th style={{ width: '28%' }}>Default value</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const current = mapping[f.key];
              const value: DropdownOption = current
                ? { value: current, label: current }
                : { value: SKIP, label: '(skip)' };
              return (
                <tr key={f.key}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{f.label}</span>
                    {f.required && (
                      <span style={{ color: 'var(--c-danger)', marginLeft: 2 }}>*</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${f.required ? 'badge-required' : 'badge-optional'}`}>
                      {f.required ? 'required' : 'optional'}
                    </span>
                  </td>
                  <td>
                    <Select
                      options={colOptions}
                      value={value}
                      isSearchable
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      onChange={(opt) => {
                        const v = (opt as DropdownOption | null)?.value;
                        setMap(f.key, !v || v === SKIP ? null : String(v));
                      }}
                    />
                  </td>
                  <td>
                    {f.type === 'choice' && f.choices ? (
                      <select
                        className="field-select"
                        value={defaults[f.key] ?? ''}
                        onChange={(e) => setDefaults({ ...defaults, [f.key]: e.target.value })}
                      >
                        {f.choices.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="field-input"
                        value={defaults[f.key] ?? ''}
                        placeholder="(none)"
                        onChange={(e) => setDefaults({ ...defaults, [f.key]: e.target.value })}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="step-footer">
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            const required = fields
              .filter((f) => f.required && !mapping[f.key])
              .map((f) => f.label);
            if (required.length) {
              setError(`Map required fields before continuing: ${required.join(', ')}`);
              return;
            }
            const err = onApply();
            setError(err ?? '');
          }}
        >
          Apply Mapping &amp; Edit Data →
        </button>
      </div>
    </div>
  );
}
