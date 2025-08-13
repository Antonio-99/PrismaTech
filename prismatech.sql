-- ============================================================================
-- Base de datos PrismaTech - Sistema de gestión de refacciones de cómputo
-- Archivo: prismatech.sql
-- ============================================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS prismatech 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE prismatech;

-- ============================================================================
-- ESTRUCTURA DE TABLAS
-- ============================================================================

-- Tabla de categorías
DROP TABLE IF EXISTS categorias;
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de productos
DROP TABLE IF EXISTS productos;
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    sku VARCHAR(50) NOT NULL UNIQUE,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    estado ENUM('active','inactive','out_of_stock') NOT NULL DEFAULT 'active',
    categoria_id INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_estado (estado),
    INDEX idx_categoria (categoria_id),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de clientes
DROP TABLE IF EXISTS clientes;
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    direccion TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de ventas/cotizaciones
DROP TABLE IF EXISTS ventas;
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado ENUM('cotizacion','vendido','entregado','cancelado') NOT NULL DEFAULT 'cotizacion',
    notas TEXT,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    INDEX idx_fecha (fecha),
    INDEX idx_estado (estado),
    INDEX idx_cliente (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de detalle de ventas
DROP TABLE IF EXISTS venta_detalle;
CREATE TABLE venta_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
    INDEX idx_venta (venta_id),
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de configuración de la empresa
DROP TABLE IF EXISTS configuracion;
CREATE TABLE configuracion (
    id INT PRIMARY KEY DEFAULT 1,
    nombre_empresa VARCHAR(150) DEFAULT 'PrismaTech',
    rfc VARCHAR(20),
    telefono VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(100),
    sitio_web VARCHAR(100),
    direccion TEXT,
    moneda VARCHAR(10) DEFAULT 'MXN',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Insertar categorías
INSERT INTO categorias (nombre, descripcion) VALUES
('Pantallas', 'Displays LCD, LED, OLED para laptops y monitores'),
('Teclados', 'Teclados de reemplazo para laptops y equipos'),
('Baterías', 'Baterías para laptops y dispositivos móviles'),
('Cargadores', 'Adaptadores de corriente y cargadores universales'),
('Memorias', 'Módulos de memoria RAM DDR3, DDR4, DDR5'),
('Almacenamiento', 'Discos duros SSD, HDD, unidades M.2 NVMe'),
('Componentes', 'Componentes internos y refacciones varias'),
('Periféricos', 'Mouse, webcams, altavoces y accesorios');

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, descripcion, sku, precio, stock, stock_minimo, categoria_id) VALUES
-- Pantallas
('Display LCD 15.6" HP Pavilion', 'Pantalla LCD de 15.6 pulgadas con resolución HD (1366x768) compatible con laptops HP Pavilion dv6, dv7 y modelos similares.', 'LCD-HP-156-001', 1250.00, 8, 3, 1),
('Display LED 14" Lenovo ThinkPad', 'Pantalla LED de 14 pulgadas Full HD (1920x1080) para ThinkPad T440, T450, T460 con marco delgado y bajo consumo.', 'LED-LEN-140-002', 1850.00, 5, 2, 1),
('Display OLED 13.3" Dell XPS', 'Pantalla OLED táctil de 13.3 pulgadas 4K (3840x2160) para Dell XPS 13, colores vibrantes y alto contraste.', 'OLED-DELL-133-003', 4500.00, 2, 1, 1),

-- Teclados
('Teclado Lenovo ThinkPad T440', 'Teclado de reemplazo para ThinkPad T440/T450 con distribución en español, retroiluminación y trackpoint integrado.', 'KBD-LEN-T440-ES', 850.00, 12, 5, 2),
('Teclado HP Pavilion dv6', 'Teclado negro en español para HP Pavilion dv6-3000, dv6-6000 series con marco plateado incluido.', 'KBD-HP-DV6-ES', 650.00, 10, 4, 2),
('Teclado MacBook Pro 13"', 'Teclado completo con topcase para MacBook Pro 13" 2016-2017, teclas butterfly de segunda generación.', 'KBD-MAC-13-2016', 2200.00, 3, 2, 2),

-- Baterías
('Batería HP Pavilion dv6', 'Batería original HP de 4400mAh para Pavilion dv6, tecnología Li-Ion con 6 celdas y garantía de 12 meses.', 'BAT-HP-DV6-4400', 1150.00, 15, 5, 3),
('Batería Lenovo ThinkPad T450', 'Batería interna de 3600mAh para ThinkPad T450, T460, compatibilidad total con sistema de gestión de energía.', 'BAT-LEN-T450-3600', 1350.00, 8, 3, 3),
('Batería MacBook Pro 13"', 'Batería A1582 de 6559mAh para MacBook Pro 13" Retina 2015, incluye herramientas de instalación.', 'BAT-MAC-A1582-6559', 2800.00, 4, 2, 3),

-- Cargadores
('Cargador Universal 65W', 'Cargador universal de 65W con 8 conectores diferentes, compatible con HP, Dell, Acer, Lenovo y más marcas.', 'CHG-UNIV-65W', 450.00, 25, 8, 4),
('Cargador HP 90W Original', 'Cargador original HP de 90W (19.5V 4.62A) para Pavilion, Envy y ProBook, conector 4.5mm x 3.0mm.', 'CHG-HP-90W-ORIG', 780.00, 12, 5, 4),
('Cargador MacBook Pro MagSafe', 'Cargador MagSafe 2 de 60W para MacBook Pro 13", conexión magnética segura y LED indicador de estado.', 'CHG-MAC-MAGSAFE-60W', 1200.00, 6, 3, 4),

-- Memorias
('Memoria RAM DDR4 8GB Kingston', 'Módulo de memoria RAM DDR4 de 8GB a 2400MHz formato SO-DIMM, compatible con laptops Intel y AMD.', 'RAM-KING-8GB-DDR4', 750.00, 20, 8, 5),
('Memoria RAM DDR3 4GB Crucial', 'Módulo SO-DIMM DDR3 de 4GB a 1600MHz, bajo voltaje (1.35V) para mayor eficiencia energética.', 'RAM-CRUC-4GB-DDR3', 380.00, 18, 6, 5),
('Kit Memoria DDR5 16GB Corsair', 'Kit de 2 módulos de 8GB DDR5 a 4800MHz para gaming, con disipadores de calor y perfil XMP 3.0.', 'RAM-CORS-16GB-DDR5', 2200.00, 5, 3, 5),

-- Almacenamiento
('SSD M.2 NVMe 250GB WD', 'Disco sólido SSD M.2 NVMe de 250GB Western Digital Blue, velocidad de lectura hasta 3,500 MB/s.', 'SSD-WD-250GB-M2', 950.00, 15, 5, 6),
('HDD 1TB Seagate', 'Disco duro mecánico de 1TB a 5400RPM formato 2.5", ideal para almacenamiento masivo en laptops.', 'HDD-SEAG-1TB-5400', 850.00, 12, 4, 6),
('SSD 480GB Kingston SATA', 'Disco sólido SATA III de 480GB, velocidad de lectura 500MB/s, incluye kit de clonación de datos.', 'SSD-KING-480GB-SATA', 1200.00, 10, 4, 6),

-- Componentes
('Ventilador CPU Lenovo T440', 'Ventilador de CPU con disipador para ThinkPad T440/T450, incluye pasta térmica y tornillería.', 'FAN-LEN-T440-CPU', 580.00, 8, 3, 7),
('Flex de Video HP dv6', 'Cable flex de video LCD para HP Pavilion dv6, conector de 40 pines con micrófono integrado.', 'FLEX-HP-DV6-LCD', 320.00, 15, 5, 7),
('Motherboard Dell Inspiron 15', 'Tarjeta madre para Dell Inspiron 15-3567 con procesador Intel Core i3-7020U soldado, garantía 6 meses.', 'MB-DELL-3567-I3', 3200.00, 2, 1, 7),

-- Periféricos
('Mouse Inalámbrico Logitech', 'Mouse óptico inalámbrico con receptor USB, 3 botones y rueda de desplazamiento, batería incluida.', 'MOUSE-LOGI-WIRELESS', 280.00, 30, 10, 8),
('Webcam HD 1080p', 'Cámara web USB con resolución Full HD 1080p, micrófono integrado y enfoque automático.', 'CAM-HD-1080P-USB', 650.00, 15, 6, 8),
('Altavoces USB Portátiles', 'Set de altavoces USB de 5W, sonido estéreo, controles de volumen y compatible con cualquier PC.', 'SPK-USB-5W-STEREO', 420.00, 12, 4, 8);

-- Insertar clientes de ejemplo
INSERT INTO clientes (nombre, email, telefono, direccion) VALUES
('Juan Carlos Pérez', 'juan.perez@email.com', '238-123-4567', 'Av. Reforma 123, Col. Centro, Teziutlán, Puebla'),
('María Elena González', 'maria.gonzalez@email.com', '238-234-5678', 'Calle Hidalgo 45, Col. Doctores, Teziutlán, Puebla'),
('Roberto Silva Martínez', 'roberto.silva@email.com', '238-345-6789', 'Blvd. Universidad 789, Col. Universitaria, Teziutlán, Puebla'),
('Ana Patricia López', 'ana.lopez@email.com', '238-456-7890', 'Privada de las Flores 12, Col. Jardines, Teziutlán, Puebla'),
('Carlos Mendoza Tech', 'carlos@mendozatech.com', '238-567-8901', 'Zona Industrial Lote 5, Teziutlán, Puebla');

-- Insertar ventas de ejemplo
INSERT INTO ventas (cliente_id, total, estado, notas) VALUES
(1, 1250.00, 'vendido', 'Pantalla para laptop HP, instalación incluida'),
(2, 850.00, 'entregado', 'Teclado ThinkPad, entregado y probado'),
(3, 1950.00, 'cotizacion', 'Cotización para upgrade de RAM y SSD'),
(4, 1150.00, 'vendido', 'Batería HP con garantía extendida'),
(5, 3200.00, 'cotizacion', 'Motherboard Dell para reparación corporativa');

-- Insertar detalle de ventas
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario) VALUES
-- Venta 1: Pantalla HP
(1, 1, 1, 1250.00),
-- Venta 2: Teclado Lenovo
(2, 4, 1, 850.00),
-- Venta 3: RAM + SSD (cotización)
(3, 9, 1, 750.00),
(3, 13, 1, 1200.00),
-- Venta 4: Batería HP
(4, 7, 1, 1150.00),
-- Venta 5: Motherboard Dell
(5, 18, 1, 3200.00);

