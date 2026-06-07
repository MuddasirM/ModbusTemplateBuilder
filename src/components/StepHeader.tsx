import type { Source, Step } from '../App';
import { CpuIcon } from './CpuIcon';
import { useTheme } from '../hooks/useTheme';

interface Props {
  step: Step;
  source: Source;
  onOpenHelp: () => void;
  onOpenFeedback: () => void;
}

const CSV_STEPS: { key: Step; label: string }[] = [
  { key: 'import',  label: 'Import'  },
  { key: 'mapping', label: 'Map'     },
  { key: 'edit',    label: 'Edit'    },
  { key: 'preview', label: 'Preview' },
];
const XML_STEPS: { key: Step; label: string }[] = [
  { key: 'import',  label: 'Import'  },
  { key: 'edit',    label: 'Edit'    },
  { key: 'preview', label: 'Preview' },
];

export function StepHeader({ step, source, onOpenHelp, onOpenFeedback }: Props) {
  const steps = source === 'xml' ? XML_STEPS : CSV_STEPS;
  const curIdx = steps.findIndex((s) => s.key === step);
  const { theme, toggle } = useTheme();

  return (
    <header className="app-header">
      <div className="header-brand">
        <CpuIcon size={22} className="brand-icon" />
        <span>Modbus Template Builder</span>
        <span className="header-version">v1.0</span>
      </div>

      <nav className="step-trail" aria-label="Steps">
        {steps.map((s, i) => {
          const isDone   = i < curIdx;
          const isActive = i === curIdx;
          const nodeClass  = isDone ? 'is-done' : isActive ? 'is-active' : '';
          const labelClass = isDone ? 'is-done' : isActive ? 'is-active' : '';

          return (
            <div key={s.key} className="step-item">
              <span
                className={`step-node ${nodeClass}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isDone ? '✓' : i + 1}
              </span>
              <span className={`step-label ${labelClass}`}>{s.label}</span>
              {i < steps.length - 1 && (
                <span className={`step-connector ${isDone ? 'is-done' : ''}`} />
              )}
            </div>
          );
        })}
      </nav>

      <div className="header-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm theme-btn"
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm feedback-btn"
          onClick={onOpenFeedback}
          title="Send feedback"
          aria-label="Send feedback"
        >
          ✉
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm help-btn"
          onClick={onOpenHelp}
          title="How to use"
        >
          ?
        </button>
      </div>
    </header>
  );
}
