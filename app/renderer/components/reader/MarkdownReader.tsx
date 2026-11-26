import { useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import PagedReader from "./PagedReader";

export default function MarkdownReader({
  content,
  title,
  initialProgress,
  onProgress,
}: {
  content: string;
  title: string;
  initialProgress: number;
  onProgress: (percent: number) => void;
}) {
  const safe = useMemo(() => {
    const html = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(html);
  }, [content]);

  return (
    <PagedReader
      title={title}
      html={safe}
      initialProgress={initialProgress}
      onProgress={onProgress}
    />
  );
}
