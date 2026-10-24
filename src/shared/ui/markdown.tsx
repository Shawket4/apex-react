import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Markdown written by a model, rendered safely                                */
/*                                                                             */
/* react-markdown builds React elements from the syntax tree — no innerHTML.   */
/* `skipHtml` drops any raw HTML in the source instead of printing it, and the */
/* default URL transform already refuses `javascript:` and friends. GFM is on  */
/* for the tables the advisor answers in. No typography plugin in this app, so */
/* each element carries its own classes.                                       */
/* -------------------------------------------------------------------------- */

const components: Components = {
  p: ({ node: _n, ...p }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...p} />,
  ul: ({ node: _n, ...p }) => <ul className="my-2 list-disc space-y-1 ps-5" {...p} />,
  ol: ({ node: _n, ...p }) => <ol className="my-2 list-decimal space-y-1 ps-5" {...p} />,
  li: ({ node: _n, ...p }) => <li className="leading-relaxed" {...p} />,
  h1: ({ node: _n, ...p }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0" {...p} />,
  h2: ({ node: _n, ...p }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0" {...p} />,
  h3: ({ node: _n, ...p }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0" {...p} />,
  h4: ({ node: _n, ...p }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0" {...p} />,
  a: ({ node: _n, ...p }) => (
    <a
      className="font-medium text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...p}
    />
  ),
  blockquote: ({ node: _n, ...p }) => (
    <blockquote className="my-2 border-s-2 border-border ps-3 text-muted-foreground" {...p} />
  ),
  code: ({ node: _n, className, ...p }) => (
    <code
      className={cn('rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]', className)}
      {...p}
    />
  ),
  pre: ({ node: _n, ...p }) => (
    <pre
      dir="ltr"
      className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs [&_code]:bg-transparent [&_code]:p-0"
      {...p}
    />
  ),
  table: ({ node: _n, ...p }) => (
    <div className="my-2 overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-xs" {...p} />
    </div>
  ),
  th: ({ node: _n, ...p }) => (
    <th className="border-b bg-muted/50 px-2 py-1.5 text-start font-semibold" {...p} />
  ),
  td: ({ node: _n, ...p }) => <td className="border-b px-2 py-1.5 align-top tabular-nums" {...p} />,
  hr: () => <hr className="my-3 border-border" />,
};

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div dir="auto" className={cn('break-words text-sm', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
