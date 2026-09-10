import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#0d6e60",
    icons: [
      {
        src: "/pdf-guru-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
