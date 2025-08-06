-- ============================================
-- PrismaTech Database Seeds
-- Datos de ejemplo para desarrollo y testing
-- ============================================

USE prismatech_db;

-- Limpiar tablas existentes (en orden correcto por dependencias)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE inventory_movements;
TRUNCATE TABLE sale_items;
TRUNCATE TABLE sales;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE customers;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE user_sessions;
TRUNCATE TABLE users;
TRUNCATE TABLE system_settings;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Usuarios Administrativos
-- ============================================
INSERT INTO users (username, password_hash, full_name, email, role, status) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador Principal', 'admin@prismatech.mx', 'admin', 'active'),
('manager', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Gerente de Ventas', 'gerente@prismatech.mx', 'manager', 'active'),
('vendedor1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos Mendoza', 'carlos@prismatech.mx', 'employee', 'active'),
('vendedor2', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana García', 'ana@prismatech.mx', 'employee', 'active');

-- ============================================
-- Categorías de Productos
-- ============================================
INSERT INTO categories (name, slug, description, icon) VALUES
('Pantallas y Displays', 'pantallas', 'Pantallas LCD, LED, OLED para laptops y monitores de escritorio', 'fas fa-tv'),
('Teclados', 'teclados', 'Teclados de reemplazo para laptops y teclados externos', 'fas fa-keyboard'),
('Ventiladores y Cooling', 'ventiladores', 'Ventiladores internos, disipadores y sistemas de enfriamiento', 'fas fa-fan'),
('Baterías', 'baterias', 'Baterías de repuesto para laptops y dispositivos móviles', 'fas fa-battery-three-quarters'),
('Cargadores y Adaptadores', 'cargadores', 'Cargadores universales, adaptadores de corriente y cables', 'fas fa-plug'),
('Memorias RAM', 'memorias', 'Módulos de memoria RAM DDR3, DDR4, DDR5 y SO-DIMM', 'fas fa-memory'),
('Almacenamiento', 'almacenamiento', 'Discos duros, SSD, unidades M.2 NVMe y almacenamiento externo', 'fas fa-hdd'),
('Componentes Varios', 'componentes', 'Touchpads, bisagras, cables flex y otros componentes', 'fas fa-microchip');

-- ============================================
-- Proveedores
-- ============================================
INSERT INTO suppliers (name, company_name, email, phone, contact_person, payment_terms, status) VALUES
('TechSupply México', 'TechSupply S.A. de C.V.', 'ventas@techsupply.mx', '55-1234-5678', 'Roberto Sánchez', '30 días', 'active'),
('Distribuidora HP', 'HP Distribución México', 'pedidos@hp-dist.mx', '55-9876-5432', 'María López', '15 días', 'active'),
('Parts International', 'Parts International LLC', 'mexico@partsinternational.com', '55-5555-0000', 'John Smith', '45 días', 'active'),
('Electrónicos del Valle', 'Electrónicos del Valle S.A.', 'compras@edelvalle.mx', '238-111-2222', 'Luis Hernández', '30 días', 'active');

-- ============================================
-- Productos del Inventario
-- ============================================
INSERT INTO products (name, slug, category_id, brand, sku, price, cost_price, stock, min_stock, description, specifications, compatibility, icon, created_by) VALUES

-- Pantallas y Displays
('Display LCD 15.6" HD Compatible HP Pavilion', 'display-lcd-156-hp-pavilion', 1, 'HP Compatible', 'LCD-HP-156-001', 1890.00, 1200.00, 8, 3, 'Pantalla LCD de 15.6 pulgadas con resolución HD (1366x768) compatible con laptops HP Pavilion. Conexión LVDS de 40 pines.', '{"resolution": "1366x768", "size": "15.6", "connector": "LVDS 40 pin", "backlight": "LED"}', '["HP Pavilion 15-n", "HP Pavilion 15-p", "HP Pavilion 15-r"]', 'fas fa-tv', 1),

('Display OLED 14" FHD Asus ZenBook UX425', 'display-oled-14-asus-zenbook', 1, 'Asus', 'OLED-ASUS-14-001', 3200.00, 2100.00, 3, 2, 'Pantalla OLED Full HD de 14 pulgadas para Asus ZenBook. Colores vibrantes y alto contraste con tecnología OLED.', '{"resolution": "1920x1080", "size": "14", "connector": "eDP", "technology": "OLED"}', '["Asus ZenBook UX425EA", "Asus ZenBook UX425JA"]', 'fas fa-desktop', 1),

('Display IPS 13.3" MacBook Air A1932', 'display-ips-133-macbook-air', 1, 'Apple Compatible', 'IPS-MBA-133-001', 2800.00, 1850.00, 2, 1, 'Pantalla IPS Retina de 13.3 pulgadas para MacBook Air 2018-2020. Resolución 2560x1600 con True Tone.', '{"resolution": "2560x1600", "size": "13.3", "technology": "IPS Retina", "features": "True Tone"}', '["MacBook Air A1932", "MacBook Air A2179"]', 'fas fa-laptop', 1),

-- Teclados
('Teclado Lenovo ThinkPad T440 Español Retroiluminado', 'teclado-lenovo-thinkpad-t440-es', 2, 'Lenovo', 'KBD-LEN-T440-ES', 650.00, 420.00, 15, 5, 'Teclado de reemplazo para ThinkPad T440/T450 con distribución en español y retroiluminación LED blanca.', '{"layout": "Spanish", "backlight": "LED White", "connector": "Ribbon cable"}', '["ThinkPad T440", "ThinkPad T450", "ThinkPad L440"]', 'fas fa-keyboard', 1),

('Teclado Gaming Mecánico RGB Redragon K552', 'teclado-gaming-redragon-k552', 2, 'Redragon', 'KBD-RED-K552-RGB', 890.00, 580.00, 12, 4, 'Teclado mecánico gaming con switches azules, retroiluminación RGB personalizable y construcción metálica.', '{"switches": "Blue mechanical", "backlight": "RGB", "connectivity": "USB", "layout": "87 keys"}', '["Compatible con cualquier PC"]', 'fas fa-keyboard', 1),

-- Ventiladores
('Ventilador CPU Dell Inspiron 15-3000 Series', 'ventilador-dell-inspiron-15-3000', 3, 'Dell', 'FAN-DELL-I15-3000', 420.00, 280.00, 10, 3, 'Ventilador interno para Dell Inspiron serie 3000. Incluye disipador de calor y pasta térmica de alta calidad.', '{"compatibility": "Dell Inspiron 15-3000", "includes": "Heat sink + thermal paste", "rpm": "2800"}', '["Inspiron 15-3541", "Inspiron 15-3542", "Inspiron 15-3543"]', 'fas fa-fan', 1),

('Ventilador MacBook Pro 13" 2017-2020 A1989', 'ventilador-macbook-pro-13-a1989', 3, 'Apple Compatible', 'FAN-MBP-13-A1989', 750.00, 500.00, 6, 2, 'Ventilador de reemplazo para MacBook Pro 13 pulgadas modelos 2017-2020. Incluye sensor de temperatura integrado.', '{"compatibility": "MacBook Pro 13", "sensor": "Temperature sensor", "rpm": "6500"}', '["MacBook Pro A1989", "MacBook Pro A2159"]', 'fas fa-fan', 1),

-- Baterías
('Batería HP Pavilion dv6 4400mAh Li-Ion Original', 'bateria-hp-pavilion-dv6-4400mah', 4, 'HP', 'BAT-HP-DV6-4400', 980.00, 650.00, 7, 3, 'Batería original HP de 4400mAh para Pavilion dv6. Tecnología Li-Ion con protección contra sobrecarga y garantía de 1 año.', '{"capacity": "4400mAh", "voltage": "10.8V", "cells": "6", "chemistry": "Li-Ion"}', '["HP Pavilion dv6-1000", "HP Pavilion dv6-2000", "HP Pavilion dv6-3000"]', 'fas fa-battery-three-quarters', 1),

('Batería Dell XPS 15 9560/9570 6000mAh', 'bateria-dell-xps-15-6000mah', 4, 'Dell Compatible', 'BAT-DELL-XPS15-6000', 1450.00, 950.00, 4, 2, 'Batería de alta capacidad 6000mAh para Dell XPS 15. Duración extendida hasta 8 horas de uso normal.', '{"capacity": "6000mAh", "voltage": "11.4V", "cells": "3", "chemistry": "Li-Polymer"}', '["Dell XPS 15 9560", "Dell XPS 15 9570"]', 'fas fa-battery-full', 1),

-- Cargadores
('Cargador Universal 65W Multi-Conector', 'cargador-universal-65w-multi', 5, 'Universal', 'CHG-UNIV-65W-MULTI', 350.00, 230.00, 20, 8, 'Cargador universal de 65W con 8 conectores diferentes. Compatible con la mayoría de laptops del mercado.', '{"power": "65W", "connectors": "8 tips included", "input": "100-240V", "output": "19V 3.42A"}', '["HP", "Dell", "Lenovo", "Acer", "Asus", "Toshiba"]', 'fas fa-plug', 1),

('Cargador MacBook USB-C 61W Original Apple', 'cargador-macbook-usb-c-61w', 5, 'Apple', 'CHG-APPLE-61W-USBC', 1200.00, 800.00, 5, 2, 'Cargador original Apple USB-C de 61W para MacBook Pro 13 pulgadas y MacBook Air con chip M1.', '{"power": "61W", "connector": "USB-C", "cable": "USB-C to USB-C 2m", "compatibility": "MacBook Pro 13, MacBook Air"}', '["MacBook Pro 13", "MacBook Air M1", "MacBook Air M2"]', 'fas fa-plug', 1),

-- Memorias RAM
('Memoria RAM DDR4 8GB 2400MHz Kingston SODIMM', 'memoria-ddr4-8gb-kingston-sodimm', 6, 'Kingston', 'RAM-KING-8GB-DDR4', 1250.00, 820.00, 18, 6, 'Módulo de memoria RAM DDR4 de 8GB a 2400MHz formato SO-DIMM. Marca Kingston con garantía de por vida.', '{"capacity": "8GB", "type": "DDR4 SO-DIMM", "speed": "2400MHz", "latency": "CL17", "voltage": "1.2V"}', '["Laptops DDR4 compatible", "Mini PCs", "All-in-One PCs"]', 'fas fa-memory', 1),

('Memoria RAM DDR5 16GB 4800MHz Corsair', 'memoria-ddr5-16gb-corsair', 6, 'Corsair', 'RAM-CORS-16GB-DDR5', 2100.00, 1400.00, 8, 3, 'Módulo de memoria RAM DDR5 de 16GB a 4800MHz. Tecnología de nueva generación para máximo rendimiento.', '{"capacity": "16GB", "type": "DDR5 SO-DIMM", "speed": "4800MHz", "latency": "CL40", "voltage": "1.1V"}', '["Laptops DDR5 compatible", "Gaming laptops", "Workstations"]', 'fas fa-memory', 1),

-- Almacenamiento
('Disco SSD M.2 NVMe 250GB WD Blue SN570', 'ssd-m2-250gb-wd-blue-sn570', 7, 'Western Digital', 'SSD-WD-250GB-M2', 950.00, 620.00, 12, 4, 'Disco sólido SSD M.2 NVMe de 250GB. Velocidad de lectura hasta 3,500 MB/s con interfaz PCIe 3.0.', '{"capacity": "250GB", "interface": "M.2 2280 PCIe 3.0", "read_speed": "3500 MB/s", "write_speed": "2300 MB/s"}', '["M.2 2280 slot", "PCIe 3.0 compatible", "Most modern laptops"]', 'fas fa-hdd', 1),

('Disco SSD SATA 500GB Samsung 870 EVO', 'ssd-sata-500gb-samsung-870evo', 7, 'Samsung', 'SSD-SAM-500GB-SATA', 1350.00, 890.00, 9, 3, 'Disco SSD SATA de 500GB Samsung 870 EVO. Excelente relación precio-rendimiento con tecnología V-NAND.', '{"capacity": "500GB", "interface": "SATA III 6Gb/s", "read_speed": "560 MB/s", "write_speed": "530 MB/s"}', '["SATA compatible laptops", "Desktop computers", "Upgrade kits"]', 'fas fa-hdd', 1),

-- Componentes Varios
('Touchpad Acer Aspire 5 A515 Series', 'touchpad-acer-aspire-5-a515', 8, 'Acer', 'TP-ACER-A5-A515', 380.00, 250.00, 6, 2, 'Touchpad de reemplazo para Acer Aspire 5 serie A515. Incluye botones izquierdo y derecho integrados.', '{"compatibility": "Acer Aspire 5 A515", "buttons": "Left/Right integrated", "connector": "Ribbon cable"}', '["Acer Aspire 5 A515-51", "Acer Aspire 5 A515-52"]', 'fas fa-mouse', 1),

('Bisagras Samsung Galaxy Book Pro 15"', 'bisagras-samsung-galaxy-book-pro-15', 8, 'Samsung', 'HINGE-SAM-GBP15', 290.00, 190.00, 4, 1, 'Par de bisagras de reemplazo para Samsung Galaxy Book Pro 15 pulgadas. Material de alta resistencia.', '{"compatibility": "Galaxy Book Pro 15", "material": "Metal reinforced", "quantity": "Pair (2 pieces)"}', '["Samsung Galaxy Book Pro 15"]', 'fas fa-cogs', 1);

-- ============================================
-- Clientes de Ejemplo
-- ============================================
INSERT INTO customers (name, email, phone, address, city, state, customer_type, status) VALUES
('Juan Pérez Martínez', 'juan.perez@email.com', '238-123-4567', 'Av. Reforma 123, Col. Centro', 'Teziutlán', 'Puebla', 'individual', 'active'),
('María González López', 'maria.gonzalez@gmail.com', '238-234-5678', 'Calle Hidalgo 456', 'Teziutlán', 'Puebla', 'individual', 'active'),
('TechServicios S.A. de C.V.', 'compras@techservicios.com', '238-345-6789', 'Blvd. Universidad 789', 'Teziutlán', 'Puebla', 'business', 'active'),
('Carlos Mendoza Ruiz', 'carlos.mendoza@hotmail.com', '238-456-7890', 'Privada de las Flores 321', 'Teziutlán', 'Puebla', 'individual', 'active'),
('Computadoras del Norte', 'ventas@computadorasdelnorte.mx', '238-567-8901', 'Av. 20 de Noviembre 654', 'Teziutlán', 'Puebla', 'business', 'active'),
('Ana Sofía Ramírez', 'ana.ramirez@yahoo.com', '238-678-9012', 'Calle Libertad 987', 'Teziutlán', 'Puebla', 'individual', 'active'),
('Roberto Silva Castro', 'roberto.silva@gmail.com', '238-789-0123', 'Av. Juárez 147', 'Teziutlán', 'Puebla', 'individual', 'active');

-- ============================================
-- Ventas de Ejemplo
-- ============================================
INSERT INTO sales (sale_number, customer_id, customer_name, customer_phone, customer_email, subtotal, tax_amount, total, payment_method, sold_by, sale_date) VALUES
('V-2025-0001', 1, 'Juan Pérez Martínez', '238-123-4567', 'juan.perez@email.com', 1890.00, 302.40, 2192.40, 'efectivo', 3, '2025-01-15 10:30:00'),
('V-2025-0002', 2, 'María González López', '238-234-5678', 'maria.gonzalez@gmail.com', 650.00, 104.00, 754.00, 'tarjeta_debito', 3, '2025-01-15 14:15:00'),
('V-2025-0003', 3, 'TechServicios S.A. de C.V.', '238-345-6789', 'compras@techservicios.com', 3500.00, 560.00, 4060.00, 'transferencia', 4, '2025-01-16 09:45:00'),
('V-2025-0004', 4, 'Carlos Mendoza Ruiz', '238-456-7890', 'carlos.mendoza@hotmail.com', 980.00, 156.80, 1136.80, 'tarjeta_credito', 3, '2025-01-16 16:20:00'),
('V-2025-0005', 5, 'Computadoras del Norte', '238-567-8901', 'ventas@computadorasdelnorte.mx', 5250.00, 840.00, 6090.00, 'transferencia', 4, '2025-01-17 11:00:00');

-- ============================================
-- Items de Ventas
-- ============================================
INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, quantity, unit_price, unit_cost, subtotal) VALUES
-- Venta 1: Juan Pérez - Display LCD HP
(1, 1, 'Display LCD 15.6" HD Compatible HP Pavilion', 'LCD-HP-156-001', 1, 1890.00, 1200.00, 1890.00),

-- Venta 2: María González - Teclado ThinkPad
(2, 4, 'Teclado Lenovo ThinkPad T440 Español Retroiluminado', 'KBD-LEN-T440-ES', 1, 650.00, 420.00, 650.00),

-- Venta 3: TechServicios - Multiple items
(3, 2, 'Display OLED 14" FHD Asus ZenBook UX425', 'OLED-ASUS-14-001', 1, 3200.00, 2100.00, 3200.00),
(3, 11, 'Cargador MacBook USB-C 61W Original Apple', 'CHG-APPLE-61W-USBC', 1, 1200.00, 800.00, 1200.00),

-- Venta 4: Carlos Mendoza - Batería HP
(4, 7, 'Batería HP Pavilion dv6 4400mAh Li-Ion Original', 'BAT-HP-DV6-4400', 1, 980.00, 650.00, 980.00),

-- Venta 5: Computadoras del Norte - Bulk order
(5, 12, 'Memoria RAM DDR4 8GB 2400MHz Kingston SODIMM', 'RAM-KING-8GB-DDR4', 3, 1250.00, 820.00, 3750.00),
(5, 14, 'Disco SSD M.2 NVMe 250GB WD Blue SN570', 'SSD-WD-250GB-M2', 1, 950.00, 620.00, 950.00),
(5, 10, 'Cargador Universal 65W Multi-Conector', 'CHG-UNIV-65W-MULTI', 1, 350.00, 230.00, 350.00),
(5, 6, 'Ventilador CPU Dell Inspiron 15-3000 Series', 'FAN-DELL-I15-3000', 1, 420.00, 280.00, 420.00);

-- ============================================
-- Configuración del Sistema
-- ============================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'PrismaTech', 'string', 'Nombre de la empresa'),
('company_address', 'Teziutlán, Puebla, México', 'string', 'Dirección de la empresa'),
('company_phone', '+52 (238) 123-4567', 'string', 'Teléfono principal'),
('company_email', 'info@prismatech.mx', 'string', 'Email de contacto'),
('tax_rate', '0.16', 'number', 'Tasa de IVA por defecto'),
('currency', 'MXN', 'string', 'Moneda del sistema'),
('low_stock_threshold', '5', 'number', 'Umbral de stock bajo'),
('session_timeout', '28800', 'number', 'Timeout de sesión en segundos (8 horas)'),
('backup_frequency', 'daily', 'string', 'Frecuencia de respaldos automáticos'),
('enable_notifications', 'true', 'boolean', 'Habilitar notificaciones del sistema'),
('receipt_footer', 'Gracias por su compra. Garantía según tipo de producto.', 'string', 'Pie de página para tickets'),
('max_login_attempts', '5', 'number', 'Intentos máximos de login'),
('product_image_path', '/uploads/products/', 'string', 'Ruta para imágenes de productos'),
('enable_customer_accounts', 'false', 'boolean', 'Habilitar cuentas de clientes'),
('default_payment_method', 'efectivo', 'string', 'Método de pago por defecto');

