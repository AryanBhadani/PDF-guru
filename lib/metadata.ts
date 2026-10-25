import type { Metadata } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export const SITE_URL = "https://pdf-guru-j5ms-alpha.vercel.app";
const OG_IMAGE = "/og-image.png";

export function createPageMetadata(title: string, description: string, path = "/"): Metadata {
  const fullTitle = title.includes(APP_NAME) ? title : `${title} | ${APP_NAME}`;
  const url = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    applicationName: APP_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: APP_NAME,
      type: "website",
      locale: "en_IN",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${APP_NAME} – Free Online PDF Tools`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [
        {
          url: OG_IMAGE,
          alt: `${APP_NAME} – Free Online PDF Tools`,
        },
      ],
    },
    appleWebApp: {
      title: APP_NAME,
      capable: true,
      statusBarStyle: "default",
    },
  };
}

export const homeMetadata = createPageMetadata(
  `${APP_NAME} – Free Online PDF Tools`,
  APP_DESCRIPTION,
  "/"
);
