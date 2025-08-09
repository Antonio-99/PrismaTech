-- Crear y usar base de datos
CREATE DATABASE IF NOT EXISTS prismatech;
USE prismatech;

-- Tabla de categorías
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50) DEFAULT 'fas fa-tag',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    marca VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    numero_parte VARCHAR(100),
    precio DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    estado ENUM('activo','inactivo','sin_stock') DEFAULT 'activo',
    icono VARCHAR(50) DEFAULT 'fas fa-cube',
    categoria_id INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Tabla de clientes
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    direccion TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ventas / cotizaciones
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT,
    cliente_nombre VARCHAR(150),
    cliente_telefono VARCHAR(20),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2),
    estado ENUM('cotizacion','vendido','entregado','cancelado') DEFAULT 'cotizacion',
    notas TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- Detalle de ventas
CREATE TABLE venta_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT,
    producto_id INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Configuración de empresa
CREATE TABLE configuracion (
    id INT PRIMARY KEY DEFAULT 1,
    nombre_empresa VARCHAR(150) DEFAULT 'PrismaTech',
    rfc VARCHAR(20),
    telefono VARCHAR(20) DEFAULT '(238) 123-4567',
    whatsapp VARCHAR(20) DEFAULT '5212381234567',
    email VARCHAR(100) DEFAULT 'info@prismatech.mx',
    sitio_web VARCHAR(100) DEFAULT 'www.prismatech.mx',
    direccion TEXT DEFAULT 'Teziutlán, Puebla, México',
    moneda VARCHAR(10) DEFAULT 'MXN'
);

