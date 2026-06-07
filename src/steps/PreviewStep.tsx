import { useState } from 'react';

import { XmlPreview } from '../components/XmlPreview';
import type { Group, Row } from '../core/row';
import type { ColumnDef } from '../core/variants/types';

interface Props {
  xml: string;
  groups: Group[];
  templateLabel: string;
  spreadsheetColumns: ColumnDef[];
  visibleFields: string[];
  omittedGroups: string[];
  onBack: () => void;
  onNew: () => void;
}

function countOccurrences(s: string, needle: string): number {
  return s.split(needle).length - 1;
}

export function PreviewStep({ xml, groups, templateLabel, spreadsheetColumns, visibleFields, omittedGroups, onBack, onNew }: Props) {
  const [view, setView] = useState<'xml' | 'sheet'>('xml');
  const [copied, setCopied] = useState(false);

  const points = countOccurrences(xml, '<Point ');
  const xmlGroups = countOccurrences(xml, '<Group ');

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

  function exportXml() {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateLabel.replace(/ /g, '_') || 'template'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
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
        <span className="badge badge-info">{xmlGroups} groups</span>

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
            className={`btn btn-sm${view === 'xml' ? ' btn-active' : ''}`}
            onClick={() => setView('xml')}
          >
            XML
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
      {view === 'xml' ? (
        <XmlPreview xml={xml} />
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

      {/* Footer */}
      <div className="step-footer">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onNew}>
          + New
        </button>
        <div className="flex gap-2">
          {view === 'xml' ? (
            <>
              <button type="button" className="btn" onClick={copy}>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <button type="button" className="btn btn-primary" onClick={exportXml}>
                Export XML
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
