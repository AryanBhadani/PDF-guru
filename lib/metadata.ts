import type { Metadata } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const SITE_URL = "https://pdfguru.app";

export function createPageMetadata(title: string, description: string, path = "/"): Metadata {
  const fullTitle = title.includes(APP_NAME) ? title : `${title} | ${APP_NAME}`;
  const url = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    applicationName: APP_NAME,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: APP_NAME,
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
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
