-- Agregar nuevos destinos
INSERT INTO destinations (name, code, description) VALUES
('EEUU / Canadá', 'eeuu-canada', 'Descubrí la grandeza de América del Norte, desde las metrópolis vibrantes hasta paisajes naturales impresionantes'),
('Europa y Clásicos', 'europa-clasicos', 'Los destinos más icónicos de Europa, arte, historia y cultura milenaria en cada rincón'),
('Exóticos y Resto del Mundo', 'exoticos-mundo', 'Aventuras únicas en destinos remotos y culturas fascinantes alrededor del mundo');

-- Agregar algunos paquetes de ejemplo para los nuevos destinos
INSERT INTO travel_packages (name, description, price, destination_id, duration, image_url, available_dates) VALUES
-- EEUU / Canadá (ID 5)
(
    'Nueva York & Cataratas del Niágara',
    'La Gran Manzana y una de las cascadas más famosas del mundo. Broadway, Central Park, Times Square y la majestuosidad del Niágara.',
    2200.00,
    5,
    '8 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-04-15', '2025-05-20', '2025-06-18']
),
(
    'Costa Oeste USA: Los Ángeles, San Francisco & Vegas',
    'El sueño americano en su máxima expresión. Hollywood, Golden Gate, parques nacionales y la ciudad del entretenimiento.',
    2800.00,
    5,
    '12 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-05-10', '2025-06-25', '2025-07-30']
),
(
    'Canadá: Toronto, Montreal & Rocosas',
    'La belleza natural de Canadá combinada con ciudades cosmopolitas. Lagos cristalinos, montañas nevadas y cultura franco-canadiense.',
    2400.00,
    5,
    '10 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-06-01', '2025-07-15', '2025-08-20']
),

-- Europa y Clásicos (ID 6)
(
    'España & Portugal: Madrid, Barcelona & Lisboa',
    'La península ibérica en todo su esplendor. Arte, gastronomía excepcional, arquitectura única y la calidez mediterránea.',
    1900.00,
    6,
    '9 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-04-20', '2025-05-25', '2025-06-15']
),
(
    'Italia Clásica: Roma, Florencia & Venecia',
    'Cuna del Renacimiento y la historia occidental. Coliseo, Vaticano, arte florentino y los románticos canales venecianos.',
    2100.00,
    6,
    '10 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-04-10', '2025-05-18', '2025-06-22']
),
(
    'Francia: París & Castillos del Loira',
    'La elegancia francesa en estado puro. Torre Eiffel, Louvre, Notre-Dame y los castillos de cuento de hadas del valle del Loira.',
    2300.00,
    6,
    '8 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-05-05', '2025-06-12', '2025-07-08']
),
(
    'Grecia: Atenas & Islas del Egeo',
    'Cuna de la civilización occidental. Acrópolis, islas paradisíacas, mitología griega y la hospitalidad mediterránea.',
    1800.00,
    6,
    '9 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-04-25', '2025-05-30', '2025-06-28']
),

-- Exóticos y Resto del Mundo (ID 7)
(
    'India: Delhi, Agra & Rajastán',
    'Colores, sabores y espiritualidad en el subcontinente indio. Taj Mahal, palacios maharajás y la mística de la India eterna.',
    2600.00,
    7,
    '12 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-04-12', '2025-05-20', '2025-06-30']
),
(
    'Tailandia: Bangkok, Chiang Mai & Phuket',
    'El paraíso del sudeste asiático. Templos dorados, playas tropicales, gastronomía exótica y la sonrisa tailandesa.',
    2000.00,
    7,
    '10 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-05-15', '2025-06-20', '2025-07-25']
),
(
    'Marruecos: Marrakech, Fez & Sahara',
    'Las mil y una noches hechas realidad. Zocos coloridos, arquitectura islámica, desierto del Sahara y hospitalidad bereber.',
    1700.00,
    7,
    '9 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-04-18', '2025-05-28', '2025-06-25']
),
(
    'Egipto: El Cairo, Luxor & Crucero por el Nilo',
    'Los misterios del antiguo Egipto. Pirámides, esfinge, templos faraónicos y un crucero mágico por el río sagrado.',
    2400.00,
    7,
    '11 días',
    '/placeholder.svg?height=300&width=400',
    ARRAY['2025-04-08', '2025-05-15', '2025-06-18']
);
