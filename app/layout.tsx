import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ScrollToTop } from "@/components/scroll-to-top"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Expertos Viajes - Tu próximo destino soñado",
  description: "Creamos experiencias únicas e inolvidables. Desde playas paradisíacas hasta aventuras culturales. Somos la mejor agencia de viajes de Chubut. Contamos desde viajes en bus hasta viajes aéreos. Contáctanos y descubre el mundo con nosotros.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <ScrollToTop />
      </body>
    </html>
  )
}
