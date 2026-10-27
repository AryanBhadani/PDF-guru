import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { SITE_URL } from "@/lib/metadata";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const OG_IMAGE = "/og-image.png";

export const metadata: Metadata = {
  title: `${APP_NAME} – Free Online PDF Tools`,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.webmanifest",
  verification: {
    google: "JcA2nk8WAySQEZ-ABURfyfR69aJg13xR61rDvPtQNhg",
  },
  openGraph: {
    title: `${APP_NAME} – Free Online PDF Tools`,
    description: APP_DESCRIPTION,
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
    title: `${APP_NAME} – Free Online PDF Tools`,
    description: APP_DESCRIPTION,
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d6e60" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: SITE_URL,
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: APP_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/pdf-guru-icon.svg`,
  description: APP_DESCRIPTION,
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  description: APP_DESCRIPTION,
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
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
        <Script
          id="schema-website"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Script
          id="schema-organization"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="schema-software"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
        <GoogleAnalytics />
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
