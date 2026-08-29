import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { preprocessGaiaMarkdown } from "@/lib/gaia/preprocessMarkdown";

import "katex/dist/katex.min.css";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mb-2 mt-3 text-sm font-bold text-gray-900 first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-4 border-b border-emerald-100 pb-1.5 text-xs font-bold leading-snug text-gray-900 first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 first:mt-0">
      {children}
    </h5>
  ),
  p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-2 pl-4 marker:text-emerald-600">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-2 pl-4 marker:font-semibold marker:text-emerald-700">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed [&_.katex]:text-[11px]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-emerald-300 pl-3 text-label italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-lg bg-gray-900 px-3 py-2 text-[10px] leading-relaxed text-gray-100">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] text-gray-800">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-[10px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1.5 text-left font-semibold text-gray-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-2 py-1.5 align-top text-gray-700">{children}</td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-status-optimalDark underline underline-offset-2"
    >
      {children}
    </a>
  ),
};

interface GaiaMarkdownProps {
  content: string;
}

export function GaiaMarkdown({ content }: GaiaMarkdownProps) {
  const normalized = preprocessGaiaMarkdown(content);

  return (
    <div className="gaia-markdown text-xs leading-relaxed text-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
