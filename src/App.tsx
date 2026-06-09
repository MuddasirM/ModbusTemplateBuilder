import { useState } from 'react';

import { type CellValue, type Group, type Row } from './core/row';
import { autoMap, fileColsOf } from './core/variants/argos/mapping';
import { prepareRows, type Mapping } from './core/variants/argos/prepareRows';
import { DEFAULT_VARIANT, VARIANTS } from './core/variants/registry';
import type { VariantBundle } from './core/variants/types';
import { readSpreadsheet } from './io/readSpreadsheet';

import { FeedbackModal } from './components/FeedbackModal';
import { HelpModal } from './components/HelpModal';
import { StepHeader } from './components/StepHeader';
import { ImportStep } from './steps/ImportStep';
import { MappingStep } from './steps/MappingStep';
import { EditStep } from './steps/EditStep';
import { PreviewStep } from './steps/PreviewStep';

export type Step = 'import' | 'mapping' | 'edit' | 'preview';
export type Source = 'csv' | 'xml';

const STEP_HINTS: Record<Step, string> = {
  import:  'Pick a format, then drop your register map (.csv / .xlsx), or load an existing template (.xml) to skip straight to editing.',
  mapping: 'Map each column to a template field. Required fields (*) must be mapped; unmapped optional fields use the default value shown.',
  edit:    'Edit cells inline. Drag the ⠿ handles to reorder rows and groups. Validation errors block export and are listed in the issues panel.',
  preview: 'Inspect the output before saving. Switch between XML and Spreadsheet views; download either format from the footer.',
};

// Point and Group with stable IDs for DnD key stability.
export interface PointState {
  id: string;
  data: Row;
}
export interface GroupState {
  id: string;
  name: string;
  points: PointState[];
}

// Per-point validation errors, keyed by point ID.
export type PointErrors = Record<string, Record<string, string>>;

let _idCounter = 0;
function uid(): string { return String(++_idCounter); }

function coreToState(groups: Group[]): GroupState[] {
  return groups.map((g) => ({
    id: uid(),
    name: g.name,
    points: g.points.map((p) => ({ id: uid(), data: p })),
  }));
}

export function stateToCore(groups: GroupState[]): Group[] {
  return groups.map((g) => ({ name: g.name, points: g.points.map((p) => p.data) }));
}

function allFieldsOf(variant: VariantBundle): string[] {
  return variant.fields.map((f) => f.key);
}
function freshMapping(fileCols: string[], variant: VariantBundle): Mapping {
  const auto = autoMap(fileCols, variant.fields, variant.aliases);
  return Object.fromEntries(variant.fields.map((f) => [f.key, auto[f.key] ?? null]));
}
function freshDefaults(variant: VariantBundle): Record<string, string> {
  return Object.fromEntries(variant.fields.map((f) => [f.key, f.default]));
}
function freshMeta(variant: VariantBundle): Record<string, CellValue> {
  return Object.fromEntries(variant.metadata.map((m) => [m.key, m.default]));
}

