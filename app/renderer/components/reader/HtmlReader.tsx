import { useMemo } from "react";
import DOMPurify from "dompurify";
import PagedReader from "./PagedReader";

export default function HtmlReader({
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
  // Remove scripts, handlers e formulários; mantém a formatação do ebook.
  const safe = useMemo(
    () =>
      DOMPurify.sanitize(content, {
        WHOLE_DOCUMENT: false,
        FORBID_TAGS: ["form", "input", "button", "iframe", "object", "embed"],
      }),
    [content]
  );

  return (
    <PagedReader
      title={title}
      html={safe}
      initialProgress={initialProgress}
      onProgress={onProgress}
    />
  );
}
