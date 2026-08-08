export type PostMeta = {
  slug: string;
  title: string;
  publishedAt: string;
  summary?: string;
};

const CONTENT_BASE = (import.meta.env.VITE_CONTENT_BASE as string | undefined)?.replace(
  /\/$/,
  "",
) ?? "";

export function contentUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${CONTENT_BASE}${clean}`;
}

export async function fetchIndex(): Promise<PostMeta[]> {
  const res = await fetch(contentUrl("/posts/index.json"), { cache: "no-store" });
  if (!res.ok) throw new Error(`index ${res.status}`);
  return res.json() as Promise<PostMeta[]>;
}

export async function fetchPostMarkdown(slug: string): Promise<string> {
  const res = await fetch(contentUrl(`/posts/${encodeURIComponent(slug)}/post.md`), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`post ${res.status}`);
  return res.text();
}

export function assetUrl(slug: string, relativePath: string): string {
  const path = relativePath.replace(/^\.\//, "");
  return contentUrl(`/posts/${encodeURIComponent(slug)}/${path}`);
}
