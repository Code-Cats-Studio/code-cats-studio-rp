import { Fragment, type ReactNode } from 'react';

// Markdown mínimo y seguro para las lecciones escritas en la web: no usa HTML crudo (dangerouslySetInnerHTML),
// así que el texto de una lección nunca puede ejecutar código. Soporta títulos, listas, citas, código,
// negrita, cursiva, `código`, enlaces e imágenes (solo https).

const SAFE_URL = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // orden: imagen, enlace, código, negrita, cursiva
  const re = /!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[2]) out.push(<img key={key} src={m[2]} alt={m[1]} loading="lazy" style={{ maxWidth: '100%', borderRadius: '0.75rem' }} />);
    else if (m[4]) {
      const safe = SAFE_URL.test(m[4]);
      out.push(
        safe ? (
          <a key={key} href={m[4]} target={m[4].startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{m[3]}</a>
        ) : (
          <Fragment key={key}>{m[3]}</Fragment>
        )
      );
    } else if (m[5]) out.push(<code key={key}>{m[5]}</code>);
    else if (m[6]) out.push(<strong key={key}>{m[6]}</strong>);
    else if (m[7]) out.push(<em key={key}>{m[7]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function MarkdownView({ source }: { source: string }) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++; // cierre
      blocks.push(<pre key={k++}><code>{code.join('\n')}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 5); // el h1 de la página es el título de la lección
      const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5';
      blocks.push(<Tag key={k++}>{inline(heading[2], `h${k}`)}</Tag>);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push(<hr key={k++} />); i++; continue; }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={k++}>{inline(quote.join(' '), `q${k}`)}</blockquote>);
      continue;
    }

    const ul = /^\s*[-*+]\s+/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ''));
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={k++}>
          {items.map((it, n) => <li key={n}>{inline(it, `l${k}-${n}`)}</li>)}
        </Tag>
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(```|#{1,4}\s|>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i])) {
      para.push(lines[i++]);
    }
    if (para.length === 0) para.push(lines[i++]); // línea rara que ningún bloque reconoce: se muestra como texto
    blocks.push(<p key={k++}>{inline(para.join(' '), `p${k}`)}</p>);
  }

  return <>{blocks}</>;
}
