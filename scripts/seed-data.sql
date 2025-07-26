-- Insertar destinos
INSERT INTO destinations (name, code, description) VALUES
('Argentina', 'argentina', 'Descubrí la diversidad de Argentina, desde Buenos Aires hasta la Patagonia'),
('Brasil', 'brasil', 'Playas paradisíacas, cultura vibrante y la alegría brasileña'),
('Caribe y Centroamérica', 'caribe', 'Aguas cristalinas y culturas fascinantes del Caribe'),
('Viajes Especiales', 'especiales', 'Destinos únicos y experiencias extraordinarias alrededor del mundo');

-- Insertar paquetes de ejemplo
INSERT INTO travel_packages (name, description, price, destination_id, duration, image_url, available_dates) VALUES
(
    'Buenos Aires & Cataratas del Iguazú',
    'Descubrí la capital argentina y una de las maravillas naturales más impresionantes del mundo. Incluye city tour por Buenos Aires, vuelos internos y 2 noches en Puerto Iguazú.',
    1200.00,
    1,
    '7 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-03-15', '2024-04-22', '2024-05-10']
),
(
    'Patagonia Aventura',
    'Glaciares, montañas y paisajes únicos en el fin del mundo. Incluye El Calafate, El Chaltén y navegación por el Lago Argentino.',
    1800.00,
    1,
    '10 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-04-05', '2024-05-20', '2024-06-15']
),
(
    'Río de Janeiro & Salvador',
    'Playas paradisíacas, cultura vibrante y la alegría brasileña en su máxima expresión. Cristo Redentor, Pan de Azúcar y Pelourinho.',
    1400.00,
    2,
    '8 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-03-12', '2024-04-18', '2024-05-25']
),
(
    'Amazonas Místico',
    'Adentrate en la selva más grande del mundo y conectá con la naturaleza pura. Lodge en la selva y avistamiento de fauna.',
    1600.00,
    2,
    '9 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-04-08', '2024-05-15', '2024-06-22']
),
(
    'Cancún & Riviera Maya',
    'Playas de arena blanca, aguas cristalinas y la cultura maya en un solo viaje. Incluye Chichén Itzá y cenotes.',
    1100.00,
    3,
    '6 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-03-20', '2024-04-25', '2024-05-30']
),
(
    'Costa Rica Pura Vida',
    'Volcanes, selvas tropicales y playas en el paraíso centroamericano. Parques nacionales y aventura.',
    1300.00,
    3,
    '7 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-04-10', '2024-05-18', '2024-06-28']
),
(
    'Japón Tradicional',
    'Templos milenarios, tecnología futurista y la cultura más fascinante de Asia. Tokio, Kioto y Monte Fuji.',
    2500.00,
    4,
    '12 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-04-05', '2024-05-20', '2024-07-10']
),
(
    'Safari Africano',
    'Los Big Five, atardeceres únicos y la aventura más salvaje que puedas imaginar. Kenia y Tanzania.',
    3200.00,
    4,
    '14 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2024-05-15', '2024-06-25', '2024-08-20']
);

-- Insertar usuario admin por defecto
INSERT INTO admin_users (username, password_hash, email) VALUES
('admin', '$2b$10$rQZ8kHWKtGkVQhzQzQzQzOzQzQzQzQzQzQzQzQzQzQzQzQzQzQzQz', 'admin@expertosviajes.com');
