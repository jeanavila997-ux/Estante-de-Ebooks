import { useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import ScrollReader from "./ScrollReader";

export default function MarkdownReader({
  content,
  initialProgress,
  onProgress,
}: {
  content: string;
  initialProgress: number;
  onProgress: (percent: number) => void;
}) {
  const safe = useMemo(() => {
    const html = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(html);
  }, [content]);

  return (
    <ScrollReader
      html={safe}
      className="max-w-3xl mx-auto bg-card border-x border-border min-h-full px-10 py-8 reader-content"
      initialProgress={initialProgress}
      onProgress={onProgress}
    />
  );
}
