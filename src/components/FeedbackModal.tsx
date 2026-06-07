import { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
}

const FEEDBACK_ADDRESS = 'feedback.mtb@bynet.dev';
const FEEDBACK_MAILTO = `mailto:${FEEDBACK_ADDRESS}`;

interface Path {
  num: string;
  heading: string;
  body: string;
  hint: string;
  Icon: () => React.ReactElement;
}

function FeedbackIcon() {
  return (
    <svg viewBox="0 0 100 80" width="64" height="51" fill="none" stroke="currentColor"
      strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      {/* message panel */}
      <rect x="14" y="14" width="62" height="42" />
      <polyline points="28,56 28,68 42,56" />
      {/* prompt + cursor */}
      <polyline points="26,30 34,38 26,46" />
      <line x1="42" y1="46" x2="60" y2="46" />
      {/* outbound signal */}
      <line x1="84" y1="40" x2="96" y2="40" />
      <circle cx="96" cy="40" r="3.5" strokeWidth="4" />
      <line x1="84" y1="22" x2="90" y2="22" />
      <line x1="84" y1="58" x2="90" y2="58" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg viewBox="0 0 100 80" width="64" height="51" fill="none" stroke="currentColor"
      strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      {/* package body */}
      <rect x="34" y="24" width="32" height="32" />
      {/* legs */}
      <line x1="34" y1="30" x2="20" y2="22" />
      <line x1="34" y1="40" x2="18" y2="40" />
      <line x1="34" y1="50" x2="20" y2="58" />
      <line x1="66" y1="30" x2="80" y2="22" />
      <line x1="66" y1="40" x2="82" y2="40" />
      <line x1="66" y1="50" x2="80" y2="58" />
      {/* fault mark */}
      <line x1="42" y1="32" x2="58" y2="48" />
      <line x1="58" y1="32" x2="42" y2="48" />
      {/* trace pad flagging the fault */}
      <polyline points="50,56 50,66 64,66" />
      <circle cx="64" cy="66" r="3.5" strokeWidth="4" />
    </svg>
  );
}

function VariantIcon() {
  return (
    <svg viewBox="0 0 100 80" width="64" height="51" fill="none" stroke="currentColor"
      strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      {/* source file */}
      <polygon points="14,14 38,14 38,22 46,22 46,66 14,66" />
      <line x1="20" y1="34" x2="40" y2="34" />
      <line x1="20" y1="44" x2="40" y2="44" />
      <line x1="20" y1="54" x2="34" y2="54" />
      {/* arrow across */}
      <line x1="54" y1="40" x2="74" y2="40" />
      <polyline points="68,32 78,40 68,48" />
      {/* target file */}
      <polygon points="78,14 96,14 96,66 64,66 64,22 72,22" />
      <circle cx="80" cy="44" r="2.5" fill="currentColor" strokeWidth="0" />
      <circle cx="88" cy="44" r="2.5" fill="currentColor" strokeWidth="0" />
      <circle cx="80" cy="54" r="2.5" fill="currentColor" strokeWidth="0" />
      <circle cx="88" cy="54" r="2.5" fill="currentColor" strokeWidth="0" />
    </svg>
  );
}

const PATHS: Path[] = [
  {
    num: '01',
    heading: 'Give Feedback',
    body: "Thoughts on the tool? Something that felt awkward, something you liked, a workflow we haven't thought of. All of it is useful.",
    hint: 'Your experience · what you were trying to do · any suggestions',
    Icon: FeedbackIcon,
  },
  {
    num: '02',
    heading: 'Report a Bug',
    body: "Something broken? Tell us what happened and we'll fix it. A screenshot helps a lot, so attach it to the email before sending.",
    hint: 'Steps to reproduce · what you expected · what actually happened · screenshot if possible',
    Icon: BugIcon,
  },
  {
    num: '03',
    heading: 'Request a Variant',
    body: "Need output for a platform we don't support yet? Send a sample input register map and a sample output file for your target platform, and we'll build the variant.",
    hint: 'Platform name · a sample register map CSV · a sample output file (XML, JSON, CSV, YAML: whatever the platform expects)',
    Icon: VariantIcon,
  },
];

export function FeedbackModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    await navigator.clipboard.writeText(FEEDBACK_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
      className="feedback-dialog"
      onClick={handleBackdropClick}
    >
      <div className="feedback-inner">
        <div className="feedback-header">
          <span className="feedback-title">// feedback</span>
          <button type="button" className="btn btn-ghost btn-sm feedback-close" onClick={onClose}>
            [×]
          </button>
        </div>

        <div className="feedback-body">
          <p className="feedback-lead">
            Three kinds of message reach the same place: pick whichever fits
            what you want to say, and use the address below to send it.
          </p>

          <div className="feedback-paths">
            {PATHS.map((p) => (
              <section key={p.num} className="feedback-path">
                <p.Icon />
                <h3 className="feedback-path-heading">
                  <span className="feedback-path-num">{p.num} /</span> {p.heading}
                </h3>
                <p className="feedback-path-body">{p.body}</p>
                <p className="feedback-path-hint">{p.hint}</p>
              </section>
            ))}
          </div>

          <p className="feedback-footer">
            Send your feedback with the relevant details to{' '}
            <a className="feedback-email-link" href={FEEDBACK_MAILTO}>
              [{FEEDBACK_ADDRESS}]
            </a>
            <button type="button" className="btn btn-ghost btn-sm feedback-copy-btn" onClick={copyAddress}>
              {copied ? 'Copied!' : 'Copy address'}
            </button>
          </p>
        </div>
      </div>
    </dialog>
  );
}
