import ReactMarkdown from 'react-markdown';

/**
 * Render nội dung markdown (dùng cho câu trả lời của AI).
 * Chỉ hỗ trợ các phần tử cơ bản, style bằng Tailwind.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed space-y-2">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <h4 className="font-semibold text-base">{children}</h4>,
          h2: ({ children }) => <h4 className="font-semibold text-base">{children}</h4>,
          h3: ({ children }) => <h4 className="font-semibold">{children}</h4>,
          code: ({ children }) => (
            <code className="bg-gray-200/60 rounded px-1 py-0.5 text-xs font-mono">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary-600 underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