export function App() {
  const [step, setStep] = useState<Step>('import');
  const [source, setSource] = useState<Source>('csv');
  const [variant, setVariant] = useState<VariantBundle>(DEFAULT_VARIANT);

  const [grid, setGrid] = useState<CellValue[][]>([]);
  const [fileCols, setFileCols] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [defaults, setDefaults] = useState<Record<string, string>>(() => freshDefaults(DEFAULT_VARIANT));

  const [groups, setGroups] = useState<GroupState[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>(() => allFieldsOf(DEFAULT_VARIANT));
  const [meta, setMeta] = useState<Record<string, CellValue>>(() => freshMeta(DEFAULT_VARIANT));

  const [pointErrors, setPointErrors] = useState<PointErrors | null>(null);
  const [xml, setXml] = useState('');
  const [previewGroups, setPreviewGroups] = useState<Group[]>([]);
  const [omittedGroups, setOmittedGroups] = useState<string[]>([]);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState<{ fileName: string; kind: Source } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  async function handleCsv(file: File) {
    setImportError('');
    setImporting({ fileName: file.name, kind: 'csv' });
    try {
      const g = await readSpreadsheet(file);
      const cols = fileColsOf(g);
      setGrid(g);
      setFileCols(cols);
      setMapping(freshMapping(cols, variant));
      setDefaults(freshDefaults(variant));
      setMeta(freshMeta(variant));
      setSource('csv');
      setStep('mapping');
    } catch (e) {
      setImportError(`Could not read file: ${(e as Error).message}`);
    } finally {
      setImporting(null);
    }
  }

  async function handleXml(file: File) {
    setImportError('');
    setImporting({ fileName: file.name, kind: 'xml' });
    try {
      if (!variant.parse) {
        setImportError(`${variant.label} does not support importing XML templates.`);
        return;
      }
      const text = await file.text();
      const parsed = variant.parse(text);
      const totalPoints = parsed.groups.reduce((n, g) => n + g.points.length, 0);
      if (totalPoints === 0) {
        setImportError('No <Point> elements were found in this XML file.');
        return;
      }
      setGroups(coreToState(parsed.groups));
      setMeta({ ...freshMeta(variant), ...parsed.meta });
      setVisibleFields(allFieldsOf(variant));
      setPointErrors(null);
      setSource('xml');
      setStep('edit');
    } catch (e) {
      setImportError(`Could not read XML: ${(e as Error).message}`);
    } finally {
      setImporting(null);
    }
  }

  function applyMapping(): string | null {
    const coreGroups = prepareRows(grid, mapping, defaults);
    const totalPoints = coreGroups.reduce((n, g) => n + g.points.length, 0);
    if (totalPoints === 0) {
      return 'No valid rows extracted. Check that the Name column is mapped and contains data.';
    }
    setGroups(coreToState(coreGroups));
    setVisibleFields(allFieldsOf(variant));
    setPointErrors(null);
    setStep('edit');
    return null;
  }

  function generate() {
    const coreGroups = stateToCore(groups);
    const nonEmpty = coreGroups.filter((g) => g.points.length > 0);
    const omitted = coreGroups.filter((g) => g.points.length === 0).map((g) => g.name);

    const errors: PointErrors = {};
    let hasErrors = false;
    groups.forEach((g) => {
      g.points.forEach((p) => {
        const errs = variant.validateRow(p.data);
        if (Object.keys(errs).length > 0) {
          errors[p.id] = errs;
          hasErrors = true;
        }
      });
    });

    if (hasErrors) {
      setPointErrors(errors);
      return;
    }

    setPointErrors(null);
    const builtXml = variant.serialize(nonEmpty, meta);
    setXml(builtXml);
    setPreviewGroups(nonEmpty);
    setOmittedGroups(omitted);
    setStep('preview');
  }

  function newImport() {
    setGrid([]);
    setFileCols([]);
    setGroups([]);
    setXml('');
    setPreviewGroups([]);
    setOmittedGroups([]);
    setPointErrors(null);
    setImportError('');
    setImporting(null);
    setStep('import');
  }

  return (
    <div className="app-shell">
      <StepHeader
        step={step}
        source={source}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />
      <main className="app-main">
        <div className="app-content">
          <div className="step-hint-bar">
            <span className="step-hint-text">{STEP_HINTS[step]}</span>
            <button
              type="button"
              className="link-btn step-hint-link"
              onClick={() => setHelpOpen(true)}
              aria-label="Open how-to-use guide"
            >
              ? guide
            </button>
          </div>
          {step === 'import' && (
            <ImportStep
              variants={VARIANTS}
              variant={variant}
              setVariant={setVariant}
              onCsv={handleCsv}
              onXml={handleXml}
              error={importError}
              importing={importing}
              onOpenHelp={() => setHelpOpen(true)}
            />
          )}
          {step === 'mapping' && (
            <MappingStep
              fields={variant.fields}
              fileCols={fileCols}
              mapping={mapping}
              setMapping={setMapping}
              defaults={defaults}
              setDefaults={setDefaults}
              onBack={() => setStep('import')}
              onApply={applyMapping}
            />
          )}
          {step === 'edit' && (
            <EditStep
              source={source}
              fields={variant.fields}
              groups={groups}
              setGroups={setGroups}
              visibleFields={visibleFields}
              setVisibleFields={setVisibleFields}
              metadataFields={variant.metadata}
              bulkEditSchema={variant.bulkEditSchema ?? []}
              warnRow={variant.warnRow}
              findReplaceFields={variant.findReplaceFields ?? []}
              meta={meta}
              setMeta={setMeta}
              pointErrors={pointErrors}
              onBack={() => setStep(source === 'xml' ? 'import' : 'mapping')}
              onGenerate={generate}
            />
          )}
          {step === 'preview' && (
            <PreviewStep
              xml={xml}
              groups={previewGroups}
              templateLabel={String(meta[variant.metadata[0]?.key ?? ''] ?? '')}
              spreadsheetColumns={variant.spreadsheetColumns}
              visibleFields={visibleFields}
              omittedGroups={omittedGroups}
              onBack={() => setStep('edit')}
              onNew={newImport}
            />
          )}
        </div>
      </main>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}
