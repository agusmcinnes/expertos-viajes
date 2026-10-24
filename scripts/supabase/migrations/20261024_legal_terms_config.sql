-- =====================================================
-- Migration: Términos legales configurables
-- Fecha: 2026-10-24
-- Descripción:
--   Claves de site_config para el botón de términos legales del footer.
--   Opcional: el admin crea las claves al guardar si no existen.
--   Los archivos del portal de agencias usan claves agency_file_<key>
--   que también se crean desde el admin.
-- =====================================================

INSERT INTO public.site_config (config_key, config_value, description)
SELECT 'legal_terms_button_text', 'Términos y condiciones', 'Texto del botón de términos legales del footer'
WHERE NOT EXISTS (SELECT 1 FROM public.site_config WHERE config_key = 'legal_terms_button_text');

INSERT INTO public.site_config (config_key, config_value, description)
SELECT 'legal_terms_content', '', 'Contenido del modal de términos legales (vacío = botón oculto)'
WHERE NOT EXISTS (SELECT 1 FROM public.site_config WHERE config_key = 'legal_terms_content');
