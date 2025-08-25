// Script para verificar la configuración de EmailJS
// Ejecutar en la consola del navegador para verificar que todo esté configurado

console.log('🔍 Verificando configuración de EmailJS...\n');

// Verificar variables de entorno
const userID = process.env.NEXT_PUBLIC_EMAILJS_USER_ID;
const serviceID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const templateID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;

console.log('📋 Variables de entorno:');
console.log(`User ID: ${userID ? '✅ Configurado' : '❌ No configurado'}`);
console.log(`Service ID: ${serviceID ? '✅ Configurado' : '❌ No configurado'}`);
console.log(`Template ID: ${templateID ? '✅ Configurado' : '❌ No configurado'}\n`);

// Verificar si EmailJS está cargado
if (typeof emailjs !== 'undefined') {
    console.log('✅ EmailJS cargado correctamente\n');
    
    // Test de conexión básico
    console.log('🧪 Ejecutando test básico...');
    
    if (userID && serviceID && templateID) {
        console.log('✅ Todas las variables están configuradas');
        console.log('💡 Puedes probar enviando el formulario de contacto');
    } else {
        console.log('❌ Faltan variables de entorno');
        console.log('📝 Revisa tu archivo .env.local');
    }
} else {
    console.log('❌ EmailJS no está cargado');
    console.log('💡 Verifica que la librería esté instalada');
}

console.log('\n🔗 Enlaces útiles:');
console.log('Dashboard EmailJS: https://dashboard.emailjs.com/');
console.log('Documentación: https://www.emailjs.com/docs/');
console.log('Manual completo: Ver archivo MANUAL_EMAILJS.md');
