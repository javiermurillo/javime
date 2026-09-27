export const BLOG_PATH = "src/content/blog";

interface Site {
  website: string;
  author: string;
  email: string;
  profile: string;
  desc: string;
  title: string;
  ogImage: string;
  lightAndDarkMode: boolean;
  postPerIndex: number;
  postPerPage: number;
  scheduledPostMargin: number;
  showArchives: boolean;
  showBackButton: boolean;
  editPost: {
    enabled: boolean;
    text: string;
    url: string;
  };
  dynamicOgImage: boolean;
  lang: string;
  timezone: string;
}

export const SITE: Site = {
  website: "https://javifloat.com/",
  author: "Javier Murillo",
  email: "yo@javifloat.com",
  profile: "https://javifloat.com/about",
  desc: "Latino software engineer in New York. Shipping software since 2014, most of it in places where being wrong is expensive.",
  title: "Javier Murillo",
  ogImage: "javier-avatar.png",
  lightAndDarkMode: true,
  postPerIndex: 10,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000,
  showArchives: false,
  showBackButton: false,
  editPost: {
    enabled: true,
    text: "Edit on GitHub",
    url: "https://github.com/javiermurillo/javime/edit/main/",
  },
  dynamicOgImage: true,
  lang: "en",
  timezone: "America/New_York",
};
