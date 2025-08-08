

declare global {
  interface Window {
    gtag?: (command: string, action: string, parameters?: Record<string, any>) => void
  }
}

function sendToAnalytics(metric: any) {
  // Aquí puedes enviar las métricas a tu servicio de analytics preferido
  // Por ejemplo: Google Analytics, Vercel Analytics, etc.
  console.log('Web Vital:', metric)
  
  // Ejemplo para Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }
}

export function reportWebVitals() {
}
