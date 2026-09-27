import { SITE } from "@/config";
import { markdownResponse } from "@/utils/markdownResponse";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const markdownContent = `# Javier Murillo (@javifloat)

${SITE.desc}

## Navigation

- [About](/about.md)
- [Recent Posts](/posts.md)
- [Archives](/archives.md)
- [RSS Feed](/rss.xml)

## Links

- X: [@javifloat](https://x.com/javifloat)
- GitHub: [@javiermurillo](https://github.com/javiermurillo)
- LinkedIn: [murillojavier](https://www.linkedin.com/in/murillojavier/)
- Email: ${SITE.email}

---

*This is the markdown-only version of javifloat.com. Visit [javifloat.com](https://javifloat.com) for the full experience.*`;

  return markdownResponse(markdownContent);
};
