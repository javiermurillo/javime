---
title: "WebMCP: Giving Your Website Tools an Agent Can Actually Call"
description: "WebMCP lets a page expose its real functions to an agent inside the user's session. That's a decision about what an agent may act on, not a compatibility patch."
pubDatetime: 2026-08-12
tags: ["webmcp", "agents", "web-platform", "security"]
draft: true
---

*An engineer's take on the Web Model Context Protocol and what it means to build for agents, not just users*

For the last couple of years, "making a website agent-friendly" has mostly meant one thing: hoping the agent's screenshot-and-click loop doesn't break on your UI. Agents drove browsers the same way a very patient, very literal intern would — take a screenshot, guess where the button is, click, hope for the best. It worked, in the sense that it usually didn't, and when it did, it was slow, brittle, and burned an embarrassing number of tokens just describing pixels.

WebMCP is the web platform's answer to that: instead of an agent pretending to be a mouse, your site tells it directly what it can do.

## The problem this actually solves

Traditional MCP (Model Context Protocol) servers are great when the "tool" is a backend you control — a database, an internal API, a file system. They're a bad fit for the thing agents actually need most: authenticated, stateful web applications where the real logic lives behind a session cookie and a pile of client-side validation. Standing up a separate MCP server that re-implements your app's business logic just to give an agent access to it is duplicate work, and it's now a second thing that can drift out of sync with the real app.

WebMCP skips the duplication. It lets the page itself expose a set of tools, backed by the exact same functions the UI already calls, running in the exact same authenticated session the user is already in. The agent isn't logging in separately or hitting a shadow API — it's calling the same `addToCart()` or `searchCatalog()` your React component calls, with your existing permission checks intact.

## How it actually works

The spec — developed under the W3C Web Machine Learning Community Group, with Google and Microsoft co-editing — introduces `document.modelContext` as the entry point. (Worth flagging up front: this moved from `navigator.modelContext` as recently as the July 2026 draft, with Chrome 150 deprecating the old location. If you find older blog posts or sample code using `navigator.modelContext`, that's now stale — a good early sign of how much this spec is still moving under everyone's feet.)

Registering a tool imperatively looks like this:

```javascript
await document.modelContext.registerTool({
  name: "search_products",
  description: "Search the product catalog by keyword and category",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      category: { type: "string" },
    },
  },
  execute: async ({ query, category }) => {
    const results = await catalog.search(query, category);
    return { products: results };
  },
});
```

Tools can be torn down cleanly with an `AbortSignal` instead of a manual unregister call, which matters in single-page apps where a "tool" (say, "apply filter") should only exist while its component is actually mounted:

```javascript
const controller = new AbortController();
await document.modelContext.registerTool(toolDef, { signal: controller.signal });
// later, when the component unmounts:
controller.abort();
```

There's also a declarative path for simpler cases — HTML attributes on a form, no JavaScript required:

```html
<form tool-name="book_table" tool-description="Reserve a table">
  <input name="party_size" tool-param-description="Number of guests" />
  <input name="date" tool-param-description="Reservation date" />
</form>
```

Agents discover what's available via `document.modelContext.getTools()`, invoke a specific one with `executeTool()`, and can listen for a `"toolchange"` event when the set of available tools shifts — which happens constantly on a real app, since the tools you'd sensibly expose on a product page aren't the same ones you'd expose on a checkout page.

## Where it sits relative to MCP

It helps to think of WebMCP as reusing MCP's vocabulary — tools, resources, prompts — while handing the transport and data layer to the browser instead of to a JSON-RPC server process. That's a deliberate decoupling: the browser can enforce its own security boundaries (origin checks, permission prompts) without your app needing to reimplement an MCP transport, and you're not tying your tool definitions to a specific server SDK version.

| | WebMCP | Server-side MCP |
|---|---|---|
| Runs in | The browser, on the live page | A separate backend process |
| Auth | Inherits the user's existing session | Needs its own auth layer |
| Extra infrastructure | None | A server to deploy and maintain |
| Access to page state | Yes — client-side context and UI logic | No — headless only |

## The part engineers should not skip: security

Handing an agent a tool that runs with the user's real session is exactly as dangerous as it sounds the moment you consider indirect prompt injection — an attacker hiding instructions in a page or a piece of user-generated content that a *different* agent then reads and acts on. Chrome's own guidance for tool authors is blunt about this: prompt injection attacks against agentic systems aren't a theoretical edge case, they're already repeatable against state-of-the-art models.

But prompt injection is the surface-level hazard. The deeper one is *accountability*, and it's worth slowing down here, because it's the part of this story that a general web audience has no reason to have a position on.

WebMCP's session-inheritance model is, structurally, its strongest accountability primitive. There is no shadow identity for the agent: one user, one session, one audit trail, one set of permission checks, one rate-limit budget. Whatever the user can do, the agent can do — and whatever the agent does is, from the server's perspective, something the user did. That collapses an entire class of "who authorized this?" questions. In a world where most agent security incidents turn out to be authorization failures — a tool that *can* do a thing did the thing, and the post-mortem is about scope, not malice — that collapse is genuinely useful.

