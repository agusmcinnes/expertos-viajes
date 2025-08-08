import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}
    >
      <Link 
        href="/" 
        className="flex items-center hover:text-primary transition-colors"
        aria-label="Ir a inicio"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.href && index < items.length - 1 ? (
            <Link 
              href={item.href} 
              className="hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium" aria-current="page">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}

// JSON-LD para breadcrumbs
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 2, // +2 porque el home es posición 1
    "name": item.label,
    "item": item.href ? `https://expertos-viajes.vercel.app${item.href}` : undefined
  }))

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem", 
        "position": 1,
        "name": "Inicio",
        "item": "https://expertos-viajes.vercel.app"
      },
      ...itemListElement
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