-- Insertar categorías por defecto
INSERT INTO categorias (nombre, descripcion, icono) VALUES
('Pantallas', 'Displays LCD, LED, OLED', 'fas fa-tv'),
('Teclados', 'Teclados de reemplazo', 'fas fa-keyboard'),
('Baterías', 'Baterías para laptops', 'fas fa-battery-three-quarters'),
('Cargadores', 'Adaptadores de corriente', 'fas fa-plug'),
('Memorias', 'RAM DDR3, DDR4, DDR5', 'fas fa-memory'),
('Almacenamiento', 'SSD, HDD, M.2 NVMe', 'fas fa-hdd'),
('Ventiladores', 'Ventiladores y disipadores', 'fas fa-fan'),
('Tarjetas Madre', 'Motherboards y componentes', 'fas fa-microchip');

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, descripcion, marca, sku, numero_parte, precio, stock, categoria_id, icono) VALUES
('Display LCD 15.6" HP Pavilion', 'Pantalla LCD de 15.6 pulgadas con resolución HD (1366x768) compatible con laptops HP Pavilion.', 'HP Compatible', 'LCD-HP-156-001', 'HP-156-LCD-001', 1250.00, 15, 1, 'fas fa-tv'),
('Display LED 14" Lenovo ThinkPad', 'Pantalla LED de 14 pulgadas Full HD (1920x1080) para ThinkPad T440/T450.', 'Lenovo', 'LED-LEN-14-001', 'LEN-14-LED-FHD', 1450.00, 8, 1, 'fas fa-tv'),
('Teclado Lenovo ThinkPad T440', 'Teclado de reemplazo para ThinkPad T440/T450 con distribución en español y retroiluminación.', 'Lenovo', 'KBD-LEN-T440-ES', 'LEN-T440-KB-ES', 850.00, 12, 2, 'fas fa-keyboard'),
('Teclado HP Pavilion 15-r', 'Teclado español para HP Pavilion 15-r series, color negro con marco plateado.', 'HP', 'KBD-HP-15R-ES', 'HP-15R-KB-ES', 750.00, 20, 2, 'fas fa-keyboard'),
('Batería HP Pavilion dv6', 'Batería original HP de 4400mAh para Pavilion dv6. Tecnología Li-Ion con garantía de 6 meses.', 'HP', 'BAT-HP-DV6-4400', 'HP-DV6-BAT-4400', 1150.00, 10, 3, 'fas fa-battery-three-quarters'),
('Batería Lenovo ThinkPad T420', 'Batería de 6 celdas 4400mAh para ThinkPad T420/T430. Duración aproximada 3-4 horas.', 'Lenovo', 'BAT-LEN-T420-6C', 'LEN-T420-BAT-6C', 1300.00, 6, 3, 'fas fa-battery-three-quarters'),
('Cargador Universal 65W', 'Cargador universal de 65W con 8 conectores diferentes. Compatible con múltiples marcas.', 'Universal', 'CHG-UNIV-65W', 'UNIV-CHG-65W-MULTI', 450.00, 25, 4, 'fas fa-plug'),
('Cargador HP 19.5V 4.62A', 'Cargador original HP 90W (19.5V 4.62A) para Pavilion y ProBook series.', 'HP', 'CHG-HP-90W-195', 'HP-90W-195V-462A', 380.00, 18, 4, 'fas fa-plug'),
('Memoria RAM DDR4 8GB Kingston', 'Módulo de memoria RAM DDR4 de 8GB a 2400MHz formato SO-DIMM para laptops.', 'Kingston', 'RAM-KING-8GB-DDR4', 'KST-8GB-DDR4-2400', 650.00, 30, 5, 'fas fa-memory'),
('Memoria RAM DDR3 4GB Crucial', 'Módulo de memoria RAM DDR3 de 4GB a 1600MHz formato SO-DIMM.', 'Crucial', 'RAM-CRUC-4GB-DDR3', 'CRU-4GB-DDR3-1600', 350.00, 22, 5, 'fas fa-memory'),
('SSD M.2 NVMe 250GB WD', 'Disco sólido SSD M.2 NVMe de 250GB. Velocidad de lectura hasta 3,500 MB/s.', 'Western Digital', 'SSD-WD-250GB-M2', 'WD-250GB-M2-NVMe', 850.00, 14, 6, 'fas fa-hdd'),
('HDD 2.5" 500GB Seagate', 'Disco duro mecánico de 2.5 pulgadas, 500GB, 7200 RPM para laptops.', 'Seagate', 'HDD-SEA-500GB-25', 'SEA-500GB-25-7200', 650.00, 16, 6, 'fas fa-hdd'),
('Ventilador HP Pavilion dv6', 'Ventilador de reemplazo para HP Pavilion dv6 con disipador de calor incluido.', 'HP', 'FAN-HP-DV6-COOL', 'HP-DV6-FAN-HEAT', 320.00, 8, 7, 'fas fa-fan'),
('Ventilador Lenovo T420 T430', 'Ventilador compatible con ThinkPad T420/T430 con disipador térmico.', 'Lenovo', 'FAN-LEN-T420-T430', 'LEN-T420-FAN-COOL', 380.00, 12, 7, 'fas fa-fan');

-- Insertar configuración por defecto
INSERT INTO configuracion VALUES (1, 'PrismaTech', 'PRIS123456789', '(238) 123-4567', '5212381234567', 'info@prismatech.mx', 'www.prismatech.mx', 'Teziutlán, Puebla, México', 'MXN');

-- Insertar algunos clientes de ejemplo
INSERT INTO clientes (nombre, email, telefono, direccion) VALUES
('Juan Pérez', 'juan.perez@email.com', '2381234567', 'Centro, Teziutlán, Puebla'),
('María González', 'maria.gonzalez@email.com', '2387654321', 'Col. Insurgentes, Teziutlán, Puebla'),
('Carlos López', 'carlos.lopez@email.com', '2381122334', 'Col. Buenos Aires, Teziutlán, Puebla');

-- Insertar algunas ventas de ejemplo
INSERT INTO ventas (cliente_nombre, cliente_telefono, total, estado, notas) VALUES
('Ana Martínez', '2381111111', 1250.00, 'cotizacion', 'Interesada en pantalla para HP'),
('Roberto Silva', '2382222222', 850.00, 'vendido', 'Teclado para ThinkPad T440'),
('Laura Rodríguez', '2383333333', 1800.00, 'entregado', 'Batería y cargador para Pavilion');

-- Insertar detalles de ventas
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario) VALUES
(1, 1, 1, 1250.00),
(2, 3, 1, 850.00),
(3, 5, 1, 1150.00),
(3, 8, 1, 650.00);