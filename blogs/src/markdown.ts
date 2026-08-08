import DOMPurify from "dompurify";
import katex from "katex";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

function renderMath(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex.trim(), {
    displayMode,
    throwOnError: false,
    output: "html",
  });
}

/** Strip YAML frontmatter if present. */
export function stripFrontmatter(src: string): string {
  if (!src.startsWith("---\n")) return src;
  const end = src.indexOf("\n---\n", 4);
  if (end === -1) return src;
  return src.slice(end + 5);
}

export function renderMarkdown(src: string, slug: string): string {
  const body = stripFrontmatter(src);
  const slots: string[] = [];
  const slot = (html: string) => {
    const i = slots.length;
    slots.push(html);
    return `@@MATH${i}@@`;
  };

  let text = body.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) =>
    slot(renderMath(tex, true)),
  );
  text = text.replace(
    /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g,
    (_, tex: string) => slot(renderMath(tex, false)),
  );

  // Rewrite relative image paths to content URLs for this slug.
  text = text.replace(
    /!\[([^\]]*)\]\((?!https?:|\/|data:)([^)]+)\)/g,
    (_, alt: string, path: string) => {
      const clean = path.replace(/^\.\//, "");
      const url = `/posts/${encodeURIComponent(slug)}/${clean}`;
      const base = (import.meta.env.VITE_CONTENT_BASE as string | undefined)?.replace(
        /\/$/,
        "",
      ) ?? "";
      return `![${alt}](${base}${url})`;
    },
  );

  const html = marked.parse(text, { async: false }) as string;
  const withMath = html.replace(/@@MATH(\d+)@@/g, (_, i: string) => slots[Number(i)] ?? "");
  return DOMPurify.sanitize(withMath, {
    ADD_TAGS: ["annotation", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub"],
    ADD_ATTR: ["class", "style", "aria-hidden", "focusable", "role", "xmlns"],
  });
}
