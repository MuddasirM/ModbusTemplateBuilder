import { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
}

interface FieldInfo {
  label: string;
  req?: boolean;
  note?: string;
  aliases: string[];
}

const FIELD_INFO: FieldInfo[] = [
  { label: 'No.',         req: false, note: 'Optional row counter, added automatically on Excel export', aliases: [] },
  { label: 'Name',        req: true, aliases: ['Point Name', 'Description', 'Tag Name', 'Signal Name'] },
  { label: 'Address(0x)',           aliases: ['Address', 'Addr', 'Register', 'Register Index', 'Register Address', 'Modbus Address', 'Modbus Register'] },
  { label: 'Attribute',             aliases: ['Attr', 'Register Type', 'Reg. Type', 'Function Code'] },
  { label: 'Data Format',           aliases: ['Data Type', 'Dtype', 'Format', 'Type', 'Word Format', 'Value Type'] },
  { label: 'Coefficient',           aliases: ['Coeff', 'Scaling', 'Scaling Factor', 'Factor', 'Multiplier', 'Gain'] },
  { label: 'Unit',                  aliases: ['Units', 'Engineering Unit', 'EU'] },
  { label: 'Decimals',              aliases: ['Decimal', 'Decimal Places', 'Decimal Points', 'Precision'] },
  { label: 'Group',                 aliases: ['Group Name', 'Category', 'Section'] },
  { label: 'Min',                   aliases: ['Min Value', 'Minimum', 'Min Val', 'Low Limit', 'Low Range'] },
  { label: 'Max',                   aliases: ['Max Value', 'Maximum', 'Max Val', 'High Limit', 'High Range'] },
];

export function HelpModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const activeField = FIELD_INFO.find(f => f.label === activeLabel);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.showModal();
    const onCancel = () => onClose();
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="help-dialog"
      onClick={handleBackdropClick}
    >
      <div className="help-inner">
        <div className="help-header">
          <span className="help-title">// how to use</span>
          <button type="button" className="btn btn-ghost btn-sm help-close" onClick={onClose}>
            [×]
          </button>
        </div>

        <div className="help-body">
          <p className="help-lead">
            Converts a Modbus register map spreadsheet into a device-platform template.
            Four steps: Import → Map → Edit → Preview.
            Use <em>☀</em> / <em>☾</em> in the header to switch between dark and light mode.
          </p>

          <section className="help-section">
            <h3 className="help-step-label"><span className="help-step-num">01</span> Import</h3>
            <p>
              Choose the <em>Output format</em> for the template you're building
              (currently <em>Argos</em>; more formats can be added over time — each
              defines its own fields, validation, and template metadata).
            </p>
            <p>
              Then drop or browse a <code>.csv</code> or <code>.xlsx</code> register map to start a new template.
              Both zones accept drag-and-drop or click; press <code>Enter</code> on a focused zone to open the file browser.
            </p>
            <p>
              To edit an existing template, drop a <code>.xml</code> file; it loads directly into
              the Edit step, skipping column mapping. (XML import is only available for
              formats that support reading their own template files back in.)
            </p>
          </section>

          <section className="help-section">
            <h3 className="help-step-label"><span className="help-step-num">02</span> Map</h3>
            <p>
              Column names from your file are auto-detected on import. Review the mapping and
              adjust using the searchable dropdowns. Set any column to <code>(skip)</code> to ignore it.
            </p>
            <p>
              Fields marked <span className="help-req">required</span> must be mapped before you can continue.
              For unmapped fields, the <em>Default value</em> column fills every row; use the preset
              dropdown for choice fields (Reg. Type, Data Format).
            </p>
          </section>

          <section className="help-section">
            <h3 className="help-step-label"><span className="help-step-num">03</span> Edit</h3>
            <p>
              Edit registers inline. Validation errors turn the cell red; hover to see the message.
              An error count appears above the table when errors exist.
            </p>
            <ul className="help-list">
              <li>Fill in the template metadata fields in the toolbar (for Argos: <em>Template Name</em> and <em>Version</em>); they appear as attributes in the exported template.</li>
              <li>Drag the <code>⠿</code> handle to reorder rows within a group, or drag into a different group to move them.</li>
              <li>Drag the <code>⠿</code> on a group header to reorder groups.</li>
              <li><code>⧉</code> on the right side of a row duplicates it. <code>×</code> deletes it.</li>
              <li>Drag a column header's right edge to resize that column.</li>
              <li><code>×</code> on an optional column header hides that column.</li>
              <li><code>−1</code> / <code>+1</code> shifts every register address by one.</li>
              <li>Click a group name to rename it inline. <code>×</code> on a group header deletes the group and all its rows.</li>
              <li><code>+ Add group</code> at the bottom of the table creates a new empty group.</li>
              <li>Empty groups show a badge and are excluded from the XML export.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3 className="help-step-label"><span className="help-step-num">04</span> Preview</h3>
            <p>
              Switch between <em>XML</em> and <em>Spreadsheet</em> views using the toggle at the top right.
            </p>
            <ul className="help-list">
              <li><em>XML view:</em> syntax-highlighted template. Copy to clipboard or download as <code>.xml</code>.</li>
              <li><em>Spreadsheet view:</em> flat table of all registers. Download as <code>.xlsx</code>.</li>
              <li>Empty groups are excluded from the output; a notice lists any that were omitted.</li>
              <li><code>+ New</code> clears everything and returns to Import.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3 className="help-section-title">Recognised column names</h3>
            <div className="help-cols">
              {FIELD_INFO.map(f => (
                <button
                  key={f.label}
                  type="button"
                  className={`help-col${f.req ? ' req' : ''}${activeLabel === f.label ? ' active' : ''}`}
                  onClick={() => setActiveLabel(l => l === f.label ? null : f.label)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {activeField && (
              <div className="help-aliases">
                {activeField.note ? (
                  <span className="help-alias-note">{activeField.note}</span>
                ) : activeField.aliases.length > 0 ? (
                  <>
                    <span className="help-alias-label">also:</span>
                    {activeField.aliases.map(a => (
                      <span key={a} className="help-alias">{a}</span>
                    ))}
                  </>
                ) : (
                  <span className="help-alias-note">no other names recognised</span>
                )}
              </div>
            )}
            <p style={{ fontSize: '0.6875rem', color: 'var(--c-ink-dim)', marginTop: 8 }}>
              Click a column name above to see accepted aliases. Matching is case-insensitive and ignores spaces.
            </p>
          </section>
        </div>
      </div>
    </dialog>
  );
}