-- Insertar configuración inicial
INSERT INTO configuracion (
    id, nombre_empresa, telefono, whatsapp, email, sitio_web, direccion, moneda
) VALUES (
    1, 
    'PrismaTech', 
    '(238) 123-4567', 
    '5212381234567', 
    'info@prismatech.mx', 
    'www.prismatech.mx', 
    'Teziutlán, Puebla, México', 
    'MXN'
);

-- ============================================================================
-- TRIGGERS Y PROCEDIMIENTOS
-- ============================================================================

-- Trigger para actualizar stock cuando se confirma una venta
DELIMITER $$
CREATE TRIGGER actualizar_stock_venta 
AFTER UPDATE ON ventas
FOR EACH ROW
BEGIN
    -- Si la venta cambia de cotización a vendido/entregado
    IF OLD.estado = 'cotizacion' AND (NEW.estado = 'vendido' OR NEW.estado = 'entregado') THEN
        UPDATE productos p
        INNER JOIN venta_detalle vd ON p.id = vd.producto_id
        SET p.stock = p.stock - vd.cantidad
        WHERE vd.venta_id = NEW.id AND p.stock >= vd.cantidad;
        
        -- Marcar productos sin stock
        UPDATE productos p
        INNER JOIN venta_detalle vd ON p.id = vd.producto_id
        SET p.estado = 'out_of_stock'
        WHERE vd.venta_id = NEW.id AND p.stock <= 0;
    END IF;
    
    -- Si se cancela una venta vendida/entregada, restaurar stock
    IF (OLD.estado = 'vendido' OR OLD.estado = 'entregado') AND NEW.estado = 'cancelado' THEN
        UPDATE productos p
        INNER JOIN venta_detalle vd ON p.id = vd.producto_id
        SET p.stock = p.stock + vd.cantidad,
            p.estado = 'active'
        WHERE vd.venta_id = NEW.id;
    END IF;
