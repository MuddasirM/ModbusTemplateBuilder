import { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { CellValue, Row } from '../core/row';
import type { BulkEditField, FieldDef, FindReplaceFieldDef, MetadataFieldDef } from '../core/variants/types';
import type { PointErrors, Source, GroupState, PointState } from '../App';
import type { Dispatch, SetStateAction } from 'react';

let _idCtr = 1000;
const newId = () => String(++_idCtr);

// ── Find & Replace (multi-select) ────────────────────────────────────────────
function replaceSubstring(value: string, find: string, replace: string, caseSensitive: boolean): string {
  if (find === '') return value;
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return value.replace(new RegExp(escaped, caseSensitive ? 'g' : 'gi'), () => replace);
}

// Mirrors commitPointField's join-existing-or-create-new behaviour, generalised
// to a batch of points whose group_name values changed via find & replace - so
// the structural group always agrees with each point's group_name field, the
// same invariant a manual inline edit + blur maintains.
function moveToMatchingGroups(groupsIn: GroupState[], pointIds: string[]): GroupState[] {
  let next = groupsIn;
  for (const pointId of pointIds) {
    const source = next.find((g) => g.points.some((p) => p.id === pointId));
    const point = source?.points.find((p) => p.id === pointId);
    if (!source || !point) continue;

    const name = point.data.group_name ?? '';
    if (source.name === name) continue;

    const target = next.find((g) => g.name === name);
    const withoutPoint = next.map((g) =>
      g.id !== source.id ? g : { ...g, points: g.points.filter((p) => p.id !== pointId) },
    );
    next = target
      ? withoutPoint.map((g) => g.id !== target.id ? g : { ...g, points: [...g.points, point] })
      : [...withoutPoint, { id: newId(), name, points: [point] }];
  }
  return next;
}

interface Props {
  source: Source;
  fields: FieldDef[];
  groups: GroupState[];
  setGroups: Dispatch<SetStateAction<GroupState[]>>;
  visibleFields: string[];
  setVisibleFields: (f: string[]) => void;
  metadataFields: MetadataFieldDef[];
  meta: Record<string, CellValue>;
  setMeta: Dispatch<SetStateAction<Record<string, CellValue>>>;
  bulkEditSchema: BulkEditField[];
  warnRow?: (row: Row) => Record<string, string>;
  findReplaceFields: FindReplaceFieldDef[];
  pointErrors: PointErrors | null;
  onBack: () => void;
  onGenerate: () => void;
}

// ── Confirm dialog (shared by group-delete and column-clear) ─────────────────
interface ConfirmDialogProps {
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.showModal();
    const handleCancel = () => onCancel();
    el.addEventListener('cancel', handleCancel);
    return () => el.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom
    ) onCancel();
  }

  return (
    <dialog ref={ref} className="confirm-dialog" onClick={handleBackdrop}>
      <div className="confirm-inner">
        <p className="confirm-msg">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ── Bulk edit modal (multi-select mode) ──────────────────────────────────────
interface BulkEditModalProps {
  schema: BulkEditField[];
  groupNames: string[];
  count: number;
  onApply: (values: Record<string, string>) => void;
  onCancel: () => void;
}

function BulkEditModal({ schema, groupNames, count, onApply, onCancel }: BulkEditModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.showModal();
    const handleCancel = () => onCancel();
    el.addEventListener('cancel', handleCancel);
    return () => el.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom
    ) onCancel();
  }

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handleApply() {
    const filled = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.trim() !== ''),
    );
    onApply(filled);
  }

  return (
    <dialog ref={ref} className="bulk-edit-dialog" onClick={handleBackdrop}>
      <div className="bulk-edit-inner">
        <div className="bulk-edit-header">
          <span className="bulk-edit-title">// bulk edit</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            [×]
          </button>
        </div>

        <p className="bulk-edit-disclaimer">
          All {count} selected row{count !== 1 ? 's' : ''} will be updated with the values entered below.
        </p>

        <div className="bulk-edit-body">
          {schema.map((f) => {
            const options = f.type === 'dropdown'
              ? (f.key === 'group_name' ? groupNames.map((n) => ({ value: n, label: n })) : f.options)
              : null;
            return (
              <div key={f.key} className="field-group">
                <label className="field-label" htmlFor={`bulk-${f.key}`}>{f.label}</label>
                {options ? (
                  <select
                    id={`bulk-${f.key}`}
                    className="field-select"
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  >
                    <option value="">(leave unchanged)</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`bulk-${f.key}`}
                    className="field-input"
                    type={f.type === 'number' ? 'number' : 'text'}
                    min={f.type === 'number' ? f.min : undefined}
                    max={f.type === 'number' ? f.max : undefined}
                    placeholder="(leave unchanged)"
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="bulk-edit-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ── Find & Replace modal (multi-select mode) ─────────────────────────────────
interface FindReplaceColumn {
  key: string;
  label: string;
  numeric: boolean;
}

interface FindReplaceParams {
  column: string;
  find: string;
  replace: string;
  caseSensitive: boolean;
}

interface FindReplaceModalProps {
  columns: FindReplaceColumn[];
  groups: GroupState[];
  selectedIds: Set<string>;
  onApply: (params: FindReplaceParams) => void;
  onCancel: () => void;
}

function FindReplaceModal({ columns, groups, selectedIds, onApply, onCancel }: FindReplaceModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [column, setColumn] = useState(columns[0]?.key ?? '');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.showModal();
    const handleCancel = () => onCancel();
    el.addEventListener('cancel', handleCancel);
    return () => el.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom
    ) onCancel();
  }

  const selected = columns.find((c) => c.key === column) ?? columns[0] ?? null;
  const numeric = selected?.numeric ?? false;
  const selectedCount = selectedIds.size;

  let matchCount = 0;
  if (find !== '' && selected) {
    for (const g of groups) {
      for (const p of g.points) {
        if (!selectedIds.has(p.id)) continue;
        const cellValue = String(p.data[selected.key] ?? '');
        if (numeric) {
          if (cellValue.trim() === find.trim()) matchCount++;
        } else {
          const a = caseSensitive ? cellValue : cellValue.toLowerCase();
          const b = caseSensitive ? find : find.toLowerCase();
          if (a.includes(b)) matchCount++;
        }
      }
    }
  }

  const replaceTrim = replace.trim();
  const replaceInvalid = numeric && (replaceTrim === '' || !Number.isFinite(Number(replaceTrim)));
  const canApply = !!selected && find !== '' && !replaceInvalid;

  function handleApply() {
    if (!selected || !canApply) return;
    onApply({ column: selected.key, find, replace, caseSensitive });
  }

  return (
    <dialog ref={ref} className="bulk-edit-dialog" onClick={handleBackdrop}>
      <div className="bulk-edit-inner">
        <div className="bulk-edit-header">
          <span className="bulk-edit-title">// find &amp; replace</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            [×]
          </button>
        </div>

        <div className="bulk-edit-body">
          <div className="field-group">
            <label className="field-label" htmlFor="fr-column">Column</label>
            <select
              id="fr-column"
              className="field-select"
              value={column}
              onChange={(e) => setColumn(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="fr-find">Find</label>
            <input
              id="fr-find"
              className="field-input"
              type="text"
              value={find}
              onChange={(e) => setFind(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="fr-replace">Replace with</label>
            <input
              id="fr-replace"
              className="field-input"
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
            />
            {replaceInvalid && (
              <span className="field-error-msg">
                {replaceTrim === '' ? 'Enter a number.' : 'Must be a number.'}
              </span>
            )}
          </div>

          <label className="col-menu-item find-replace-checkbox">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            Case sensitive
          </label>

          <p className="find-replace-preview">
            {find === ''
              ? '—'
              : `${matchCount} match${matchCount !== 1 ? 'es' : ''} in ${selectedCount} selected row${selectedCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="bulk-edit-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!canApply} onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ── Column visibility dropdown ────────────────────────────────────────────────
interface ColumnVisibilityMenuProps {
  fields: FieldDef[];
  visibleFields: string[];
  onToggle: (key: string) => void;
  disabled?: boolean;
}

function ColumnVisibilityMenu({ fields, visibleFields, onToggle, disabled = false }: ColumnVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const optional = fields.filter((f) => !f.required);

  return (
    <div className="col-menu" ref={ref}>
      <button type="button" className="btn btn-sm" onClick={() => setOpen((o) => !o)} disabled={disabled} title="Show or hide table columns">
        Columns ▾
      </button>
      {open && (
        <div className="col-menu-panel">
          {optional.map((f) => (
            <label key={f.key} className="col-menu-item">
              <input
                type="checkbox"
                checked={visibleFields.includes(f.key)}
                onChange={() => onToggle(f.key)}
              />
              {f.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drag handle icon ──────────────────────────────────────────────────────────
function DragHandle({ muted, ...props }: React.HTMLAttributes<HTMLSpanElement> & { muted?: boolean }) {
  return (
    <span className={`drag-handle${muted ? ' drag-handle-muted' : ''}`} aria-hidden="true" {...props}>
      ⠿
    </span>
  );
}

// ── Sortable point row ────────────────────────────────────────────────────────
interface PointRowProps {
  point: PointState;
  groupId: string;
  columns: FieldDef[];
  rowNum: number;
  errors: Record<string, string> | undefined;
  warnRow?: (row: Row) => Record<string, string>;
  onUpdate: (key: string, val: string) => void;
  onCommit: (key: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  multiSelectMode?: boolean;
  selected?: boolean;
  onSelectPointerDown?: (e: React.PointerEvent) => void;
  onSelectKeyDown?: (e: React.KeyboardEvent) => void;
  overlay?: boolean;
}

const PointRow = memo(function PointRow({
  point,
  groupId,
  columns,
  rowNum,
  errors,
  warnRow,
  onUpdate,
  onCommit,
  onDelete,
  onDuplicate,
  multiSelectMode = false,
  selected = false,
  onSelectPointerDown,
  onSelectKeyDown,
  overlay = false,
}: PointRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: point.id, data: { type: 'point', groupId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
  };

  const rowClasses = [
    isDragging && !overlay ? 'row-dragging' : '',
    multiSelectMode ? 'row-select-mode' : '',
    selected ? 'row-selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={rowClasses || undefined}
      data-point-id={point.id}
    >
      {multiSelectMode && (
        <td className="select-cell">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => { /* selection state is driven by pointer/keyboard handlers */ }}
            onPointerDown={onSelectPointerDown}
            onKeyDown={onSelectKeyDown}
            aria-label={`Select row ${rowNum}`}
          />
        </td>
      )}
      <td className="drag-cell">
        <DragHandle muted={multiSelectMode} {...(multiSelectMode ? {} : { ...attributes, ...listeners })} />
      </td>
      <td className="row-num">{rowNum}</td>
      {(() => {
        const rowWarnings = warnRow?.(point.data);
        return columns.map((f) => {
        const invalid = errors?.[f.key];
        const warningMsg = !invalid ? rowWarnings?.[f.key] : undefined;
        const cellClass = invalid ? 'cell-invalid' : warningMsg ? 'cell-warning' : undefined;
        const cellTitle = invalid || warningMsg;
        const choiceOpts =
          f.type === 'choice' && f.choices
            ? f.choices.includes(point.data[f.key]) || !point.data[f.key]
              ? f.choices
              : [point.data[f.key], ...f.choices]
            : null;
        return (
          <td key={f.key} className={cellClass} title={cellTitle}>
            {choiceOpts ? (
              <select
                className="field-select"
                value={point.data[f.key] ?? ''}
                onChange={(e) => onUpdate(f.key, e.target.value)}
                onBlur={() => onCommit(f.key)}
                disabled={multiSelectMode}
                title={!cellTitle && point.data[f.key] ? String(point.data[f.key]) : undefined}
              >
                {choiceOpts.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input
                className="field-input"
                value={point.data[f.key] ?? ''}
                onChange={(e) => onUpdate(f.key, e.target.value)}
                onBlur={() => onCommit(f.key)}
                disabled={multiSelectMode}
                title={!cellTitle && point.data[f.key] ? String(point.data[f.key]) : undefined}
              />
            )}
          </td>
        );
        });
      })()}
      <td className="row-actions">
        <button type="button" className="btn btn-ghost btn-sm" title="Duplicate row" onClick={onDuplicate} disabled={multiSelectMode}>
          ⧉
        </button>
        <button type="button" className="btn btn-danger btn-sm" title="Delete row" onClick={onDelete} disabled={multiSelectMode}>
          ×
        </button>
      </td>
    </tr>
  );
}, (prev, next) =>
  prev.point === next.point &&
  prev.rowNum === next.rowNum &&
  prev.errors === next.errors &&
  prev.columns === next.columns &&
  prev.multiSelectMode === next.multiSelectMode &&
  prev.selected === next.selected &&
  prev.overlay === next.overlay,
);

// ── Group selection checkbox (tri-state: off / on / indeterminate) ───────────
interface GroupCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}

function GroupCheckbox({ checked, indeterminate, onChange }: GroupCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label="Select all rows in this group"
    />
  );
}

// ── Sortable group section ────────────────────────────────────────────────────
interface GroupSectionProps {
  group: GroupState;
  columns: FieldDef[];
  pointErrors: PointErrors | null;
  warnRow?: (row: Row) => Record<string, string>;
  globalRowOffset: number;
  searchActive: boolean;
  pointMatches: (p: PointState) => boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUpdatePoint: (pointId: string, key: string, val: string) => void;
  onCommitPoint: (pointId: string, key: string) => void;
  onDeletePoint: (pointId: string) => void;
  onDuplicatePoint: (pointId: string) => void;
  multiSelectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleGroupSelect?: (group: GroupState) => void;
  onPointSelectPointerDown?: (pointId: string, e: React.PointerEvent) => void;
  onPointSelectKeyDown?: (pointId: string, e: React.KeyboardEvent) => void;
  overlay?: boolean;
}

function GroupSection({
  group,
  columns,
  pointErrors,
  warnRow,
  globalRowOffset,
  searchActive,
  pointMatches,
  onRename,
  onDelete,
  onUpdatePoint,
  onCommitPoint,
  onDeletePoint,
  onDuplicatePoint,
  multiSelectMode = false,
  selectedIds,
  onToggleGroupSelect,
  onPointSelectPointerDown,
  onPointSelectKeyDown,
  overlay = false,
}: GroupSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, data: { type: 'group' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
  };

  const isEmpty = group.points.length === 0;
  const visiblePoints = searchActive ? group.points.filter(pointMatches) : group.points;
  const pointIds = visiblePoints.map((p) => p.id);
  const noMatches = searchActive && !isEmpty && visiblePoints.length === 0;

  // Full-width spans must grow by one when the checkbox column is present.
  const extraCol = multiSelectMode ? 1 : 0;
  const selectedCount = selectedIds ? group.points.filter((p) => selectedIds.has(p.id)).length : 0;
  const groupChecked = !isEmpty && selectedCount === group.points.length;
  const groupIndeterminate = selectedCount > 0 && selectedCount < group.points.length;

  return (
    <tbody ref={setNodeRef} style={style} className="group-section">
      {/* Group header row */}
      <tr className={`group-header-row${isEmpty ? ' group-empty' : ''}`}>
        {multiSelectMode && (
          <td className="select-cell">
            {!isEmpty && (
              <GroupCheckbox
                checked={groupChecked}
                indeterminate={groupIndeterminate}
                onChange={() => onToggleGroupSelect?.(group)}
              />
            )}
          </td>
        )}
        <td className="drag-cell">
          <DragHandle muted={multiSelectMode} {...(multiSelectMode ? {} : { ...attributes, ...listeners })} />
        </td>
        <td colSpan={columns.length + 1} className="group-header-cell">
          <div className="group-header-inner">
            <input
              className="group-name-input"
              value={group.name}
              onChange={(e) => onRename(e.target.value)}
              disabled={multiSelectMode}
              aria-label="Group name"
            />
            <span className="group-point-count">({group.points.length})</span>
            {isEmpty && (
              <span className="group-empty-badge">empty, will not be exported</span>
            )}
          </div>
        </td>
        <td className="row-actions">
          <button
            type="button"
            className="btn btn-danger btn-sm"
            title="Delete group"
            onClick={onDelete}
            disabled={multiSelectMode}
          >
            ×
          </button>
        </td>
      </tr>

      {/* Point rows */}
      <SortableContext items={pointIds} strategy={verticalListSortingStrategy}>
        {visiblePoints.map((point) => (
          <PointRow
            key={point.id}
            point={point}
            groupId={group.id}
            columns={columns}
            rowNum={globalRowOffset + group.points.indexOf(point) + 1}
            errors={pointErrors?.[point.id]}
            warnRow={warnRow}
            onUpdate={(key, val) => onUpdatePoint(point.id, key, val)}
            onCommit={(key) => onCommitPoint(point.id, key)}
            onDelete={() => onDeletePoint(point.id)}
            onDuplicate={() => onDuplicatePoint(point.id)}
            multiSelectMode={multiSelectMode}
            selected={selectedIds?.has(point.id) ?? false}
            onSelectPointerDown={(e) => onPointSelectPointerDown?.(point.id, e)}
            onSelectKeyDown={(e) => onPointSelectKeyDown?.(point.id, e)}
          />
        ))}
      </SortableContext>

      {isEmpty && (
        <tr className="group-empty-row">
          <td colSpan={columns.length + 3 + extraCol} className="group-empty-cell">
            No points. Drag points here or delete this group.
          </td>
        </tr>
      )}
      {noMatches && (
        <tr className="group-empty-row">
          <td colSpan={columns.length + 3 + extraCol} className="group-empty-cell">
            No rows match your search.
          </td>
        </tr>
      )}
    </tbody>
  );
}

// ── Main EditStep ─────────────────────────────────────────────────────────────
export function EditStep({
  source,
  fields,
  groups,
  setGroups,
  visibleFields,
  setVisibleFields,
  metadataFields,
  meta,
  setMeta,
  bulkEditSchema,
  warnRow,
  findReplaceFields,
  pointErrors,
  onBack,
  onGenerate,
}: Props) {
  const columns = fields.filter((f) => visibleFields.includes(f.key));
  const fieldByKey = Object.fromEntries(fields.map((f) => [f.key, f]));

  function updateMeta(key: string, val: string) {
    setMeta((prev) => ({ ...prev, [key]: val }));
  }

  // Confirm-delete state (feature 1)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string; name: string; count: number;
  } | null>(null);

  // Confirm-delete state for individual rows
  const [confirmDeletePoint, setConfirmDeletePoint] = useState<{
    groupId: string; pointId: string; name: string;
  } | null>(null);

  // Confirm-clear-column-data state
  const [confirmClearField, setConfirmClearField] = useState<{
    key: string; label: string; count: number;
  } | null>(null);

  // Row search
  const [searchQuery, setSearchQuery] = useState('');

  // ── Multi-select mode ─────────────────────────────────────────────────────
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<{ count: number } | null>(null);

  const exitMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  function toggleMultiSelect() {
    if (multiSelectMode) {
      exitMultiSelect();
    } else {
      // Selection ranges and Shift+Arrow nav assume every row is visible.
      setSearchQuery('');
      setMultiSelectMode(true);
    }
  }

  // ESC cancels multi-select, but only when no dialog is on top of it - an
  // open dialog's own `cancel` handler should get the keypress first.
  useEffect(() => {
    if (!multiSelectMode) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (bulkEditOpen || findReplaceOpen || confirmBulkDelete || confirmDelete || confirmDeletePoint || confirmClearField) return;
      exitMultiSelect();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [multiSelectMode, bulkEditOpen, findReplaceOpen, confirmBulkDelete, confirmDelete, confirmDeletePoint, confirmClearField, exitMultiSelect]);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'group' | 'point' | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // ── Column resize ─────────────────────────────────────────────────────────
  const DEFAULT_WIDTHS: Record<string, number> = {
    point_name: 180, point_type: 100, register_index: 90, group_name: 120, register_type: 100,
    data_format: 90, unit: 70, scaling: 76, decimals: 72, min_val: 76, max_val: 76,
  };
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null);

  function startResize(e: React.MouseEvent, key: string) {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { key, startX: e.clientX, startW: colWidths[key] ?? 90 };

    function onMove(ev: MouseEvent) {
      if (!resizing.current) return;
      const w = Math.max(48, resizing.current.startW + ev.clientX - resizing.current.startX);
      setColWidths((prev) => ({ ...prev, [resizing.current!.key]: w }));
    }
    function onUp() {
      resizing.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Group mutations ───────────────────────────────────────────────────────
  // Renaming a group must also update every point's group_name field, so the
  // tree label and the exported data never disagree (the other half of this
  // sync lives in commitPointField below, for edits coming from the row side).
  const renameGroup = useCallback((groupId: string, name: string) => {
    setGroups((prev) => prev.map((g) => g.id !== groupId ? g : {
      ...g,
      name,
      points: g.points.map((p) => ({ ...p, data: { ...p.data, group_name: name } })),
    }));
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  function addGroup() {
    const taken = new Set(groups.map((g) => g.name));
    let n = 1;
    while (taken.has(`Group ${n}`)) n++;
    setGroups([...groups, { id: newId(), name: `Group ${n}`, points: [] }]);
  }

  // ── Point mutations ───────────────────────────────────────────────────────
  const updatePoint = useCallback((groupId: string, pointId: string, key: string, val: string) => {
    setGroups((prev) => prev.map((g) =>
      g.id !== groupId ? g : {
        ...g,
        points: g.points.map((p) =>
          p.id !== pointId ? p : { ...p, data: { ...p.data, [key]: val } },
        ),
      },
    ));
  }, []);

  // Committing a row's Group cell (on blur, so the row doesn't jump groups on
  // every keystroke) moves the point into the group matching its new value:
  // joins an existing group of that name, or creates one. The other half of
  // this sync (renaming a group updates its rows) lives in renameGroup above.
  const commitPointField = useCallback((groupId: string, pointId: string, key: string) => {
    if (key !== 'group_name') return;
    setGroups((prev) => {
      const source = prev.find((g) => g.id === groupId);
      const point = source?.points.find((p) => p.id === pointId);
      if (!source || !point) return prev;

      const name = point.data.group_name ?? '';
      if (source.name === name) return prev;

      const target = prev.find((g) => g.name === name);
      const withoutPoint = prev.map((g) =>
        g.id !== groupId ? g : { ...g, points: g.points.filter((p) => p.id !== pointId) },
      );

      if (target) {
        return withoutPoint.map((g) =>
          g.id !== target.id ? g : { ...g, points: [...g.points, point] },
        );
      }
      return [...withoutPoint, { id: newId(), name, points: [point] }];
    });
  }, []);

  const deletePoint = useCallback((groupId: string, pointId: string) => {
    setGroups((prev) => prev.map((g) =>
      g.id !== groupId ? g : { ...g, points: g.points.filter((p) => p.id !== pointId) },
    ));
  }, []);

  const duplicatePoint = useCallback((groupId: string, pointId: string) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const idx = g.points.findIndex((p) => p.id === pointId);
      if (idx < 0) return g;
      const clone: PointState = { id: newId(), data: { ...g.points[idx].data } };
      const next = [...g.points];
      next.splice(idx + 1, 0, clone);
      return { ...g, points: next };
    }));
  }, []);

  function shiftAddresses(delta: number) {
    setGroups(groups.map((g) => ({
      ...g,
      points: g.points.map((p) => {
        const t = (p.data.register_index ?? '').trim();
        if (/^[+-]?\d+$/.test(t)) {
          return { ...p, data: { ...p.data, register_index: String(parseInt(t, 10) + delta) } };
        }
        return p;
      }),
    })));
  }

  // ── Column data clearing (× on a column header) ───────────────────────────
  function clearFieldData(key: string) {
    setGroups(groups.map((g) => ({
      ...g,
      points: g.points.map((p) => ({ ...p, data: { ...p.data, [key]: '' } })),
    })));
  }

  function requestClearField(key: string, label: string) {
    let count = 0;
    for (const g of groups) {
      for (const p of g.points) {
        if (String(p.data[key] ?? '').trim() !== '') count++;
      }
    }
    if (count === 0) {
      clearFieldData(key);
      return;
    }
    setConfirmClearField({ key, label, count });
  }

  // ── Scroll to first error ─────────────────────────────────────────────────
  function jumpToFirstError() {
    const el = document.querySelector(
      '.cell-invalid input, .cell-invalid select',
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function onDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current as { type: 'group' | 'point'; groupId?: string };
    setActiveId(String(active.id));
    setActiveType(data.type);
    setActiveGroupId(data.groupId ?? null);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { type: string; groupId?: string };
    if (activeData.type !== 'point') return;

    const activePointId = String(active.id);
    const overData = over.data.current as { type: string; groupId?: string } | undefined;

    // Determine the target group: either the group containing the over-point, or the group itself.
    let targetGroupId: string | null = null;
    if (overData?.type === 'point') {
      targetGroupId = overData.groupId ?? null;
    } else if (overData?.type === 'group') {
      targetGroupId = String(over.id);
    }

    const sourceGroupId = activeData.groupId ?? null;
    if (!targetGroupId || targetGroupId === sourceGroupId) return;

    // Move the point to the target group.
    setGroups((prev) => {
      const sourceGroup = prev.find((g) => g.id === sourceGroupId);
      const targetGroup = prev.find((g) => g.id === targetGroupId);
      if (!sourceGroup || !targetGroup) return prev;

      const point = sourceGroup.points.find((p) => p.id === activePointId);
      if (!point) return prev;

      return prev.map((g) => {
        if (g.id === sourceGroupId) {
          return { ...g, points: g.points.filter((p) => p.id !== activePointId) };
        }
        if (g.id === targetGroupId) {
          // Find position: insert before over-item if it's a point in target group
          const overPointIdx = g.points.findIndex((p) => p.id === String(over.id));
          const next = [...g.points];
          if (overPointIdx >= 0) {
            next.splice(overPointIdx, 0, point);
          } else {
            next.push(point);
          }
          return { ...g, points: next };
        }
        return g;
      });
    });

    // Update active item's groupId so subsequent onDragOver events are correct.
    setActiveGroupId(targetGroupId);
    if (active.data.current) {
      (active.data.current as Record<string, unknown>).groupId = targetGroupId;
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    setActiveGroupId(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { type: string; groupId?: string };

    if (activeData.type === 'group') {
      // Reorder groups. `over` may land on another group's header OR on one of
      // its point rows (closestCenter doesn't know to prefer group-level
      // droppables over nested point ones), so resolve the target group from
      // whichever we hit, the same way onDragOver resolves point drop targets.
      const overData = over.data.current as { type?: string; groupId?: string } | undefined;
      const overGroupId = overData?.type === 'group'
        ? String(over.id)
        : overData?.type === 'point'
          ? overData.groupId ?? null
          : null;
      if (!overGroupId) return;
      setGroups((prev) => {
        const oldIdx = prev.findIndex((g) => g.id === String(active.id));
        const newIdx = prev.findIndex((g) => g.id === overGroupId);
        if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    } else if (activeData.type === 'point') {
      // Reorder within group (cross-group moves handled in onDragOver)
      const currentGroupId = activeData.groupId;
      setGroups((prev) => {
        const grp = prev.find((g) => g.id === currentGroupId);
        if (!grp) return prev;
        const oldIdx = grp.points.findIndex((p) => p.id === String(active.id));
        const newIdx = grp.points.findIndex((p) => p.id === String(over.id));
        if (oldIdx < 0 || newIdx < 0) return prev;
        return prev.map((g) =>
          g.id === currentGroupId ? { ...g, points: arrayMove(g.points, oldIdx, newIdx) } : g,
        );
      });
    }
  }

  // ── Error summary ─────────────────────────────────────────────────────────
  const errorSummary: string[] = [];
  if (pointErrors) {
    groups.forEach((g) => {
      g.points.forEach((p) => {
        const errs = pointErrors[p.id];
        if (!errs) return;
        for (const key of Object.keys(errs)) {
          errorSummary.push(`${p.data.point_name || '(unnamed)'} › ${fieldByKey[key]?.label ?? key}: ${errs[key]}`);
        }
      });
    });
  }

  // Variant warnings: non-blocking, counted separately from hard errors.
  // Counts points (matching how errorSummary counts points with errors, not
  // individual field-level messages).
  let warningCount = 0;
  if (warnRow) {
    groups.forEach((g) => {
      g.points.forEach((p) => {
        if (Object.keys(warnRow(p.data)).length > 0) warningCount++;
      });
    });
  }

  // Global row counter offsets per group
  const rowOffsets: number[] = [];
  let offset = 0;
  for (const g of groups) {
    rowOffsets.push(offset);
    offset += g.points.length;
  }

  const totalPoints = groups.reduce((n, g) => n + g.points.length, 0);
  const groupIds = groups.map((g) => g.id);

  // ── Row search ────────────────────────────────────────────────────────────
  const searchQueryNorm = searchQuery.trim().toLowerCase();
  const searchActive = searchQueryNorm !== '';
  const pointMatches = useCallback((p: PointState) =>
    fields.some((f) => String(p.data[f.key] ?? '').toLowerCase().includes(searchQueryNorm)),
    [fields, searchQueryNorm]);

  // ── Multi-select mechanics ────────────────────────────────────────────────
  // Render-order list of every point id, the basis for range selection and
  // Shift+Arrow nav (both need to walk rows across group boundaries).
  const flatPointIds = groups.flatMap((g) => g.points.map((p) => p.id));

  const dragSelectRef = useRef<{
    anchorId: string;
    select: boolean;
    base: Set<string>;
  } | null>(null);

  function selectionRange(fromId: string, toId: string): string[] {
    const a = flatPointIds.indexOf(fromId);
    const b = flatPointIds.indexOf(toId);
    if (a < 0 || b < 0) return [fromId];
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return flatPointIds.slice(lo, hi + 1);
  }

  function applySelectionRange(toId: string) {
    const ds = dragSelectRef.current;
    if (!ds) return;
    const range = selectionRange(ds.anchorId, toId);
    const next = new Set(ds.base);
    for (const id of range) {
      if (ds.select) next.add(id); else next.delete(id);
    }
    setSelectedIds(next);
  }

  // Click-to-toggle and click-and-drag range selection share this entry
  // point: a plain click is just a one-row "range".
  function onPointSelectPointerDown(pointId: string, e: React.PointerEvent) {
    if (!multiSelectMode) return;
    e.preventDefault();
    dragSelectRef.current = {
      anchorId: pointId,
      select: !selectedIds.has(pointId),
      base: new Set(selectedIds),
    };
    applySelectionRange(pointId);

    function onMove(ev: PointerEvent) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const row = el?.closest('[data-point-id]') as HTMLElement | null;
      if (row?.dataset.pointId) applySelectionRange(row.dataset.pointId);
    }
    function onUp() {
      dragSelectRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // Shift+Up/Down extends the selection one row at a time, across group
  // boundaries, and moves focus along with it.
  function onPointSelectKeyDown(pointId: string, e: React.KeyboardEvent) {
    if (!multiSelectMode || !e.shiftKey) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const idx = flatPointIds.indexOf(pointId);
    if (idx < 0) return;
    const nextIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= flatPointIds.length) return;
    const nextId = flatPointIds[nextIdx];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(pointId);
      next.add(nextId);
      return next;
    });
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-point-id="${nextId}"] .select-cell input[type="checkbox"]`,
      ) as HTMLElement | null;
      el?.focus();
    });
  }

  function toggleGroupSelection(group: GroupState) {
    if (group.points.length === 0) return;
    const allSelected = group.points.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of group.points) {
        if (allSelected) next.delete(p.id); else next.add(p.id);
      }
      return next;
    });
  }

  function requestBulkDelete() {
    if (selectedIds.size === 0) return;
    setConfirmBulkDelete({ count: selectedIds.size });
  }

  function applyBulkDelete() {
    setGroups((prev) => prev.map((g) => ({
      ...g,
      points: g.points.filter((p) => !selectedIds.has(p.id)),
    })));
    setConfirmBulkDelete(null);
    exitMultiSelect();
  }

  function applyBulkEdit(values: Record<string, string>) {
    const { group_name: targetGroupName, ...fieldValues } = values;
    setGroups((prev) => {
      let next = prev.map((g) => ({
        ...g,
        points: g.points.map((p) =>
          selectedIds.has(p.id) ? { ...p, data: { ...p.data, ...fieldValues } } : p,
        ),
      }));

      if (targetGroupName) {
        const moved: PointState[] = [];
        next = next.map((g) => ({
          ...g,
          points: g.points.filter((p) => {
            if (!selectedIds.has(p.id)) return true;
            moved.push({ ...p, data: { ...p.data, group_name: targetGroupName } });
            return false;
          }),
        }));

        const targetIdx = next.findIndex((g) => g.name === targetGroupName);
        if (targetIdx >= 0) {
          next = next.map((g, i) => i === targetIdx ? { ...g, points: [...g.points, ...moved] } : g);
        } else {
          next = [...next, { id: newId(), name: targetGroupName, points: moved }];
        }
      }

      return next;
    });
    setBulkEditOpen(false);
  }

  function applyFindReplace({ column, find, replace, caseSensitive }: FindReplaceParams) {
    const numeric = findReplaceFields.find((c) => c.key === column)?.numeric ?? false;
    const changedIds: string[] = [];

    let next = groups.map((g) => ({
      ...g,
      points: g.points.map((p) => {
        if (!selectedIds.has(p.id)) return p;
        const cellValue = String(p.data[column] ?? '');
        const nextValue = numeric
          ? (cellValue.trim() === find.trim() ? replace.trim() : cellValue)
          : replaceSubstring(cellValue, find, replace, caseSensitive);
        if (nextValue === cellValue) return p;
        changedIds.push(p.id);
        return { ...p, data: { ...p.data, [column]: nextValue } };
      }),
    }));

    if (column === 'group_name' && changedIds.length > 0) {
      next = moveToMatchingGroups(next, changedIds);
    }

    setGroups(next);
    setFindReplaceOpen(false);
  }

  // Columns offered in the Find & Replace modal: the variant's candidate set,
  // narrowed to fields it actually exposes (FieldDef[] may differ from the
  // bundle's full schema, e.g. via visibleFields).
  const findReplaceColumns: FindReplaceColumn[] = findReplaceFields
    .filter((c) => fieldByKey[c.key])
    .map((c) => ({ key: c.key, label: fieldByKey[c.key].label, numeric: c.numeric }));

  // Disabled reason for the generate button (feature 3)
  const generateDisabledReason =
    totalPoints === 0
      ? 'No rows to export'
      : errorSummary.length > 0
        ? `${errorSummary.length} cell${errorSummary.length !== 1 ? 's' : ''} have errors; fix them to export`
        : null;

  // Active overlay data
  const activeGroup = activeId ? groups.find((g) => g.id === activeId) : null;
  const activePoint = activeId && activeGroupId
    ? groups.find((g) => g.id === activeGroupId)?.points.find((p) => p.id === activeId)
    : null;

  const backLabel = source === 'xml' ? '← Back to Import' : '← Back to Mapping';

  // Deletions here only touch in-memory state, so the original data is never
  // actually lost: it still lives in the imported file. Confirm dialogs spell
  // out exactly how to get it back, so deleting doesn't feel permanent.
  const recoveryNote = source === 'xml'
    ? 'Going back to Import and reloading the template restores the original data.'
    : 'Going back to Mapping and applying it again restores the original data.';

  return (
    <div className="flex flex-col grow overflow-hidden">
      {/* Toolbar */}
      <div className="step-toolbar">
        {/* Row 1 — navigation: Back */}
        <div className="toolbar-row toolbar-row-nav">
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={onBack}>
            {backLabel}
          </button>
        </div>

        {/* Row 2 — template metadata (Template Name, Version, ...) */}
        <div className="toolbar-row toolbar-row-meta">
          {metadataFields.map((m) => {
            const width = m.inputType === 'string' ? 200 : m.inputType === 'date' ? 130 : 90;
            const inputType = m.inputType === 'string' ? 'text' : m.inputType;
            return (
              <div key={m.key} className="field-group" style={{ minWidth: width - 40 }}>
                <label className="field-label" htmlFor={`tpl-meta-${m.key}`}>{m.label}</label>
                <input
                  id={`tpl-meta-${m.key}`}
                  className="field-input"
                  type={inputType}
                  value={String(meta[m.key] ?? '')}
                  style={{ width }}
                  onChange={(e) => updateMeta(m.key, e.target.value)}
                  disabled={multiSelectMode}
                />
              </div>
            );
          })}
        </div>

        {/* Row 3 — table controls: search, column visibility, address shift,
            and the multi-select toggle / bulk-action cluster */}
        <div className="toolbar-row toolbar-row-table">
          <input
            type="search"
            className="field-input search-input"
            placeholder="Search rows…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={multiSelectMode}
            aria-label="Search rows"
          />

          <ColumnVisibilityMenu
            fields={fields}
            visibleFields={visibleFields}
            onToggle={(key) => setVisibleFields(
              visibleFields.includes(key) ? visibleFields.filter((k) => k !== key) : [...visibleFields, key],
            )}
            disabled={multiSelectMode}
          />

          <div className="flex items-center gap-2 shrink-0">
            <span className="toolbar-meta">Addresses:</span>
            <button type="button" className="btn btn-sm" onClick={() => shiftAddresses(-1)} disabled={multiSelectMode} title="Shift all addresses by -1">−1</button>
            <button type="button" className="btn btn-sm" onClick={() => shiftAddresses(1)} disabled={multiSelectMode} title="Shift all addresses by +1">+1</button>
          </div>

          <div className="multi-select-controls">
            {!multiSelectMode ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={toggleMultiSelect}
                title="Select multiple rows to edit or delete them together"
              >
                Select multiple
              </button>
            ) : (
              <>
                {selectedIds.size > 0 && (
                  <span className="selection-count">
                    {selectedIds.size} row{selectedIds.size !== 1 ? 's' : ''} selected
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={selectedIds.size === 0}
                  onClick={() => setBulkEditOpen(true)}
                >
                  Edit
                </button>
                {selectedIds.size > 0 && findReplaceColumns.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setFindReplaceOpen(true)}
                  >
                    Find &amp; Replace
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={selectedIds.size === 0}
                  onClick={requestBulkDelete}
                >
                  Delete
                </button>
                <button type="button" className="btn btn-sm" onClick={exitMultiSelect}>
                  OK
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Multi-select instructions banner */}
      {multiSelectMode && (
        <div className="alert alert-warning multi-select-banner" style={{ flexShrink: 0 }}>
          Click and drag across the row checkboxes to select multiple rows. Dragging anywhere
          else in the table will not select them.
        </div>
      )}

      {/* Error / warning summary */}
      {(errorSummary.length > 0 || warningCount > 0) && (
        <div
          className={`alert ${errorSummary.length > 0 ? 'alert-danger' : 'alert-warning'} error-summary-bar`}
          style={{ flexShrink: 0 }}
        >
          <span>
            {errorSummary.length > 0 ? (
              <>
                <strong>{errorSummary.length} error{errorSummary.length !== 1 ? 's' : ''}</strong>
                {': '}
                {errorSummary.slice(0, 5).join('  |  ')}
                {errorSummary.length > 5 ? `  (+${errorSummary.length - 5} more)` : ''}
                {warningCount > 0 && (
                  <span className="warning-count-muted">
                    {'  ·  '}{warningCount} warning{warningCount !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            ) : (
              <strong>{warningCount} warning{warningCount !== 1 ? 's' : ''}</strong>
            )}
          </span>
          {errorSummary.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', flexShrink: 0 }}
              onClick={jumpToFirstError}
            >
              {errorSummary.length === 1 ? 'Jump to error ↓' : 'Jump to first ↓'}
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="table-scroll">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <table className="register-table" style={{ tableLayout: 'fixed', minWidth: 600 }}>
            <thead>
              <tr>
                {multiSelectMode && <th className="select-cell" style={{ width: 32 }} />}
                <th style={{ width: 28 }} />
                <th style={{ width: 36 }}>#</th>
                {columns.map((f) => (
                  <th key={f.key} style={{ width: colWidths[f.key] ?? 90, position: 'relative' }}>
                    {f.label}
                    {f.required && (
                      <span style={{ color: 'var(--c-danger)', marginLeft: 2 }}>*</span>
                    )}
                    <button
                      type="button"
                      className="col-clear-btn"
                      title={`Clear all ${f.label} values`}
                      onClick={() => requestClearField(f.key, f.label)}
                    >
                      ×
                    </button>
                    <div
                      className="col-resize-handle"
                      onMouseDown={(e) => startResize(e, f.key)}
                    />
                  </th>
                ))}
                <th style={{ width: 60 }} />
              </tr>
            </thead>

            <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
              {groups.map((group, gi) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  columns={columns}
                  pointErrors={pointErrors}
                  warnRow={warnRow}
                  globalRowOffset={rowOffsets[gi]}
                  searchActive={searchActive}
                  pointMatches={pointMatches}
                  onRename={(name) => renameGroup(group.id, name)}
                  onDelete={() => {
                    if (group.points.length === 0) {
                      deleteGroup(group.id);
                    } else {
                      setConfirmDelete({ id: group.id, name: group.name, count: group.points.length });
                    }
                  }}
                  onUpdatePoint={(pid, key, val) => updatePoint(group.id, pid, key, val)}
                  onCommitPoint={(pid, key) => commitPointField(group.id, pid, key)}
                  onDeletePoint={(pid) => {
                    const point = group.points.find((p) => p.id === pid);
                    setConfirmDeletePoint({
                      groupId: group.id,
                      pointId: pid,
                      name: point?.data.point_name?.trim() || '(unnamed point)',
                    });
                  }}
                  onDuplicatePoint={(pid) => duplicatePoint(group.id, pid)}
                  multiSelectMode={multiSelectMode}
                  selectedIds={selectedIds}
                  onToggleGroupSelect={toggleGroupSelection}
                  onPointSelectPointerDown={onPointSelectPointerDown}
                  onPointSelectKeyDown={onPointSelectKeyDown}
                />
              ))}
            </SortableContext>

            {/* Add group footer */}
            <tbody>
              <tr>
                <td colSpan={columns.length + 3 + (multiSelectMode ? 1 : 0)} className="add-group-cell">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addGroup} disabled={multiSelectMode}>
                    + Add group
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Confirm delete dialog */}
          {confirmDelete && (
            <ConfirmDialog
              message={
                <>
                  Delete group &ldquo;{confirmDelete.name}&rdquo; and its {confirmDelete.count} row{confirmDelete.count !== 1 ? 's' : ''}?
                  {' '}This cannot be undone here. {recoveryNote}
                </>
              }
              confirmLabel="Delete"
              onConfirm={() => { deleteGroup(confirmDelete.id); setConfirmDelete(null); }}
              onCancel={() => setConfirmDelete(null)}
            />
          )}

          {/* Confirm delete-row dialog */}
          {confirmDeletePoint && (
            <ConfirmDialog
              message={
                <>
                  Delete row &ldquo;{confirmDeletePoint.name}&rdquo;?
                  {' '}This cannot be undone here. {recoveryNote}
                </>
              }
              confirmLabel="Delete"
              onConfirm={() => {
                deletePoint(confirmDeletePoint.groupId, confirmDeletePoint.pointId);
                setConfirmDeletePoint(null);
              }}
              onCancel={() => setConfirmDeletePoint(null)}
            />
          )}

          {/* Confirm clear-column-data dialog */}
          {confirmClearField && (
            <ConfirmDialog
              message={
                <>
                  Clear all &ldquo;{confirmClearField.label}&rdquo; values across {confirmClearField.count} row{confirmClearField.count !== 1 ? 's' : ''}?
                  {' '}This cannot be undone.
                </>
              }
              confirmLabel="Clear"
              onConfirm={() => { clearFieldData(confirmClearField.key); setConfirmClearField(null); }}
              onCancel={() => setConfirmClearField(null)}
            />
          )}

          {/* Confirm bulk-delete dialog */}
          {confirmBulkDelete && (
            <ConfirmDialog
              message={`Delete ${confirmBulkDelete.count} selected row${confirmBulkDelete.count !== 1 ? 's' : ''}? This cannot be undone.`}
              confirmLabel="Delete"
              onConfirm={applyBulkDelete}
              onCancel={() => setConfirmBulkDelete(null)}
            />
          )}

          {/* Bulk edit modal */}
          {bulkEditOpen && (
            <BulkEditModal
              schema={bulkEditSchema}
              groupNames={groups.map((g) => g.name)}
              count={selectedIds.size}
              onApply={applyBulkEdit}
              onCancel={() => setBulkEditOpen(false)}
            />
          )}

          {/* Find & replace modal */}
          {findReplaceOpen && (
            <FindReplaceModal
              columns={findReplaceColumns}
              groups={groups}
              selectedIds={selectedIds}
              onApply={applyFindReplace}
              onCancel={() => setFindReplaceOpen(false)}
            />
          )}

          {/* Drag overlay */}
          <DragOverlay>
            {activeType === 'group' && activeGroup && (
              <table className="register-table drag-overlay-table">
                <GroupSection
                  group={activeGroup}
                  columns={columns}
                  pointErrors={pointErrors}
                  warnRow={warnRow}
                  globalRowOffset={0}
                  searchActive={false}
                  pointMatches={pointMatches}
                  onRename={() => { }}
                  onDelete={() => { }}
                  onUpdatePoint={() => { }}
                  onCommitPoint={() => { }}
                  onDeletePoint={() => { }}
                  onDuplicatePoint={() => { }}
                  overlay
                />
              </table>
            )}
            {activeType === 'point' && activePoint && (
              <table className="register-table drag-overlay-table">
                <tbody>
                  <PointRow
                    point={activePoint}
                    groupId={activeGroupId ?? ''}
                    columns={columns}
                    rowNum={0}
                    errors={pointErrors?.[activePoint.id]}
                    warnRow={warnRow}
                    onUpdate={() => { }}
                    onCommit={() => { }}
                    onDelete={() => { }}
                    onDuplicate={() => { }}
                    overlay
                  />
                </tbody>
              </table>
            )}
          </DragOverlay>
        </DndContext>

      </div>
      <div className="step-footer">
        <span className="toolbar-meta">{totalPoints} registers</span>
        <span
          style={{
            marginLeft: 'auto',
            ...(generateDisabledReason ? { cursor: 'not-allowed' } : {}),
          }}
          title={generateDisabledReason ?? undefined}
        >
          <button
            type="button"
            className="btn btn-primary shrink-0"
            disabled={!!generateDisabledReason}
            style={generateDisabledReason ? { pointerEvents: 'none' } : undefined}
            onClick={onGenerate}
          >
            Preview XML →
          </button>
        </span>
      </div>
    </div>
  );
}