-- ============================================
-- Movimientos de Inventario Iniciales
-- ============================================
INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, unit_cost, reference_type, notes, created_by) VALUES
-- Stock inicial para todos los productos
(1, 'initial', 8, 0, 8, 1200.00, 'initial', 'Stock inicial - Display LCD HP', 1),
(2, 'initial', 3, 0, 3, 2100.00, 'initial', 'Stock inicial - Display OLED Asus', 1),
(3, 'initial', 2, 0, 2, 1850.00, 'initial', 'Stock inicial - Display MacBook Air', 1),
(4, 'initial', 15, 0, 15, 420.00, 'initial', 'Stock inicial - Teclado ThinkPad', 1),
(5, 'initial', 12, 0, 12, 580.00, 'initial', 'Stock inicial - Teclado Gaming', 1),
(6, 'initial', 10, 0, 10, 280.00, 'initial', 'Stock inicial - Ventilador Dell', 1),
(7, 'initial', 6, 0, 6, 500.00, 'initial', 'Stock inicial - Ventilador MacBook', 1),
(8, 'initial', 7, 0, 7, 650.00, 'initial', 'Stock inicial - Batería HP', 1),
(9, 'initial', 4, 0, 4, 950.00, 'initial', 'Stock inicial - Batería Dell XPS', 1),
(10, 'initial', 20, 0, 20, 230.00, 'initial', 'Stock inicial - Cargador Universal', 1),
(11, 'initial', 5, 0, 5, 800.00, 'initial', 'Stock inicial - Cargador MacBook', 1),
(12, 'initial', 18, 0, 18, 820.00, 'initial', 'Stock inicial - RAM DDR4 8GB', 1),
(13, 'initial', 8, 0, 8, 1400.00, 'initial', 'Stock inicial - RAM DDR5 16GB', 1),
(14, 'initial', 12, 0, 12, 620.00, 'initial', 'Stock inicial - SSD M.2 250GB', 1),
(15, 'initial', 9, 0, 9, 890.00, 'initial', 'Stock inicial - SSD SATA 500GB', 1),
(16, 'initial', 6, 0, 6, 250.00, 'initial', 'Stock inicial - Touchpad Acer', 1),
(17, 'initial', 4, 0, 4, 190.00, 'initial', 'Stock inicial - Bisagras Samsung', 1);