END$$
DELIMITER ;

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista de productos con información completa
CREATE VIEW vista_productos_completa AS
SELECT 
    p.id,
    p.nombre,
    p.descripcion,
    p.sku,
    p.precio,
    p.stock,
    p.stock_minimo,
    p.estado,
    c.nombre AS categoria,
    CASE 
        WHEN p.stock <= 0 THEN 'Sin stock'
        WHEN p.stock <= p.stock_minimo THEN 'Stock bajo'
        ELSE 'Stock normal'
    END AS estado_stock,
    p.fecha_creacion
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id;

-- Vista de ventas con resumen
CREATE VIEW vista_ventas_resumen AS
SELECT 
    v.id,
    v.fecha,
    cl.nombre AS cliente,
    v.total,
    v.estado,
    COUNT(vd.id) AS productos_cantidad,
    GROUP_CONCAT(p.nombre SEPARATOR ', ') AS productos_nombres
FROM ventas v
LEFT JOIN clientes cl ON v.cliente_id = cl.id
LEFT JOIN venta_detalle vd ON v.id = vd.venta_id
LEFT JOIN productos p ON vd.producto_id = p.id
GROUP BY v.id, v.fecha, cl.nombre, v.total, v.estado;

-- ============================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índices compuestos para búsquedas frecuentes
CREATE INDEX idx_productos_categoria_estado ON productos(categoria_id, estado);
CREATE INDEX idx_ventas_fecha_estado ON ventas(fecha, estado);
CREATE INDEX idx_productos_stock_minimo ON productos(stock, stock_minimo);

-- ============================================================================
-- INFORMACIÓN DE LA BASE DE DATOS
-- ============================================================================

SELECT 'Base de datos PrismaTech creada exitosamente' AS mensaje;
SELECT COUNT(*) AS total_categorias FROM categorias;
SELECT COUNT(*) AS total_productos FROM productos;
SELECT COUNT(*) AS total_clientes FROM clientes;
SELECT COUNT(*) AS total_ventas FROM ventas;

-- Mostrar productos con stock bajo
SELECT 
    nombre, 
    sku, 
    stock, 
    stock_minimo,
    (stock_minimo - stock) AS faltante
FROM productos 
WHERE stock <= stock_minimo 
ORDER BY faltante DESC;