import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ScrollToTop } from "@/components/scroll-to-top"
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/components/json-ld"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.expertosenviajes.com.ar/'),
  title: {
    default: "Expertos en Viajes - Tu próximo destino soñado",
    template: "%s | Expertos en Viajes"
  },
  description: "Creamos experiencias únicas e inolvidables. Desde playas paradisíacas hasta aventuras culturales. Somos la mejor agencia de viajes de Chubut. Contamos desde viajes en bus hasta viajes aéreos. Contáctanos y descubre el mundo con nosotros.",
  keywords: ["viajes", "turismo", "agencia de viajes", "paquetes turísticos", "destinos", "aventura", "vacaciones", "Chubut", "Argentina", "cruceros", "viajes en bus", "viajes aéreos"],
  authors: [{ name: "Expertos en Viajes" }],
  creator: "Expertos en Viajes",
  publisher: "Expertos en Viajes",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://expertos-viajes.vercel.app",
    siteName: "Expertos en Viajes",
    title: "Expertos en Viajes - Tu próximo destino soñado",
    description: "Creamos experiencias únicas e inolvidables. Desde playas paradisíacas hasta aventuras culturales. Somos la mejor agencia de viajes de Chubut.",
    images: [
      {
        url: "/logo-expertos-viajes.png",
        width: 800,
        height: 600,
        alt: "Expertos en Viajes - Agencia de Turismo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Expertos en Viajes - Tu próximo destino soñado",
    description: "Creamos experiencias únicas e inolvidables. Desde playas paradisíacas hasta aventuras culturales.",
    images: ["/logo-expertos-viajes.png"],
  },
  verification: {
    google: "google-site-verification-code",
  },
  alternates: {
    canonical: "https://expertos-viajes.vercel.app",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a1a1a" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="geo.region" content="AR-U" />
        <meta name="geo.placename" content="Chubut, Argentina" />
        <meta name="ICBM" content="-43.2994,-65.1018" />
      </head>
      <body className={inter.className}>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        {children}
        <ScrollToTop />
        <Toaster />
      </body>
    </html>
  )
}
