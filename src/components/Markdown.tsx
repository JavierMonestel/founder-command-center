import type { ReactNode } from "react";

// Minimal Markdown renderer for briefs: headings, bullet lists, paragraphs,
// **bold**, _italic_ / *italic*, and `code`. Renders React nodes (no raw HTML),
// so model output can never inject markup into the page.
export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key++} className="my-2 space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700 marker:text-slate-400 list-disc">
        {list.map((li, i) => (
          <li key={i}>{inline(li)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    if (!line.trim()) continue;
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level === 1
          ? "mb-3 text-2xl font-semibold tracking-tight text-slate-900"
          : level === 2
            ? "mt-6 mb-2 border-b border-slate-100 pb-1 text-lg font-semibold text-slate-900"
            : "mt-4 mb-1 text-base font-semibold text-slate-800";
      blocks.push(
        <div key={key++} role="heading" aria-level={level} className={cls}>
          {inline(heading[2])}
        </div>,
      );
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-4 border-slate-200" />);
      continue;
    }
    blocks.push(
      <p key={key++} className="my-2 text-[15px] leading-relaxed text-slate-700">
        {inline(line)}
      </p>,
    );
  }
  flushList();
  return <div>{blocks}</div>;
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) nodes.push(<strong key={i++} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) nodes.push(<code key={i++} className="rounded bg-slate-100 px-1 py-0.5 text-[13px]">{token.slice(1, -1)}</code>);
    else nodes.push(<em key={i++} className="text-slate-500">{token.slice(1, -1)}</em>);
    last = m.index! + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
