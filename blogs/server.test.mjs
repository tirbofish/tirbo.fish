import assert from "node:assert/strict";
import test from "node:test";
import { renderIndex, wantsMarkdown } from "./server.mjs";

test("curl and Markdown clients get a Markdown index", () => {
  assert.equal(wantsMarkdown({ "user-agent": "curl/8.14.1", accept: "*/*" }), true);
  assert.equal(wantsMarkdown({ "user-agent": "Mozilla/5.0", accept: "text/html" }), false);
  assert.equal(wantsMarkdown({ accept: "text/markdown" }), true);
  assert.equal(
    renderIndex([{ slug: "hello", title: "hello", summary: "first post" }], "https://blogs.tirbo.fish"),
    "# blogs.tirbo.fish\n\n- [hello](https://blogs.tirbo.fish/hello) — first post\n",
  );
});
