"use client"

import { forwardRef } from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useNavigationLoading } from "@/hooks/use-navigation-loading"

interface NavigationButtonProps extends ButtonProps {
  href: string
  loadingText?: string
}

export const NavigationButton = forwardRef<HTMLButtonElement, NavigationButtonProps>(
  ({ href, children, loadingText, disabled, ...props }, ref) => {
    const router = useRouter()
    const { setLoading, isLoading } = useNavigationLoading()
    const loading = isLoading(href)

    const handleClick = () => {
      if (!disabled && !loading) {
        setLoading(href)
        router.push(href)
      }
    }

    return (
      <Button
        ref={ref}
        {...props}
        disabled={disabled || loading}
        onClick={handleClick}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {loading ? (loadingText || "Cargando...") : children}
      </Button>
    )
  }
)

NavigationButton.displayName = "NavigationButton"
