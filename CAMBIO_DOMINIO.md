# 🌐 Cambio de Dominio - Instrucciones

## 📝 Para cambiar el dominio del sitio web:

### **Opción 1: Método Fácil (Recomendado)**

Solo necesitas cambiar **1 línea** en el archivo `.env.local`:

```bash
# Cambiar esta línea:
NEXT_PUBLIC_SITE_URL=https://nuevo-dominio.com
```

### **Opción 2: Si no usas .env.local**

Cambiar manualmente en estos archivos:

1. **app/layout.tsx** - línea 11
2. **app/sitemap.ts** - línea 4
3. **app/robots.ts** - línea 6
4. **components/json-ld.tsx** - función getBaseUrl()

## 🚀 Después del cambio:

1. Reinicia el servidor de desarrollo: `npm run dev`
2. Actualiza la configuración en Vercel con el nuevo dominio
3. ¡Listo! 🎉

## 📋 URLs que se actualizarán automáticamente:

- ✅ Metadata Open Graph
- ✅ Twitter Cards
- ✅ Sitemap.xml
- ✅ Robots.txt
- ✅ JSON-LD (datos estructurados)
- ✅ URLs canónicas

---

**💡 Tip:** Guarda este archivo para referencia futura.
