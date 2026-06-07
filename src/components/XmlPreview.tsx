// XML syntax highlighting for the preview pane, porting _xml_highlight's intent
// (tags / attributes / values / processing instruction) to HTML spans.

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightLine(line: string): string {
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

export function XmlPreview({ xml }: { xml: string }) {
  const html = xml.split('\n').map(highlightLine).join('\n');
  return <pre className="xml-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}
