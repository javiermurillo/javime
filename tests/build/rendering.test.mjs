import assert from "node:assert/strict";
import { glob, readFile } from "node:fs/promises";
import test from "node:test";
import { SITE } from "../../src/config.ts";

const schemas = (html) =>
  [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(
    (match) => JSON.parse(match[1]),
  );

test("only article pages publish one BlogPosting with an ISO duration", async (t) => {
  for (const path of ["index.html", "about/index.html", "search/index.html", "posts/index.html"]) {
    const data = schemas(await readFile(`dist/${path}`, "utf8"));
    assert.equal(data.filter((item) => item["@type"] === "BlogPosting").length, 0, path);
  }
  const [article] = await Array.fromAsync(glob("dist/posts/[0-9][0-9][0-9][0-9]/*/index.html"));
  if (!article) return t.skip("no published posts yet");
  const data = schemas(await readFile(article, "utf8"));
  const articles = data.filter((item) => item["@type"] === "BlogPosting");
  assert.equal(articles.length, 1);
  assert.match(articles[0].timeRequired, /^PT\d+M$/);
  assert.ok(Number.isFinite(Date.parse(articles[0].datePublished)));
});

test("the Markdown home contact comes from current site configuration", async () => {
  const home = await readFile("dist/index.md", "utf8");
  assert.ok(home.includes(SITE.email));
});
