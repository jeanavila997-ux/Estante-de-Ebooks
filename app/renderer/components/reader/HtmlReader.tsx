import { useMemo } from "react";
import DOMPurify from "dompurify";
import ScrollReader from "./ScrollReader";

export default function HtmlReader({
  content,
  initialProgress,
  onProgress,
}: {
  content: string;
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
    <ScrollReader
      html={safe}
      className="max-w-3xl mx-auto bg-card border-x border-border min-h-full px-10 py-8 reader-content"
      initialProgress={initialProgress}
      onProgress={onProgress}
    />
  );
}
