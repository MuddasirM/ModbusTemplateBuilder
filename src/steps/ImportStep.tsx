import { useEffect, useRef, useState } from 'react';

import type { Source } from '../App';
import type { VariantBundle } from '../core/variants/types';

const STATUS_LABEL: Record<Source, string> = {
  csv: 'Parsing rows and detecting columns…',
  xml: 'Parsing template structure…',
};

const CYCLING_HINTS: string[][] = [
  ['Name', 'Point Name', 'Description', 'Tag Name', 'Signal Name'],
  ['Address(0x)', 'Address', 'Addr', 'Register', 'Modbus Address', 'Register Index'],
  ['Attribute', 'Register Type', 'Reg. Type', 'Function Code'],
  ['Coefficient', 'Scaling', 'Factor', 'Multiplier', 'Gain'],
  ['Unit', 'Units', 'Engineering Unit'],
  ['Group', 'Category', 'Group Name', 'Section'],
];

interface Props {
  variants: VariantBundle[];
  variant: VariantBundle;
  setVariant: (v: VariantBundle) => void;
  onCsv: (file: File) => void;
  onXml: (file: File) => void;
  error: string;
  importing: { fileName: string; kind: Source } | null;
  onOpenHelp: () => void;
}

export function ImportStep({ variants, variant, setVariant, onCsv, onXml, error, importing, onOpenHelp }: Props) {
  const csvInput = useRef<HTMLInputElement>(null);
  const xmlInput = useRef<HTMLInputElement>(null);
  const [csvDragging, setCsvDragging] = useState(false);
  const [xmlDragging, setXmlDragging] = useState(false);
  const [hintIndices, setHintIndices] = useState(() => CYCLING_HINTS.map(() => 0));

  useEffect(() => {
    let turn = 0;
    const id = setInterval(() => {
      // Step exactly one slot to its next alias, cascading left to right
      // (then wrapping) - a single quiet change at a time, not all six
      // turning over in one pulse.
      const slot = turn % CYCLING_HINTS.length;
      turn += 1;
      setHintIndices(prev =>
        prev.map((idx, i) => (i === slot ? (idx + 1) % CYCLING_HINTS[i].length : idx)),
      );
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const pickCsv = (f?: File | null) => f && onCsv(f);
  const pickXml = (f?: File | null) => f && onXml(f);

  function onCsvDrop(e: React.DragEvent) {
    e.preventDefault();
    setCsvDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onCsv(f);
  }

  function onXmlDrop(e: React.DragEvent) {
    e.preventDefault();
    setXmlDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onXml(f);
  }

  return (
    <div className="import-center">
      {error && (
        <div className="alert alert-danger" style={{ maxWidth: 760, width: '100%' }}>
          {error}
        </div>
      )}

      {importing ? (
        <div className="import-loading" role="status" aria-live="polite">
          <p className="import-loading-title">Reading {importing.fileName}…</p>
          <div className="scan-track">
            <div className="scan-bead" />
          </div>
          <p className="import-loading-sub">{STATUS_LABEL[importing.kind]}</p>
        </div>
      ) : (
      <>
      <div className="variant-picker">
        <label className="field-label" htmlFor="variant-select">Output format</label>
        <select
          id="variant-select"
          className="field-select"
          value={variant.id}
          onChange={(e) => {
            const next = variants.find((v) => v.id === e.target.value);
            if (next) setVariant(next);
          }}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="import-panels">
        {/* CSV / spreadsheet panel */}
        <div
          className={`drop-zone${csvDragging ? ' dragging' : ''}`}
          onClick={() => csvInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setCsvDragging(true); }}
          onDragLeave={() => setCsvDragging(false)}
          onDrop={onCsvDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && csvInput.current?.click()}
        >
          <div className="drop-zone-icon">⊞</div>
          <p className="drop-zone-title">Drop or open a register map</p>
          <p className="drop-zone-sub">.csv · .xlsx</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); csvInput.current?.click(); }}
          >
            Browse file...
          </button>
        </div>

        <div className="import-or">or</div>

        {/* XML panel */}
        <div
          className={`drop-zone${xmlDragging ? ' dragging' : ''}`}
          onClick={() => xmlInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setXmlDragging(true); }}
          onDragLeave={() => setXmlDragging(false)}
          onDrop={onXmlDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && xmlInput.current?.click()}
        >
          <div className="drop-zone-icon drop-zone-icon--xml">&lt;/&gt;</div>
          <p className="drop-zone-title">Edit a template XML</p>
          <p className="drop-zone-sub">.xml</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); xmlInput.current?.click(); }}
          >
            Browse XML...
          </button>
        </div>
      </div>

      <p className="import-hint">
        {'column names are matched flexibly. '}
        {CYCLING_HINTS.map((aliases, i) => {
          const name = aliases[hintIndices[i]];
          return (
            <span key={i}>
              {i > 0 && ' · '}
              <span key={name} className="hint-col-cycle">{name}</span>
            </span>
          );
        })}
      </p>
      <p className="import-help-link">
        New here? Open the <button type="button" className="link-btn" onClick={onOpenHelp}>how-to-use</button> guide, also reachable any time via the <em>?</em> button in the top right.
      </p>
      </>
      )}

      <input
        ref={csvInput}
        type="file"
        accept=".csv,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => { pickCsv(e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        ref={xmlInput}
        type="file"
        accept=".xml"
        style={{ display: 'none' }}
        onChange={(e) => { pickXml(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}
