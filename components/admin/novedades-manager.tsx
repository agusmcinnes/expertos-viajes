"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Save, X, Newspaper, Upload, ImageIcon } from "lucide-react"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { novedadesCategoryService, type NovedadesCategory } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

const MAX_IMAGE_SIZE = 3 * 1024 * 1024 // 3MB

interface NovedadesManagerProps {
  onCategoriesChange?: () => void
}

export function NovedadesManager({ onCategoriesChange }: NovedadesManagerProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<NovedadesCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState({ name: "", slug: "", display_order: "0", is_active: true, image_url: "" })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const data = await novedadesCategoryService.getAllCategories()
      setCategories(data)
    } catch (error: any) {
      console.error("Error loading categories:", error)
      toast({ title: "Error", description: "No se pudieron cargar las categorías de novedades.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : generateSlug(name),
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen.", variant: "destructive" })
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: "Error", description: `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo permitido: 3MB.`, variant: "destructive" })
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async (slug: string): Promise<string | null> => {
    if (!selectedImage) return formData.image_url || null

    const ext = selectedImage.name.split(".").pop() || "jpg"
    const filePath = `novedades/${slug}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from("pdfs_expertos")
      .upload(filePath, selectedImage, { cacheControl: "3600", upsert: true })

    if (error) throw new Error("Error subiendo imagen: " + error.message)

    // Signed URL de ~10 años (bucket no es público)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("pdfs_expertos")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10)

    if (signedError || !signedData?.signedUrl) {
      throw new Error("Error generando URL: " + (signedError?.message || "URL vacía"))
    }

    return signedData.signedUrl
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast({ title: "Error", description: "Nombre y slug son obligatorios.", variant: "destructive" })
      return
    }

    try {
      setIsUploading(true)
      const imageUrl = await uploadImage(formData.slug.trim())

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        display_order: parseInt(formData.display_order) || 0,
        is_active: formData.is_active,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        const { error } = await supabaseAdmin
          .from("novedades_categories")
          .update(payload)
          .eq("id", editingId)
        if (error) throw error
        toast({ title: "Categoría actualizada" })
      } else {
        const { error } = await supabaseAdmin
          .from("novedades_categories")
          .insert([payload])
        if (error) throw error
        toast({ title: "Categoría creada" })
      }

      setEditingId(null)
      setIsAdding(false)
      resetForm()
      await loadCategories()
      onCategoriesChange?.()
    } catch (error: any) {
      console.error("Error saving category:", error)
      const msg = error.message?.includes("unique") ? "Ya existe una categoría con ese slug." : error.message
      toast({ title: "Error al guardar", description: msg, variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabaseAdmin.from("novedades_categories").delete().eq("id", id)
      if (error) throw error
      toast({ title: "Categoría eliminada", description: "Los paquetes asociados ya no pertenecen a esta categoría." })
      await loadCategories()
      onCategoriesChange?.()
    } catch (error: any) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({ name: "", slug: "", display_order: "0", is_active: true, image_url: "" })
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const startEdit = (cat: NovedadesCategory) => {
    setEditingId(cat.id)
    setIsAdding(false)
    setFormData({
      name: cat.name,
      slug: cat.slug,
      display_order: cat.display_order.toString(),
      is_active: cat.is_active,
      image_url: cat.image_url || "",
    })
    setSelectedImage(null)
    setImagePreview(cat.image_url || null)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    resetForm()
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    resetForm()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">Cargando categorías...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="w-5 h-5" />
          Categorías de Novedades
        </CardTitle>
        {!isAdding && !editingId && (
          <Button onClick={startAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nueva Categoría
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {(isAdding || editingId) && (
          <div className="border rounded-lg p-4 bg-primary-50/30 space-y-3">
            <h4 className="font-medium text-sm">{editingId ? "Editar Categoría" : "Nueva Categoría"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Verano 2027"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="verano-2027"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Orden</label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <span className="text-sm">{formData.is_active ? "Activa" : "Inactiva"}</span>
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium mb-1">Imagen (máx 3MB)</label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {imagePreview ? "Cambiar imagen" : "Subir imagen"}
                  </Button>
                  {selectedImage && (
                    <span className="text-xs text-gray-500 ml-2">
                      {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  )}
                </div>
                {imagePreview && (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden border">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedImage(null)
                        setImagePreview(null)
                        setFormData(prev => ({ ...prev, image_url: "" }))
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                    >
                      x
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} size="sm" disabled={isUploading}>
                <Save className="w-4 h-4 mr-1" />
                {isUploading ? "Subiendo..." : editingId ? "Guardar" : "Crear"}
              </Button>
              <Button onClick={cancelForm} variant="outline" size="sm" disabled={isUploading}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {categories.length === 0 && !isAdding ? (
          <p className="text-center text-gray-500 py-8">
            No hay categorías de novedades. Creá una para empezar.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {cat.image_url ? (
                    <div className="relative w-12 h-8 rounded overflow-hidden border">
                      <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-8 rounded bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <span className="text-xs text-gray-400 w-6 text-center">{cat.display_order}</span>
                  <div>
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-gray-400 ml-2">/novedades/{cat.slug}</span>
                  </div>
                  <Badge variant={cat.is_active ? "default" : "secondary"}>
                    {cat.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(cat)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
