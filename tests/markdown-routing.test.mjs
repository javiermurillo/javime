import assert from "node:assert/strict";
import test from "node:test";
import proxy, { markdownTarget, prefersMarkdown } from "../src/proxy.ts";

const request = (path, accept, method = "GET", host = "javifloat.com") =>
  new Request(`https://${host}${path}`, { method, headers: accept ? { accept } : {} });

test("explicit Markdown negotiation runs before static HTML lookup", () => {
  const response = proxy(request("/posts/2025/example?source=test", "text/markdown"));
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://javifloat.com/posts/2025/example.md?source=test",
  );
  assert.equal(
    proxy(request("/posts/2025/example", "text/html")).headers.get("x-middleware-next"),
    "1",
  );
});

test("media ranges honor quality, case and an explicit Markdown request", () => {
  assert.equal(prefersMarkdown("TEXT/MARKDOWN; charset=utf-8"), true);
  assert.equal(prefersMarkdown("text/markdown;q=0"), false);
  assert.equal(prefersMarkdown("text/html;q=1,text/markdown;q=0.5"), false);
  assert.equal(prefersMarkdown("text/html;q=0.2,text/markdown;q=0.9"), true);
  assert.equal(prefersMarkdown("*/*"), false);
  assert.equal(prefersMarkdown("text/markdown;q=invalid"), false);
});

test("Markdown negotiation maps site pages and preserves URL parameters", () => {
  assert.equal(
    markdownTarget(request("/?a=1", "text/markdown")).href,
    "https://javifloat.com/index.md?a=1",
  );
  assert.equal(markdownTarget(request("/about/", "text/markdown", "HEAD")).pathname, "/about.md");
  assert.equal(markdownTarget(request("/about", "text/html", "GET", "javifloat.md")), undefined);
  assert.equal(markdownTarget(request("/archives", "text/markdown")).pathname, "/archives.md");
  assert.equal(markdownTarget(request("/posts", "text/markdown")).pathname, "/posts.md");
  assert.equal(
    markdownTarget(request("/posts/2025/release.v2", "text/markdown")).pathname,
    "/posts/2025/release.v2.md",
  );
});

test("direct Markdown, image requests, unsupported paths and writes are not rewritten", () => {
  for (const path of [
    "/posts/2025/example.md",
    "/posts/2025/example/index.png",
    "/rss.xml",
    "/search",
  ]) {
    assert.equal(markdownTarget(request(path, "text/markdown")), undefined);
  }
  assert.equal(markdownTarget(request("/posts/2025/example", "text/markdown", "POST")), undefined);
});
