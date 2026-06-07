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

import type { CellValue } from '../core/row';
import type { FieldDef, MetadataFieldDef } from '../core/variants/types';
import type { PointErrors, Source, GroupState, PointState } from '../App';
import type { Dispatch, SetStateAction } from 'react';

let _idCtr = 1000;
const newId = () => String(++_idCtr);

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
      e.clientY < rect.top  || e.clientY > rect.bottom
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

// ── Column visibility dropdown ────────────────────────────────────────────────
interface ColumnVisibilityMenuProps {
  fields: FieldDef[];
  visibleFields: string[];
  onToggle: (key: string) => void;
}

function ColumnVisibilityMenu({ fields, visibleFields, onToggle }: ColumnVisibilityMenuProps) {
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

  const optional = fields.filter((f) => !f.required);

  return (
    <div className="col-menu" ref={ref}>
      <button type="button" className="btn btn-sm" onClick={() => setOpen((o) => !o)} title="Show or hide table columns">
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
function DragHandle(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="drag-handle" aria-hidden="true" {...props}>
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
  onUpdate: (key: string, val: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  overlay?: boolean;
}

const PointRow = memo(function PointRow({
  point,
  groupId,
  columns,
  rowNum,
  errors,
  onUpdate,
  onDelete,
  onDuplicate,
  overlay = false,
}: PointRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: point.id, data: { type: 'point', groupId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={isDragging && !overlay ? 'row-dragging' : ''}>
      <td className="drag-cell">
        <DragHandle {...attributes} {...listeners} />
      </td>
      <td className="row-num">{rowNum}</td>
      {columns.map((f) => {
        const invalid = errors?.[f.key];
        const choiceOpts =
          f.type === 'choice' && f.choices
            ? f.choices.includes(point.data[f.key]) || !point.data[f.key]
              ? f.choices
              : [point.data[f.key], ...f.choices]
            : null;
        return (
          <td key={f.key} className={invalid ? 'cell-invalid' : undefined} title={invalid}>
            {choiceOpts ? (
              <select
                className="field-select"
                value={point.data[f.key] ?? ''}
                onChange={(e) => onUpdate(f.key, e.target.value)}
                title={!invalid && point.data[f.key] ? String(point.data[f.key]) : undefined}
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
                title={!invalid && point.data[f.key] ? String(point.data[f.key]) : undefined}
              />
            )}
          </td>
        );
      })}
      <td className="row-actions">
        <button type="button" className="btn btn-ghost btn-sm" title="Duplicate row" onClick={onDuplicate}>
          ⧉
        </button>
        <button type="button" className="btn btn-danger btn-sm" title="Delete row" onClick={onDelete}>
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
  prev.overlay === next.overlay,
);

// ── Sortable group section ────────────────────────────────────────────────────
interface GroupSectionProps {
  group: GroupState;
  columns: FieldDef[];
  pointErrors: PointErrors | null;
  globalRowOffset: number;
  searchActive: boolean;
  pointMatches: (p: PointState) => boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUpdatePoint: (pointId: string, key: string, val: string) => void;
  onDeletePoint: (pointId: string) => void;
  onDuplicatePoint: (pointId: string) => void;
  overlay?: boolean;
}

function GroupSection({
  group,
  columns,
  pointErrors,
  globalRowOffset,
  searchActive,
  pointMatches,
  onRename,
  onDelete,
  onUpdatePoint,
  onDeletePoint,
  onDuplicatePoint,
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

  return (
    <tbody ref={setNodeRef} style={style} className="group-section">
      {/* Group header row */}
      <tr className={`group-header-row${isEmpty ? ' group-empty' : ''}`}>
        <td className="drag-cell">
          <DragHandle {...attributes} {...listeners} />
        </td>
        <td colSpan={columns.length + 1} className="group-header-cell">
          <div className="group-header-inner">
            <input
              className="group-name-input"
              value={group.name}
              onChange={(e) => onRename(e.target.value)}
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
            onUpdate={(key, val) => onUpdatePoint(point.id, key, val)}
            onDelete={() => onDeletePoint(point.id)}
            onDuplicate={() => onDuplicatePoint(point.id)}
          />
        ))}
      </SortableContext>

      {isEmpty && (
        <tr className="group-empty-row">
          <td colSpan={columns.length + 3} className="group-empty-cell">
            No points. Drag points here or delete this group.
          </td>
        </tr>
      )}
      {noMatches && (
        <tr className="group-empty-row">
          <td colSpan={columns.length + 3} className="group-empty-cell">
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

  // Confirm-clear-column-data state
  const [confirmClearField, setConfirmClearField] = useState<{
    key: string; label: string; count: number;
  } | null>(null);

  // Row search
  const [searchQuery, setSearchQuery] = useState('');

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'group' | 'point' | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // ── Column resize ─────────────────────────────────────────────────────────
  const DEFAULT_WIDTHS: Record<string, number> = {
    point_name: 180, register_index: 90, group_name: 120, register_type: 100,
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
  const renameGroup = useCallback((groupId: string, name: string) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, name } : g));
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
      // Reorder groups
      setGroups((prev) => {
        const oldIdx = prev.findIndex((g) => g.id === String(active.id));
        const newIdx = prev.findIndex((g) => g.id === String(over.id));
        if (oldIdx < 0 || newIdx < 0) return prev;
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

  return (
    <div className="flex flex-col grow overflow-hidden">
      {/* Toolbar */}
      <div className="step-toolbar">
        <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={onBack}>
          {backLabel}
        </button>

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
              />
            </div>
          );
        })}

        <span className="toolbar-meta">{totalPoints} registers</span>

        <input
          type="search"
          className="field-input search-input"
          placeholder="Search rows…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search rows"
        />

        <ColumnVisibilityMenu
          fields={fields}
          visibleFields={visibleFields}
          onToggle={(key) => setVisibleFields(
            visibleFields.includes(key) ? visibleFields.filter((k) => k !== key) : [...visibleFields, key],
          )}
        />

        <div className="flex items-center gap-2 shrink-0">
          <span className="toolbar-meta">Addresses:</span>
          <button type="button" className="btn btn-sm" onClick={() => shiftAddresses(-1)} title="Shift all addresses by -1">−1</button>
          <button type="button" className="btn btn-sm" onClick={() => shiftAddresses(1)} title="Shift all addresses by +1">+1</button>
        </div>

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

      {/* Error summary */}
      {errorSummary.length > 0 && (
        <div className="alert alert-danger error-summary-bar" style={{ flexShrink: 0 }}>
          <span>
            <strong>{errorSummary.length} error{errorSummary.length !== 1 ? 's' : ''}</strong>
            {': '}
            {errorSummary.slice(0, 5).join('  |  ')}
            {errorSummary.length > 5 ? `  (+${errorSummary.length - 5} more)` : ''}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', flexShrink: 0 }}
            onClick={jumpToFirstError}
          >
            {errorSummary.length === 1 ? 'Jump to error ↓' : 'Jump to first ↓'}
          </button>
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
                  onDeletePoint={(pid) => deletePoint(group.id, pid)}
                  onDuplicatePoint={(pid) => duplicatePoint(group.id, pid)}
                />
              ))}
            </SortableContext>

            {/* Add group footer */}
            <tbody>
              <tr>
                <td colSpan={columns.length + 3} className="add-group-cell">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addGroup}>
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
                  {' '}This cannot be undone.
                </>
              }
              confirmLabel="Delete"
              onConfirm={() => { deleteGroup(confirmDelete.id); setConfirmDelete(null); }}
              onCancel={() => setConfirmDelete(null)}
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

          {/* Drag overlay */}
          <DragOverlay>
            {activeType === 'group' && activeGroup && (
              <table className="register-table drag-overlay-table">
                <GroupSection
                  group={activeGroup}
                  columns={columns}
                  pointErrors={pointErrors}
                  globalRowOffset={0}
                  searchActive={false}
                  pointMatches={pointMatches}
                  onRename={() => {}}
                  onDelete={() => {}}
                  onUpdatePoint={() => {}}
                  onDeletePoint={() => {}}
                  onDuplicatePoint={() => {}}
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
                    onUpdate={() => {}}
                    onDelete={() => {}}
                    onDuplicate={() => {}}
                    overlay
                  />
                </tbody>
              </table>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
