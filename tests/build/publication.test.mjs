import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { glob, readFile } from "node:fs/promises";
import test from "node:test";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import { isPublished } from "../../src/utils/postVisibility.ts";

// Check actual source flags against every public artifact, independently of route code.
test("production artifacts never expose draft or scheduled source posts", async () => {
  for await (const path of glob("src/content/blog/**/*.md")) {
    const { frontmatter } = parseFrontmatter(await readFile(path, "utf8"));
    const data = { ...frontmatter, pubDatetime: new Date(frontmatter.pubDatetime) };
    if (isPublished(data)) continue;
    const slug = path.replace("src/content/blog/", "").replace(/\.md$/, "").toLowerCase();
    for (const suffix of ["/index.html", ".md", "/index.png"]) {
      assert.equal(existsSync(`dist/posts/${slug}${suffix}`), false, `${slug}${suffix}`);
    }
    for (const index of [
      "dist/posts/index.html",
      "dist/posts.md",
      "dist/rss.xml",
      "dist/sitemap-0.xml",
    ]) {
      assert.equal((await readFile(index, "utf8")).includes(`/posts/${slug}`), false, index);
    }
  }
});
