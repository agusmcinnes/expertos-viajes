// Script de prueba para Supabase Storage
// Ejecutar en la consola del navegador (F12)

async function testSupabaseStorage() {
  console.log('🧪 Iniciando test de Supabase Storage...')
  
  try {
    // Importar cliente de Supabase
    const { supabase } = await import('/lib/supabase.ts')
    
    console.log('✅ Cliente Supabase importado')
    
    // Listar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listando buckets:', bucketsError)
      return
    }
    
    console.log('📦 Buckets disponibles:', buckets)
    
    // Verificar si pdfs_expertos existe
    const bucketExists = buckets?.some(bucket => bucket.name === 'pdfs_expertos')
    console.log('🔍 pdfs_expertos existe:', bucketExists)
    
    if (!bucketExists) {
      console.error('❌ Bucket pdfs_expertos no encontrado')
      return
    }
    
    // Intentar listar archivos en el bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('pdfs_expertos')
      .list()
    
    if (filesError) {
      console.error('❌ Error listando archivos:', filesError)
      return
    }
    
    console.log('📁 Archivos en bucket:', files)
    console.log('✅ Test completado exitosamente')
    
  } catch (error) {
    console.error('💥 Error en test:', error)
  }
}

// Ejecutar test
testSupabaseStorage()