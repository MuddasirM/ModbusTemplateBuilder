import { useState } from 'react';

import { CodePreview } from '../components/CodePreview';
import type { Group, Row } from '../core/row';
import type { ColumnDef, OutputFormat } from '../core/variants/types';

interface Props {
  xml: string;
  groups: Group[];
  templateLabel: string;
  spreadsheetColumns: ColumnDef[];
  visibleFields: string[];
  omittedGroups: string[];
  output: OutputFormat;
  onBack: () => void;
  onNew: () => void;
}

interface ExportLogEntry {
  text: string;
}

export function PreviewStep({ xml, groups, templateLabel, spreadsheetColumns, visibleFields, omittedGroups, output, onBack, onNew }: Props) {
  const [view, setView] = useState<'code' | 'sheet'>('code');
  const [copied, setCopied] = useState(false);

  // Session-only export log (terminal-style, typed-on-screen): cleared on
  // navigation away or refresh, since this component unmounts with the step.
  const [exportLog, setExportLog] = useState<ExportLogEntry[]>([]);
  const exported = exportLog.length > 0;

  function logExport(format: string) {
    const label = templateLabel.trim() || 'Untitled template';
    setExportLog((prev) => [...prev, { text: `${label} was exported as ${format}: transformation successful.` }]);
  }

  const points = groups.reduce((n, g) => n + g.points.length, 0);
  const groupCount = groups.length;

  // Match the Edit step's column visibility (required fields are always in visibleFields).
  const sheetCols = spreadsheetColumns.filter((c) => visibleFields.includes(c.key));

  // Build flat rows for the spreadsheet view (group name injected from tree).
  const sheetRows: Row[] = groups.flatMap((g) =>
    g.points.map((r): Row => ({ ...r, group_name: g.name })),
  );

  async function copy() {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportPrimary() {
    const blob = new Blob([xml], { type: output.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateLabel.replace(/ /g, '_') || 'template'}.${output.extension}`;
    a.click();
    URL.revokeObjectURL(url);
    logExport(output.label);
  }

  async function exportExcel() {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    const ws = wb.addWorksheet('Registers');

    ws.addRow(['No.', ...sheetCols.map((c) => c.header)]);

    let rowNo = 1;
    for (const g of groups) {
      for (const r of g.points) {
        ws.addRow([rowNo++, ...sheetCols.map((c) => r[c.key] ?? '')]);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateLabel.replace(/ /g, '_') || 'template'}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    logExport('Excel (.xlsx)');
  }

  return (
    <div className="flex flex-col grow overflow-hidden">
      {/* Stats bar */}
      <div className="preview-stats">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back to Edit
        </button>
        <span className="sep" />
        <span className="badge badge-success">{points} points</span>
        <span className="badge badge-info">{groupCount} groups</span>

        {omittedGroups.length > 0 && (
          <span className="omitted-notice">
            {omittedGroups.length === 1
              ? `1 empty group (${omittedGroups[0]}) omitted from export`
              : `${omittedGroups.length} empty groups (${omittedGroups.join(', ')}) omitted from export`}
          </span>
        )}

        {/* View toggle */}
        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className={`btn btn-sm${view === 'code' ? ' btn-active' : ''}`}
            onClick={() => setView('code')}
          >
            {output.label}
          </button>
          <button
            type="button"
            className={`btn btn-sm${view === 'sheet' ? ' btn-active' : ''}`}
            onClick={() => setView('sheet')}
          >
            Spreadsheet
          </button>
        </div>
      </div>

      {/* Content area */}
      {view === 'code' ? (
        <CodePreview code={xml} highlight={output.syntax === 'xml' ? 'xml' : undefined} />
      ) : (
        <div className="table-scroll">
          <table className="register-table sheet-preview">
            <thead>
              <tr>
                <th>#</th>
                {sheetCols.map((c) => <th key={c.key}>{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {sheetRows.map((r, i) => (
                <tr key={i}>
                  <td className="row-num">{i + 1}</td>
                  {sheetCols.map((c) => (
                    <td key={c.key}>{r[c.key] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Export log: terminal-style, typed-on-screen, append-only, session-only */}
      {exported && (
        <div className="export-log" aria-live="polite">
          {exportLog.map((entry, i) => {
            const line = `> ${entry.text}`;
            return (
              <div
                key={i}
                className="export-log-line"
                style={{
                  '--chars': line.length,
                  animationDuration: `${Math.min(line.length * 0.025, 2)}s`,
                } as React.CSSProperties}
              >
                {line}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="step-footer">
        <button
          type="button"
          className={`btn btn-sm${exported ? ' btn-primary' : ' btn-ghost'}`}
          onClick={onNew}
        >
          {exported ? '+ New template →' : '+ New'}
        </button>
        <div className="flex gap-2">
          {view === 'code' ? (
            <>
              <button type="button" className="btn" onClick={copy}>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <button type="button" className="btn btn-primary" onClick={exportPrimary}>
                Export {output.label}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={exportExcel}>
              Export Excel (.xlsx)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
