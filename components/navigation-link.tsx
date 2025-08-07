"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useNavigationLoading } from "@/hooks/use-navigation-loading"

interface NavigationLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function NavigationLink({ href, children, className, onClick }: NavigationLinkProps) {
  const { navigateWithLoading, isLoading } = useNavigationLoading()
  const loading = isLoading(href)

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick()
    
    // Si es un enlace de ancla (#), scroll suave
    if (href.startsWith("/#")) {
      e.preventDefault()
      const targetId = href.substring(2)
      if (targetId) {
        const element = document.getElementById(targetId)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      }
    } else {
      // Para navegación normal, usar navigateWithLoading
      e.preventDefault()
      navigateWithLoading(href)
    }
  }

  return (
    <Link 
      href={href} 
      className={`cursor-pointer hover:cursor-pointer ${className || ''}`}
      onClick={handleClick}
    >
      <span className="flex items-center">
        {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
        {children}
      </span>
    </Link>
  )
}
