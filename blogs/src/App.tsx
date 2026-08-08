import { useEffect, useState } from "react";
import { fetchIndex, fetchPostMarkdown, type PostMeta } from "./content";
import { renderMarkdown } from "./markdown";

function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Brand() {
  return (
    <a
      className="text-inherit no-underline outline-offset-[0.35em] hover:underline focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current"
      href="https://tirbo.fish"
    >
      <span className="text-latte">::</span>
      {"<tirbofish>"}
    </a>
  );
}

function PostList() {
  const [posts, setPosts] = useState<PostMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchIndex()
      .then((data) => {
        if (!cancelled) {
          setPosts(
            [...data].sort(
              (a, b) =>
                Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
            ),
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-8">
      <header className="animate-view-in motion-reduce:animate-none">
        <p className="m-0 text-sm text-espresso">
          <Brand /> / blogs
        </p>
        <h1 className="mt-6 mb-2 text-[clamp(2rem,8vw,3.5rem)] font-extrabold italic leading-none tracking-[0.02em]">
          blogs
        </h1>
        <p className="m-0 max-w-md text-sm text-espresso">
          rants, jots and random bs
        </p>
      </header>

      <main className="mt-14 flex-1 animate-view-in motion-reduce:animate-none">
        {error && <p className="text-brick">could not load posts: {error}</p>}
        {!error && posts === null && <p className="text-espresso">loading…</p>}
        {posts && posts.length === 0 && (
          <p className="text-espresso">no posts yet.</p>
        )}
        {posts && posts.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-8 p-0">
            {posts.map((post) => (
              <li key={post.slug}>
                <a
                  className="group block text-inherit no-underline outline-offset-[0.35em] focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current"
                  href={`/${post.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/${post.slug}`);
                  }}
                >
                  <time
                    className="block text-xs text-espresso"
                    dateTime={post.publishedAt}
                  >
                    {new Date(post.publishedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <span className="mt-1 block text-xl font-semibold italic group-hover:underline">
                    {post.title}
                  </span>
                  {post.summary && (
                    <span className="mt-2 block text-sm text-espresso">
                      {post.summary}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function PostPage({ slug }: { slug: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [meta, setMeta] = useState<PostMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchIndex(), fetchPostMarkdown(slug)])
      .then(([index, md]) => {
        if (cancelled) return;
        setMeta(index.find((p) => p.slug === slug) ?? null);
        setHtml(renderMarkdown(md, slug));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "failed");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-8">
      <header className="animate-view-in motion-reduce:animate-none">
        <p className="m-0 text-sm text-espresso">
          <Brand /> /{" "}
          <a
            className="text-inherit no-underline hover:underline"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            blogs
          </a>
        </p>
      </header>

      <main className="mt-10 flex-1 animate-view-in motion-reduce:animate-none">
        {error && <p className="text-brick">could not load post: {error}</p>}
        {!error && html === null && <p className="text-espresso">loading…</p>}
        {html !== null && (
          <article>
            <h1 className="m-0 text-[clamp(1.6rem,5vw,2.4rem)] font-extrabold italic leading-tight">
              {meta?.title ?? slug}
            </h1>
            {meta && (
              <time
                className="mt-3 block text-xs text-espresso"
                dateTime={meta.publishedAt}
              >
                {new Date(meta.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            )}
            <div
              className="prose mt-10"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const path = usePath();
  const slug = path.replace(/^\/+|\/+$/g, "");

  if (!slug) return <PostList />;
  return <PostPage slug={slug} />;
}
