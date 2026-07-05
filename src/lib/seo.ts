import type { DocumentMeta } from "@builder.io/qwik-city";

const SITE_NAME = "Kana Smash";
const DEFAULT_IMAGE = "/icons/icon-512.png";

export function buildMeta({
  title,
  description,
  url,
  image = DEFAULT_IMAGE,
}: {
  title: string;
  description: string;
  url: URL;
  image?: string;
}): DocumentMeta[] {
  const imageUrl = new URL(image, url).href;

  return [
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url.href },
    { property: "og:image", content: imageUrl },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
  ];
}
