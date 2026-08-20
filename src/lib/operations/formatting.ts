// Pure formatting parser for node content (V1 plain text with lightweight
// `__underline__`, `**bold**`, `*italic*` markers). Rendered spans must never
// duplicate the source text: each character of the input belongs to exactly
// one output span.
export type FormatSpan = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };

export function parseFormatting(text: string): FormatSpan[] {
  const spans: FormatSpan[] = [];
  const uRe = /__([\s\S]*?)__/g;
  let last = 0,
    m: RegExpExecArray | null;
  while ((m = uRe.exec(text))) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) });
    spans.push({ text: m[1], underline: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  if (spans.length === 0) spans.push({ text });
  const bolded: FormatSpan[] = [];
  for (const span of spans) {
    const bRe = /\*\*([\s\S]*?)\*\*/g;
    let bl = 0,
      bm: RegExpExecArray | null,
      any = false;
    while ((bm = bRe.exec(span.text))) {
      any = true;
      if (bm.index > bl) bolded.push({ ...span, text: span.text.slice(bl, bm.index) });
      bolded.push({ ...span, text: bm[1], bold: true });
      bl = bm.index + bm[0].length;
    }
    if (bl < span.text.length) bolded.push({ ...span, text: span.text.slice(bl) });
    else if (!any) bolded.push(span);
  }
  const final: FormatSpan[] = [];
  for (const span of bolded) {
    const iRe = /\*([\s\S]*?)\*/g;
    let il = 0,
      im: RegExpExecArray | null,
      any = false;
    while ((im = iRe.exec(span.text))) {
      any = true;
      if (im.index > il) final.push({ ...span, text: span.text.slice(il, im.index) });
      final.push({ ...span, text: im[1], italic: true });
      il = im.index + im[0].length;
    }
    if (il < span.text.length) final.push({ ...span, text: span.text.slice(il) });
    else if (!any) final.push(span);
  }
  return final;
}
