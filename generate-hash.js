// Script para generar el hash correcto de la contraseña
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'salt_secret_key')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Generar hash para la contraseña "123456"
hashPassword("123456").then(hash => {
  console.log("Hash correcto para '123456':", hash)
  console.log("Comando SQL:")
  console.log(`UPDATE agencies SET password = '${hash}' WHERE email = 'stairus720@gmail.com';`)
})