It also collapses a different class of questions, and this is where the vantage point starts to matter. In any system where the auditor's first question is *who pressed the button?*, the answer cannot be "the user, sort of." WebMCP does not, at the protocol layer, distinguish between an action initiated by a human clicking through your React tree and an action initiated by an agent calling `executeTool()` on the user's behalf. Both arrive over the same authenticated channel, with the same session token, hitting the same `addToCart()` function. That is exactly the right design for the consumer web. It is the wrong design — or rather, an *underspecified* one — for any domain where the human/agent boundary is itself a regulatory primitive: software that ships under FDA Class 2, financial systems with segregation-of-duties rules, clinical software, anything whose audit trail has to answer "human-initiated, human-approved, or agent-initiated" as a first-class field rather than a derived guess.

The argument worth having with WebMCP's authors is not "this is unsafe." It is: **the protocol gives you authentication but not attribution, and attribution is the part that has to be reconstructed in application logic if your domain needs it.** A tool that mutates state should log, in its own application code, *that* an agent initiated the call, *which* tool definition was used, and ideally a correlation id back to the agent's plan — because none of that survives the trip through `document.modelContext`. WebMCP inherits the user's identity; it deliberately does not inherit the user's *mode*. In a regulated environment, that distinction is load-bearing.

The mitigations worth actually adopting, not just reading about:

- **Annotate honestly.** Mark tools `readOnlyHint` when they don't mutate state, and `untrustedContentHint` when their output includes user-generated or external content — this changes how cautiously an agent (and the human reviewing its actions) treats the result.
- **Scope exposure tightly.** The `exposedTo` parameter lets you restrict which origins can even see a tool. Treat this the way you'd treat a CORS policy: default closed, open only to origins you actually trust, and never open write-access tools broadly.
- **Keep tools boring.** Chrome's own character budgets (roughly 500 characters for a description, 150 per parameter, 30 for a name) aren't arbitrary style guidance — they're a hedge against prompt-injection surface area and against agents misreading an overloaded tool.
- **Assume the input is hostile.** Every parameter an agent passes into `execute()` should be validated the same way you'd validate it from an anonymous HTTP request, because functionally, that's what it is now.
- **Log the initiator, not just the actor.** A regulated audit trail needs to record that an agent — not the user — caused this state change. The session token will not tell you that; the call site has to. Treat this as a feature your application layer owes to itself, not something the protocol will give you for free.

## How this applies if you're building for it today

If you're evaluating WebMCP for a real product right now, the honest engineering read is: prototype it, don't bet production traffic on it yet. As of this writing it's a Draft Community Group Report, not a settled W3C standard — Chrome has it in an active origin trial, Edge has experimental support behind a flag, and Firefox and Safari haven't committed to shipping it. The API itself just had a breaking rename weeks ago. Real companies (Expedia, Booking.com, Shopify among them) have joined the origin trial, but actual tool registration in production is still closer to zero than to widespread — and no mainstream agent calls WebMCP tools yet, with Gemini in Chrome expected to be the first.

That's not a reason to ignore it. It's a reason to build your first tools behind a feature flag, on read-only, low-stakes actions first (search, filter, look-up), and treat the API surface as something you'll need to revisit every time the spec moves — which, on current form, is often.

## The takeaway

WebMCP's real contribution isn't a clever new API — it's a shift in what "agent-friendly" means for a website. Instead of hardening your UI against automation, you're explicitly deciding which of your app's real functions an agent is allowed to call, under whose session, with what guardrails. That's a design decision, not a compatibility patch, and it deserves the same scrutiny you'd give any other feature that can act on a user's behalf.

The part that earns the second look is the boundary the protocol *doesn't* draw. WebMCP inherits the user's identity; it does not inherit the user's mode. For consumer software that's a feature. For any system where an auditor, a regulator, or a future you is going to ask "was that the human or the agent?" — the answer has to be built into your application layer, because the protocol has chosen not to carry it. That is the design decision the spec asks you to make explicitly, and it is the one most likely to be made implicitly if you don't.

---

## Sources

- [WebMCP proposal — webmachinelearning/webmcp](https://github.com/webmachinelearning/webmcp/blob/main/docs/proposal.md)
- [webmachinelearning/webmcp — GitHub repository](https://github.com/webmachinelearning/webmcp)
- [WebMCP: How Websites Will Expose Tools to AI Agents — Zuplo](https://zuplo.com/blog/what-is-webmcp)
- [The State of WebMCP: July 2026 — Spronta](https://www.spronta.com/blog/state-of-webmcp-july-2026/)
- [Imperative API — AI on Chrome, Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [WebMCP tool security — AI on Chrome, Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
