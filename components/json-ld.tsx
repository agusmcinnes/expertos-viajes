import Script from 'next/script'

interface JsonLdProps {
  data: object
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://expertos-viajes.vercel.app'
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  "name": "Expertos en Viajes",
  "description": "Creamos experiencias únicas e inolvidables. Desde playas paradisíacas hasta aventuras culturales. Somos la mejor agencia de viajes de Chubut.",
  "url": getBaseUrl(),
  "logo": `${getBaseUrl()}/logo-expertos-viajes.png`,
  "sameAs": [
    "https://www.facebook.com/expertosviajes",
    "https://www.instagram.com/expertosviajes"
  ],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Chubut",
    "addressCountry": "AR"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": "Spanish"
  },
  "areaServed": "Argentina",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Paquetes Turísticos",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "TouristTrip",
          "name": "Viajes en Avión"
        }
      },
      {
        "@type": "Offer", 
        "itemOffered": {
          "@type": "TouristTrip",
          "name": "Viajes en Bus"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "TouristTrip", 
          "name": "Cruceros"
        }
      }
    ]
  }
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Expertos en Viajes",
  "url": getBaseUrl(),
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${getBaseUrl()}/destinos/{search_term_string}`
    },
    "query-input": "required name=search_term_string"
  }
}
