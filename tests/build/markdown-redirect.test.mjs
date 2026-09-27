import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { markdownTarget } from "../../src/proxy.ts";

test("Markdown negotiation reaches a built document for every negotiated page", () => {
  for (const path of ["/", "/about", "/archives", "/posts"]) {
    const request = new Request(`https://javifloat.com${path}`, {
      headers: { accept: "text/markdown" },
    });
    const target = markdownTarget(request);
    assert.ok(target, path);
    assert.ok(existsSync(`dist${target.pathname}`), target.pathname);
  }
});
