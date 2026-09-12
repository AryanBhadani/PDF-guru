import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} – Free Online PDF Tools`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  metadataBase: new URL("https://pdfguru.app"),
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: `${APP_NAME} – Free Online PDF Tools`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
  },
  appleWebApp: {
    title: APP_NAME,
    capable: true,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d6e60" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Fira+Sans:wght@400;600&family=Inter:wght@400;600;700&family=Lato:wght@400;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600;700&family=Noto+Sans:wght@400;700&family=Noto+Serif:wght@400;700&family=Nunito:wght@400;600;700&family=Open+Sans:wght@400;600;700&family=Oswald:wght@400;600&family=PT+Sans:wght@400;700&family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;700&family=Poppins:wght@400;600;700&family=Quicksand:wght@400;600;700&family=Raleway:wght@400;600;700&family=Roboto:wght@400;500;700&family=Source+Sans+3:wght@400;600;700&family=Ubuntu:wght@400;500;700&family=Work+Sans:wght@400;600;700&display=swap"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}>
        <Providers>
          <div className="flex flex-col">
            <Navbar />
            <main>{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
