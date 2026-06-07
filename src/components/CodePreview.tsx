// Generic code/text preview pane for the Preview step. XML output gets the
// tag/attribute/value/processing-instruction syntax highlighting (porting
// _xml_highlight's intent to HTML spans); other formats (CSV, ...) render as
// plain, escaped text in the same monospace shell.

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightXmlLine(line: string): string {
  if (line.trimStart().startsWith('<?')) {
    return `<span class="xproc">${escapeHtml(line)}</span>`;
  }
  // Tokens: opening/closing tag names, attr="value" pairs, and tag closers.
  const re = /(<\/?[\w:]+)|([\w:]+)(=)("[^"]*")|(\/?>)/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    out += escapeHtml(line.slice(last, m.index));
    if (m[1]) {
      out += `<span class="xtag">${escapeHtml(m[1])}</span>`;
    } else if (m[2] && m[4]) {
      out += `<span class="xattr">${escapeHtml(m[2])}</span>${m[3]}<span class="xval">${escapeHtml(m[4])}</span>`;
    } else if (m[5]) {
      out += `<span class="xtag">${escapeHtml(m[5])}</span>`;
    }
    last = re.lastIndex;
  }
  out += escapeHtml(line.slice(last));
  return out;
}

interface Props {
  code: string;
  /** Omit for plain, escaped text; 'xml' applies tag/attribute/value highlighting. */
  highlight?: 'xml';
}

export function CodePreview({ code, highlight }: Props) {
  if (highlight === 'xml') {
    const html = code.split('\n').map(highlightXmlLine).join('\n');
    return <pre className="code-preview" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <pre className="code-preview">{code}</pre>;
}
