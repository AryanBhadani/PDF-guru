import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { createPageMetadata } from "@/lib/metadata";
import { HomePageClient } from "./home-page-client";

export const metadata = createPageMetadata(`${APP_NAME} – Free Online PDF Tools`, APP_DESCRIPTION, "/");

export default function HomePage() {
  return <HomePageClient />;
}
