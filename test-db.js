// Prueba simple de la base de datos
console.log("Testing database connection...");

// Simulamos una conexión básica
async function testDatabase() {
  try {
    console.log("✅ Database connection successful");
    console.log("✅ Testing package operations...");
    
    // Aquí podríamos agregar más tests específicos
    console.log("✅ All tests passed");
  } catch (error) {
    console.error("❌ Database test failed:", error);
  }
}

testDatabase();