-- ============================================
-- Actualizar contadores de secuencia
-- ============================================
-- Los AUTO_INCREMENT se ajustarán automáticamente con los próximos inserts

-- ============================================
-- Verificaciones de integridad
-- ============================================
-- Verificar que todos los productos tengan categoría válida
SELECT p.name, c.name as category 
FROM products p 
LEFT JOIN categories c ON p.category_id = c.id 
WHERE c.id IS NULL;

-- Verificar que todas las ventas tengan items
SELECT s.sale_number, COUNT(si.id) as items_count
FROM sales s 
LEFT JOIN sale_items si ON s.id = si.sale_id 
GROUP BY s.id;

-- Verificar stock vs movimientos
SELECT 
    p.name,
    p.stock as current_stock,
    COALESCE(SUM(CASE WHEN im.movement_type = 'in' THEN im.quantity ELSE -im.quantity END), 0) as calculated_stock
FROM products p
LEFT JOIN inventory_movements im ON p.id = im.product_id
GROUP BY p.id, p.name, p.stock;

-- ============================================
-- Estadísticas iniciales
-- ============================================
SELECT 
    'Productos totales' as metric,
    COUNT(*) as value 
FROM products
UNION ALL
SELECT 
    'Categorías activas' as metric,
    COUNT(*) as value 
FROM categories WHERE status = 'active'
UNION ALL
SELECT 
    'Clientes registrados' as metric,
    COUNT(*) as value 
FROM customers
UNION ALL
SELECT 
    'Ventas realizadas' as metric,
    COUNT(*) as value 
FROM sales
UNION ALL
SELECT 
    'Valor total inventario' as metric,
    ROUND(SUM(price * stock), 2) as value 
FROM products
UNION ALL
SELECT 
    'Ventas totales (MXN)' as metric,
    ROUND(SUM(total), 2) as value 
FROM sales;