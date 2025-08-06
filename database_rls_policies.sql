-- ===============================================
-- POLÍTICAS DE RLS PARA TABLA ACCOMMODATIONS
-- ===============================================
-- Este script corrige el error de Row Level Security

-- Habilitar RLS en la tabla accommodations (si no está habilitado)
ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Allow all operations on accommodations" ON accommodations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON accommodations;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON accommodations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON accommodations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON accommodations;

-- Crear política para permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Allow all operations on accommodations" ON accommodations
    FOR ALL USING (true) WITH CHECK (true);

-- ===============================================
-- POLÍTICAS DE RLS PARA TABLA ACCOMMODATION_RATES
-- ===============================================

-- Habilitar RLS en la tabla accommodation_rates (si no está habilitado)
ALTER TABLE accommodation_rates ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Allow all operations on accommodation_rates" ON accommodation_rates;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON accommodation_rates;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON accommodation_rates;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON accommodation_rates;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON accommodation_rates;

-- Crear política para permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Allow all operations on accommodation_rates" ON accommodation_rates
    FOR ALL USING (true) WITH CHECK (true);

-- ===============================================
-- VERIFICAR POLÍTICAS EXISTENTES EN TRAVEL_PACKAGES
-- ===============================================

-- Si la tabla travel_packages también necesita políticas, las creamos
-- (Solo si no existen ya)
DO $$
BEGIN
    -- Verificar si existen políticas para travel_packages
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'travel_packages' 
        AND policyname = 'Allow all operations on travel_packages'
    ) THEN
        -- Habilitar RLS en travel_packages si no está habilitado
        ALTER TABLE travel_packages ENABLE ROW LEVEL SECURITY;
        
        -- Crear política permisiva para travel_packages
        CREATE POLICY "Allow all operations on travel_packages" ON travel_packages
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- ===============================================
-- VERIFICAR CREACIÓN DE POLÍTICAS
-- ===============================================

-- Consulta para verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('accommodations', 'accommodation_rates', 'travel_packages')
ORDER BY tablename, policyname;
