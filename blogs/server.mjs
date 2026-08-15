import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const contentBase = (
  process.env.CONTENT_BASE ||
  "https://tirbo-blogs.syd1.digitaloceanspaces.com"
).replace(/\/$/, "");

export function wantsMarkdown(headers) {
  return (
    /(?:^|\s)curl\//i.test(headers["user-agent"] || "") ||
    (headers.accept || "").includes("text/markdown")
  );
}

export function renderIndex(posts, origin) {
  const lines = posts.map(
    ({ slug, title, summary }) =>
      `- [${title}](${origin}/${slug})${summary ? ` — ${summary}` : ""}`,
  );
  return `# blogs.tirbo.fish\n\n${lines.join("\n")}\n`;
}

async function markdownResponse(url) {
  const slug = url.pathname.replace(/^\/+|\/+$/g, "");
  const source = slug
    ? `${contentBase}/posts/${encodeURIComponent(slug)}/post.md`
    : `${contentBase}/posts/index.json`;
  const response = await fetch(source);
  if (!response.ok) {
    return new Response(response.status === 404 ? "not found\n" : "content unavailable\n", {
      status: response.status === 404 ? 404 : 502,
    });
  }
  const body = slug
    ? await response.text()
    : renderIndex(await response.json(), url.origin);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept, User-Agent",
    },
  });
}

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};

async function staticResponse(url) {
  let file = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
  if (!file.startsWith(`${dist}${path.sep}`) && file !== dist) {
    return new Response("not found\n", { status: 404 });
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    return new Response(await readFile(file), {
      headers: { "Content-Type": types[path.extname(file)] || "application/octet-stream" },
    });
  } catch {
    return new Response(await readFile(path.join(dist, "index.html")), {
      headers: { "Content-Type": types[".html"] },
    });
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "")) {
  createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      const result = wantsMarkdown(request.headers)
        ? await markdownResponse(url)
        : await staticResponse(url);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(request.method === "HEAD" ? undefined : Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      console.error(error);
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("internal server error\n");
    }
  }).listen(Number(process.env.PORT || 8080));
}
