/**
 * MarkdownRenderer — Full Markdown rendering (ChatGPT-style).
 * Supports: headings, bold/italic, lists, code blocks + copy,
 * tables, blockquotes, links, inline code, horizontal rules.
 */

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-all text-zinc-500 hover:text-zinc-200 hover:bg-white/10 active:scale-95"
      aria-label="نسخ الكود"
    >
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1.5,5 3.5,7.5 8.5,2.5" />
          </svg>
          <span>تم النسخ</span>
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <path d="M2 7H1.5a1 1 0 01-1-1V1.5a1 1 0 011-1h4.5a1 1 0 011 1V2" />
          </svg>
          <span>نسخ</span>
        </>
      )}
    </button>
  );
}

// ── Component map ────────────────────────────────────────────────────────────

const components: Components = {
  // ── Headings ───────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 className="text-[1.15rem] font-bold text-foreground mt-6 mb-3 first:mt-0 leading-snug border-b border-border/30 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground mt-5 mb-2.5 first:mt-0 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[0.9rem] font-semibold text-foreground/90 mt-4 mb-2 first:mt-0 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-medium text-foreground/80 mt-3 mb-1.5 first:mt-0">
      {children}
    </h4>
  ),

  // ── Paragraph ──────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p className="text-[0.875rem] text-foreground leading-[1.8] mb-3.5 last:mb-0">
      {children}
    </p>
  ),

  // ── Emphasis ───────────────────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/85">{children}</em>
  ),

  // ── Lists ──────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="mb-3.5 last:mb-0 space-y-1.5 pl-5 list-disc marker:text-muted-foreground/40">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3.5 last:mb-0 space-y-1.5 pl-5 list-decimal marker:text-muted-foreground/50 marker:text-[0.8rem]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[0.875rem] text-foreground leading-[1.75] pl-0.5">
      {children}
    </li>
  ),

  // ── Blockquote ─────────────────────────────────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-primary/40 pl-4 pr-1 py-1 mb-3.5 last:mb-0 bg-muted/10 rounded-r-md">
      <div className="text-[0.875rem] text-muted-foreground/80 italic leading-relaxed">
        {children}
      </div>
    </blockquote>
  ),

  // ── Horizontal rule ────────────────────────────────────────────────────────
  hr: () => (
    <hr className="my-5 border-0 border-t border-border/30" />
  ),

  // ── Code — block & inline ──────────────────────────────────────────────────
  // Block code: has language-* class OR trailing newline (unlabeled fences)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  code: ({ children, className, node, ...rest }) => {
    const match = /language-(\w+)/.exec(className || "");
    const rawText = String(children);
    const isBlock = match !== null || rawText.endsWith("\n");
    const codeText = rawText.replace(/\n$/, "");

    if (isBlock) {
      const language = match?.[1] ?? "";
      return (
        <div className="mb-3.5 last:mb-0 rounded-xl overflow-hidden border border-white/[0.07] bg-[#111111] shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {language || "code"}
            </span>
            <CopyButton text={codeText} />
          </div>
          {/* Body */}
          <pre className="overflow-x-auto px-4 py-4 text-[12.5px] leading-[1.7] font-mono text-zinc-200 m-0">
            <code>{codeText}</code>
          </pre>
        </div>
      );
    }

    // Inline code
    return (
      <code className="px-1.5 py-[0.15em] rounded-md bg-muted/50 border border-border/40 text-[0.8em] font-mono text-foreground/90 align-baseline">
        {children}
      </code>
    );
  },

  // Pre wrapper — handled inside code component above
  pre: ({ children }) => <>{children}</>,

  // ── Table ──────────────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="mb-3.5 last:mb-0 overflow-x-auto rounded-xl border border-border/40 shadow-sm">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/20 border-b border-border/40">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border/15 last:border-0 hover:bg-muted/10 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3.5 py-2.5 text-[0.875rem] text-foreground/80 leading-relaxed">
      {children}
    </td>
  ),

  // ── Links ──────────────────────────────────────────────────────────────────
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/75 underline underline-offset-[3px] decoration-primary/40 hover:decoration-primary/70 transition-colors"
    >
      {children}
    </a>
  ),
};

// ── Export ────────────────────────────────────────────────────────────────────

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
