-- ============================================
-- PrismaTech Database Complete Setup
-- Sistema de Inventario y Ventas con Números de Parte
-- Versión: 2.0 - Updated with Part Number Search
-- ============================================

-- Eliminar base de datos si existe
DROP DATABASE IF EXISTS prismatech_db;

-- Crear base de datos
CREATE DATABASE prismatech_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE prismatech_db;

-- ============================================
-- Tabla de Usuarios Administrativos
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status)
) COMMENT 'Usuarios administrativos del sistema';

-- ============================================
-- Tabla de Categorías
-- ============================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'fas fa-tag',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_slug (slug),
    INDEX idx_status (status)
) COMMENT 'Categorías de productos disponibles';

-- ============================================
-- Tabla de Productos - ACTUALIZADA con Part Number
-- ============================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    brand VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    part_number VARCHAR(100), -- NUEVO CAMPO para número de parte
    manufacturer_part_number VARCHAR(100), -- NUEVO CAMPO para número de parte del fabricante
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT DEFAULT 3,
    max_stock INT DEFAULT 100,
    description TEXT,
    specifications JSON,
    compatibility JSON,
    compatible_models TEXT, -- NUEVO CAMPO para modelos compatibles en texto plano
    icon VARCHAR(50) DEFAULT 'fas fa-cube',
    image_url VARCHAR(255),
    weight DECIMAL(8,2) DEFAULT 0.00,
    dimensions JSON,
    warranty_months INT DEFAULT 12,
    condition_type ENUM('new', 'refurbished', 'used') DEFAULT 'new', -- NUEVO CAMPO
    original_equipment BOOLEAN DEFAULT FALSE, -- NUEVO CAMPO para OEM
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
    featured BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_name (name),
    INDEX idx_slug (slug),
    INDEX idx_category (category_id),
    INDEX idx_brand (brand),
    INDEX idx_sku (sku),
    INDEX idx_part_number (part_number), -- NUEVO ÍNDICE
    INDEX idx_manufacturer_part_number (manufacturer_part_number), -- NUEVO ÍNDICE
    INDEX idx_status (status),
    INDEX idx_stock (stock),
    INDEX idx_featured (featured),
    INDEX idx_condition (condition_type),
    INDEX idx_original_equipment (original_equipment),
    
    -- ÍNDICE FULLTEXT ACTUALIZADO para incluir números de parte
    FULLTEXT idx_search_extended (name, description, brand, part_number, manufacturer_part_number, compatible_models)
) COMMENT 'Tabla principal de productos del inventario con números de parte';

-- ============================================
-- Tabla de Clientes
-- ============================================
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(10),
    tax_id VARCHAR(50),
    customer_type ENUM('individual', 'business') DEFAULT 'individual',
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    total_purchases DECIMAL(12,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_customer_type (customer_type),
    INDEX idx_status (status),
    
    FULLTEXT idx_search (name, email, phone)
) COMMENT 'Información de clientes del sistema';

-- ============================================
-- Tabla de Ventas
-- ============================================
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(100),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.1600,
    tax_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque') NOT NULL,
    payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'paid',
    sale_status ENUM('draft', 'completed', 'cancelled', 'refunded') DEFAULT 'completed',
    notes TEXT,
    sold_by INT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (sold_by) REFERENCES users(id),
    
    INDEX idx_sale_number (sale_number),
    INDEX idx_customer (customer_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_payment_status (payment_status),
    INDEX idx_sale_status (sale_status),
    INDEX idx_sale_date (sale_date),
    INDEX idx_sold_by (sold_by),
    
    FULLTEXT idx_search (customer_name, customer_phone, notes)
) COMMENT 'Tabla principal de ventas realizadas';

-- ============================================
-- Tabla de Items de Venta
-- ============================================
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(50),
    product_part_number VARCHAR(100), -- NUEVO CAMPO
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    
    INDEX idx_sale (sale_id),
    INDEX idx_product (product_id),
    INDEX idx_product_sku (product_sku),
    INDEX idx_product_part_number (product_part_number) -- NUEVO ÍNDICE
) COMMENT 'Detalles de productos vendidos en cada venta';

-- ============================================
-- Tabla de Movimientos de Inventario
-- ============================================
CREATE TABLE inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment', 'initial') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    reference_type ENUM('sale', 'purchase', 'adjustment', 'initial', 'return') NOT NULL,
    reference_id INT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_product (product_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created_at (created_at),
    INDEX idx_created_by (created_by)
) COMMENT 'Registro de todos los movimientos de inventario';

-- ============================================
-- Tabla de Proveedores
-- ============================================
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(10),
    tax_id VARCHAR(50),
    contact_person VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'inactive') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    
    FULLTEXT idx_search (name, company_name, contact_person)
);

-- ============================================
-- Tabla de Sesiones de Usuario
-- ============================================
CREATE TABLE user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_activity (last_activity)
);

-- ============================================
-- Tabla de Configuración del Sistema
-- ============================================
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    INDEX idx_setting_key (setting_key)
);

-- ============================================
-- NUEVA TABLA: Números de Parte Alternativos
-- ============================================
CREATE TABLE product_alternate_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    alternate_part_number VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100),
    part_type ENUM('oem', 'compatible', 'alternative') DEFAULT 'compatible',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_product_part (product_id, alternate_part_number),
    INDEX idx_alternate_part (alternate_part_number),
    INDEX idx_manufacturer (manufacturer),
    INDEX idx_part_type (part_type),
    
    FULLTEXT idx_search_alt_parts (alternate_part_number, manufacturer, notes)
) COMMENT 'Números de parte alternativos y compatibles';

-- ============================================
-- Vistas para Reportes - ACTUALIZADAS
-- ============================================

-- Vista de productos extendida con números de parte
CREATE VIEW v_products_extended AS
SELECT 
    p.*,
    c.name as category_name,
    c.slug as category_slug,
    u.full_name as created_by_name,
    (p.price - p.cost_price) as profit_margin,
    CASE 
        WHEN p.stock = 0 THEN 'out_of_stock'
        WHEN p.stock <= p.min_stock THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status,
    -- Concatenar todos los números de parte para búsqueda
    CONCAT_WS(' | ', 
        p.part_number, 
        p.manufacturer_part_number,
        (SELECT GROUP_CONCAT(alternate_part_number SEPARATOR ' | ') 
         FROM product_alternate_parts 
         WHERE product_id = p.id)
    ) as all_part_numbers
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN users u ON p.created_by = u.id;

-- Vista de ventas con detalles
CREATE VIEW v_sales_summary AS
SELECT 
    s.*,
    c.customer_type,
    c.city as customer_city,
    u.full_name as seller_name,
    COUNT(si.id) as total_items,
    SUM(si.quantity) as total_quantity
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN users u ON s.sold_by = u.id
LEFT JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.id;

-- ============================================
-- Triggers Actualizados
-- ============================================

DELIMITER $$

-- Trigger para actualizar stock después de venta - ACTUALIZADO
CREATE TRIGGER update_stock_after_sale
AFTER INSERT ON sale_items
FOR EACH ROW
BEGIN
    DECLARE current_part_number VARCHAR(100);
    
    -- Obtener el part_number del producto
    SELECT part_number INTO current_part_number 
    FROM products WHERE id = NEW.product_id;
    
    -- Actualizar stock del producto
    UPDATE products 
    SET stock = stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
    
    -- Actualizar el part_number en sale_items si no existe
    IF NEW.product_part_number IS NULL OR NEW.product_part_number = '' THEN
        UPDATE sale_items 
        SET product_part_number = current_part_number
        WHERE id = NEW.id;
    END IF;
    
    -- Registrar movimiento de inventario
    INSERT INTO inventory_movements (
        product_id, 
        movement_type, 
        quantity, 
        previous_stock, 
        new_stock, 
        unit_cost, 
        reference_type, 
        reference_id,
        notes,
        created_by
    ) VALUES (
        NEW.product_id,
        'out',
        NEW.quantity,
        (SELECT stock + NEW.quantity FROM products WHERE id = NEW.product_id),
        (SELECT stock FROM products WHERE id = NEW.product_id),
        NEW.unit_cost,
        'sale',
        NEW.sale_id,
        CONCAT('Venta #', (SELECT sale_number FROM sales WHERE id = NEW.sale_id), 
               ' - Part: ', COALESCE(current_part_number, 'N/A')),
        (SELECT sold_by FROM sales WHERE id = NEW.sale_id)
    );
END$$

-- Trigger para actualizar totales del cliente
CREATE TRIGGER update_customer_totals
AFTER INSERT ON sales
FOR EACH ROW
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers 
        SET total_purchases = total_purchases + NEW.total,
            total_orders = total_orders + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.customer_id;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- Índices adicionales para optimización
-- ============================================
CREATE INDEX idx_products_price_range ON products(price, status);
CREATE INDEX idx_sales_date_range ON sales(sale_date, sale_status);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at, product_id);
CREATE INDEX idx_products_search_combo ON products(name, part_number, manufacturer_part_number);

-- ============================================
-- Datos de Ejemplo (Seeds) con Números de Parte
-- ============================================

-- Limpiar datos existentes
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE product_alternate_parts;
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

-- Usuarios Administrativos
INSERT INTO users (username, password_hash, full_name, email, role, status) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador Principal', 'admin@prismatech.mx', 'admin', 'active'),
('manager', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Gerente de Ventas', 'gerente@prismatech.mx', 'manager', 'active'),
('vendedor1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos Mendoza', 'carlos@prismatech.mx', 'employee', 'active'),
('vendedor2', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana García', 'ana@prismatech.mx', 'employee', 'active');

-- Categorías de Productos
INSERT INTO categories (name, slug, description, icon) VALUES
('Pantallas y Displays', 'pantallas', 'Pantallas LCD, LED, OLED para laptops y monitores', 'fas fa-tv'),
('Teclados', 'teclados', 'Teclados de reemplazo y externos', 'fas fa-keyboard'),
('Ventiladores y Cooling', 'ventiladores', 'Sistemas de enfriamiento y ventiladores', 'fas fa-fan'),
('Baterías', 'baterias', 'Baterías de repuesto para laptops', 'fas fa-battery-three-quarters'),
('Cargadores y Adaptadores', 'cargadores', 'Cargadores y adaptadores de corriente', 'fas fa-plug'),
('Memorias RAM', 'memorias', 'Módulos de memoria RAM', 'fas fa-memory'),
('Almacenamiento', 'almacenamiento', 'Discos duros y SSD', 'fas fa-hdd'),
('Componentes Varios', 'componentes', 'Touchpads, bisagras y otros componentes', 'fas fa-microchip');

-- Proveedores
INSERT INTO suppliers (name, company_name, email, phone, contact_person, payment_terms, status) VALUES
('TechSupply México', 'TechSupply S.A. de C.V.', 'ventas@techsupply.mx', '55-1234-5678', 'Roberto Sánchez', '30 días', 'active'),
('Distribuidora HP', 'HP Distribución México', 'pedidos@hp-dist.mx', '55-9876-5432', 'María López', '15 días', 'active'),
('Parts International', 'Parts International LLC', 'mexico@partsinternational.com', '55-5555-0000', 'John Smith', '45 días', 'active');

-- Productos con Números de Parte
INSERT INTO products (name, slug, category_id, brand, sku, part_number, manufacturer_part_number, price, cost_price, stock, min_stock, description, compatible_models, condition_type, original_equipment, icon, created_by) VALUES

-- Pantallas
('Display LCD 15.6" HD Compatible HP Pavilion', 'display-lcd-156-hp-pavilion', 1, 'HP Compatible', 'LCD-HP-156-001', 'PT-LCD-001', '15.6HD-40PIN-LVDS', 1890.00, 1200.00, 8, 3, 'Pantalla LCD 15.6" HD 1366x768 para HP Pavilion, conector LVDS 40 pines', 'HP Pavilion 15-n, 15-p, 15-r, 15-e, 15-d', 'new', FALSE, 'fas fa-tv', 1),

('Display OLED 14" FHD Asus ZenBook', 'display-oled-14-asus-zenbook', 1, 'Asus', 'OLED-ASUS-14-001', 'PT-OLED-002', 'UX425-OLED-FHD', 3200.00, 2100.00, 3, 2, 'Pantalla OLED 14" Full HD para Asus ZenBook UX425', 'Asus ZenBook UX425EA, UX425JA, UX425IA', 'new', TRUE, 'fas fa-desktop', 1),

('Display IPS 13.3" MacBook Air Retina', 'display-ips-133-macbook-air', 1, 'Apple Compatible', 'IPS-MBA-133-001', 'PT-MBA-003', 'A1932-LCD-RETINA', 2800.00, 1850.00, 2, 1, 'Pantalla IPS Retina 13.3" 2560x1600 para MacBook Air', 'MacBook Air A1932, A2179, A2337', 'refurbished', FALSE, 'fas fa-laptop', 1),

-- Teclados
('Teclado Lenovo ThinkPad T440 Español', 'teclado-lenovo-thinkpad-t440-es', 2, 'Lenovo', 'KBD-LEN-T440-ES', 'PT-KBD-004', '04Y0824-ES', 650.00, 420.00, 15, 5, 'Teclado español retroiluminado para ThinkPad T440/T450', 'ThinkPad T440, T450, L440, T440s, T440p', 'new', TRUE, 'fas fa-keyboard', 1),

('Teclado Gaming Mecánico RGB Redragon', 'teclado-gaming-redragon-k552', 2, 'Redragon', 'KBD-RED-K552-RGB', 'PT-GAM-005', 'K552-KUMARA-RGB', 890.00, 580.00, 12, 4, 'Teclado mecánico gaming RGB switches azules', 'Universal PC compatible', 'new', TRUE, 'fas fa-keyboard', 1),

-- Ventiladores
('Ventilador Dell Inspiron 15-3000 CPU', 'ventilador-dell-inspiron-15-3000', 3, 'Dell', 'FAN-DELL-I15-3000', 'PT-FAN-006', '023.1006K.0011', 420.00, 280.00, 10, 3, 'Ventilador CPU con disipador para Dell Inspiron 15-3000', 'Inspiron 15-3541, 15-3542, 15-3543, 15-3551, 15-3552', 'new', FALSE, 'fas fa-fan', 1),

('Ventilador MacBook Pro 13" 2017-2020', 'ventilador-macbook-pro-13-a1989', 3, 'Apple Compatible', 'FAN-MBP-13-A1989', 'PT-MBP-007', 'A1989-FAN-LEFT', 750.00, 500.00, 6, 2, 'Ventilador izquierdo para MacBook Pro 13" con sensor', 'MacBook Pro A1989, A2159, A2251, A2289', 'new', FALSE, 'fas fa-fan', 1),

-- Baterías
('Batería HP Pavilion dv6 4400mAh Original', 'bateria-hp-pavilion-dv6-4400mah', 4, 'HP', 'BAT-HP-DV6-4400', 'PT-BAT-008', 'HSTNN-LB72', 980.00, 650.00, 7, 3, 'Batería Li-Ion 4400mAh 10.8V para HP Pavilion dv6', 'HP Pavilion dv6-1000, dv6-2000, dv6-3000 series', 'new', TRUE, 'fas fa-battery-three-quarters', 1),

('Batería Dell XPS 15 9560/9570 6000mAh', 'bateria-dell-xps-15-6000mah', 4, 'Dell Compatible', 'BAT-DELL-XPS15-6000', 'PT-XPS-009', '1P6KD-97WH', 1450.00, 950.00, 4, 2, 'Batería Li-Polymer 6000mAh 11.4V para Dell XPS 15', 'Dell XPS 15 9560, 9570, Precision 5520', 'new', FALSE, 'fas fa-battery-full', 1),

-- Cargadores
('Cargador Universal 65W Multi-Conector', 'cargador-universal-65w-multi', 5, 'Universal', 'CHG-UNIV-65W-MULTI', 'PT-CHG-010', 'UC65W-8TIPS', 350.00, 230.00, 20, 8, 'Cargador universal 65W con 8 conectores diferentes', 'HP, Dell, Lenovo, Acer, Asus, Toshiba compatible', 'new', FALSE, 'fas fa-plug', 1),

('Cargador MacBook USB-C 61W Original', 'cargador-macbook-usb-c-61w', 5, 'Apple', 'CHG-APPLE-61W-USBC', 'PT-MBC-011', 'A1718-61W-USBC', 1200.00, 800.00, 5, 2, 'Cargador original Apple USB-C 61W', 'MacBook Pro 13", MacBook Air M1/M2', 'new', TRUE, 'fas fa-plug', 1),

-- Memorias RAM
('Memoria DDR4 8GB 2400MHz Kingston SODIMM', 'memoria-ddr4-8gb-kingston-sodimm', 6, 'Kingston', 'RAM-KING-8GB-DDR4', 'PT-RAM-012', 'KVR24S17S8/8', 1250.00, 820.00, 18, 6, 'Módulo DDR4 8GB 2400MHz SO-DIMM', 'Laptops DDR4 compatible, PC260-19200', 'new', TRUE, 'fas fa-memory', 1),

('Memoria DDR5 16GB 4800MHz Corsair', 'memoria-ddr5-16gb-corsair', 6, 'Corsair', 'RAM-CORS-16GB-DDR5', 'PT-DDR5-013', 'CMSX16GX5M1A4800C40', 2100.00, 1400.00, 8, 3, 'Módulo DDR5 16GB 4800MHz nueva generación', 'Laptops DDR5 compatible, Gaming laptops', 'new', TRUE, 'fas fa-memory', 1),

-- Almacenamiento
('SSD M.2 NVMe 250GB WD Blue SN570', 'ssd-m2-250gb-wd-blue-sn570', 7, 'Western Digital', 'SSD-WD-250GB-M2', 'PT-SSD-014', 'WDS250G3B0C', 950.00, 620.00, 12, 4, 'SSD M.2 2280 NVMe PCIe 3.0 250GB', 'M.2 2280 slot, PCIe 3.0 x4', 'new', TRUE, 'fas fa-hdd', 1),

('SSD SATA 500GB Samsung 870 EVO', 'ssd-sata-500gb-samsung-870evo', 7, 'Samsung', 'SSD-SAM-500GB-SATA', 'PT-870-015', 'MZ-77E500B/AM', 1350.00, 890.00, 9, 3, 'SSD SATA III 500GB Samsung 870 EVO', 'SATA III 6Gb/s compatible devices', 'new', TRUE, 'fas fa-hdd', 1),

-- Componentes
('Touchpad Acer Aspire 5 A515 Series', 'touchpad-acer-aspire-5-a515', 8, 'Acer', 'TP-ACER-A5-A515', 'PT-TP-016', 'A515-TOUCHPAD-01', 380.00, 250.00, 6, 2, 'Touchpad con botones integrados para Acer Aspire 5', 'Acer Aspire 5 A515-51, A515-52, A515-54', 'new', FALSE, 'fas fa-mouse', 1),

('Bisagras Samsung Galaxy Book Pro 15"', 'bisagras-samsung-galaxy-book-pro-15', 8, 'Samsung', 'HINGE-SAM-GBP15', 'PT-HINGE-017', 'GBP15-HINGE-SET', 290.00, 190.00, 4, 1, 'Par de bisagras reforzadas para Galaxy Book Pro 15"', 'Samsung Galaxy Book Pro 15"', 'new', FALSE, 'fas fa-cogs', 1);

-- Números de Parte Alternativos
INSERT INTO product_alternate_parts (product_id, alternate_part_number, manufacturer, part_type, notes) VALUES
-- Para Display HP
(1, 'B156XW02-V.6', 'AUO', 'compatible', 'Panel AUO compatible'),
(1, 'LP156WH3-TLS1', 'LG', 'compatible', 'Panel LG compatible'),
(1, 'N156BGE-L31', 'CMO', 'alternative', 'Panel CMO alternativo'),

-- Para Teclado ThinkPad
(4, '04Y0824', 'Lenovo', 'oem', 'Número OEM sin sufijo de idioma'),
(4, '04Y0854', 'Lenovo', 'compatible', 'Versión sin retroiluminación'),
(4, 'SN20E66101', 'Lenovo', 'oem', 'FRU alternativo'),

-- Para Batería HP
(8, 'HSTNN-LB73', 'HP', 'oem', 'Número OEM alternativo'),
(8, 'HSTNN-CB72', 'HP', 'oem', 'Código de servicio HP'),
(8, '484170-001', 'HP', 'oem', 'Spare Part Number'),

-- Para RAM Kingston
(12, 'KVR24S17D8/8', 'Kingston', 'compatible', 'Versión dual rank'),
(12, 'HX424S14IB2/8', 'Kingston', 'compatible', 'Serie HyperX Impact'),

-- Para SSD WD
(14, 'WDS250G2B0C', 'Western Digital', 'compatible', 'Generación anterior SN550'),
(14, 'WDS250G1B0C', 'Western Digital', 'compatible', 'Serie SN500');

-- Clientes de Ejemplo
INSERT INTO customers (name, email, phone, address, city, state, customer_type, status) VALUES
('Juan Pérez Martínez', 'juan.perez@email.com', '238-123-4567', 'Av. Reforma 123, Col. Centro', 'Teziutlán', 'Puebla', 'individual', 'active'),
('María González López', 'maria.gonzalez@gmail.com', '238-234-5678', 'Calle Hidalgo 456', 'Teziutlán', 'Puebla', 'individual', 'active'),
('TechServicios S.A. de C.V.', 'compras@techservicios.com', '238-345-6789', 'Blvd. Universidad 789', 'Teziutlán', 'Puebla', 'business', 'active'),
('Computadoras del Norte', 'ventas@computadorasdelnorte.mx', '238-567-8901', 'Av. 20 de Noviembre 654', 'Teziutlán', 'Puebla', 'business', 'active');

-- Ventas de Ejemplo
INSERT INTO sales (sale_number, customer_id, customer_name, customer_phone, customer_email, subtotal, tax_amount, total, payment_method, sold_by, sale_date) VALUES
('V-2025-0001', 1, 'Juan Pérez Martínez', '238-123-4567', 'juan.perez@email.com', 1890.00, 302.40, 2192.40, 'efectivo', 3, '2025-01-15 10:30:00'),
('V-2025-0002', 2, 'María González López', '238-234-5678', 'maria.gonzalez@gmail.com', 650.00, 104.00, 754.00, 'tarjeta_debito', 3, '2025-01-15 14:15:00'),
('V-2025-0003', 3, 'TechServicios S.A. de C.V.', '238-345-6789', 'compras@techservicios.com', 2850.00, 456.00, 3306.00, 'transferencia', 4, '2025-01-16 09:45:00');

-- Items de Ventas con Part Numbers
INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, product_part_number, quantity, unit_price, unit_cost, subtotal) VALUES
(1, 1, 'Display LCD 15.6" HD Compatible HP Pavilion', 'LCD-HP-156-001', 'PT-LCD-001', 1, 1890.00, 1200.00, 1890.00),
(2, 4, 'Teclado Lenovo ThinkPad T440 Español', 'KBD-LEN-T440-ES', 'PT-KBD-004', 1, 650.00, 420.00, 650.00),
(3, 12, 'Memoria DDR4 8GB 2400MHz Kingston SODIMM', 'RAM-KING-8GB-DDR4', 'PT-RAM-012', 2, 1250.00, 820.00, 2500.00),
(3, 10, 'Cargador Universal 65W Multi-Conector', 'CHG-UNIV-65W-MULTI', 'PT-CHG-010', 1, 350.00, 230.00, 350.00);

-- Configuración del Sistema
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'PrismaTech', 'string', 'Nombre de la empresa'),
('company_address', 'Teziutlán, Puebla, México', 'string', 'Dirección de la empresa'),
('company_phone', '+52 (238) 123-4567', 'string', 'Teléfono principal'),
('company_email', 'info@prismatech.mx', 'string', 'Email de contacto'),
('tax_rate', '0.16', 'number', 'Tasa de IVA por defecto'),
('currency', 'MXN', 'string', 'Moneda del sistema'),
('enable_part_number_search', 'true', 'boolean', 'Habilitar búsqueda por número de parte'),
('search_include_alternates', 'true', 'boolean', 'Incluir números de parte alternativos en búsqueda'),
('low_stock_threshold', '5', 'number', 'Umbral de stock bajo'),
('session_timeout', '28800', 'number', 'Timeout de sesión en segundos');

-- Movimientos de Inventario Iniciales
INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, unit_cost, reference_type, notes, created_by) VALUES
(1, 'initial', 8, 0, 8, 1200.00, 'initial', 'Stock inicial - PT-LCD-001', 1),
(2, 'initial', 3, 0, 3, 2100.00, 'initial', 'Stock inicial - PT-OLED-002', 1),
(3, 'initial', 2, 0, 2, 1850.00, 'initial', 'Stock inicial - PT-MBA-003', 1),
(4, 'initial', 15, 0, 15, 420.00, 'initial', 'Stock inicial - PT-KBD-004', 1),
(5, 'initial', 12, 0, 12, 580.00, 'initial', 'Stock inicial - PT-GAM-005', 1),
(6, 'initial', 10, 0, 10, 280.00, 'initial', 'Stock inicial - PT-FAN-006', 1),
(7, 'initial', 6, 0, 6, 500.00, 'initial', 'Stock inicial - PT-MBP-007', 1),
(8, 'initial', 7, 0, 7, 650.00, 'initial', 'Stock inicial - PT-BAT-008', 1),
(9, 'initial', 4, 0, 4, 950.00, 'initial', 'Stock inicial - PT-XPS-009', 1),
(10, 'initial', 20, 0, 20, 230.00, 'initial', 'Stock inicial - PT-CHG-010', 1),
(11, 'initial', 5, 0, 5, 800.00, 'initial', 'Stock inicial - PT-MBC-011', 1),
(12, 'initial', 18, 0, 18, 820.00, 'initial', 'Stock inicial - PT-RAM-012', 1),
(13, 'initial', 8, 0, 8, 1400.00, 'initial', 'Stock inicial - PT-DDR5-013', 1),
(14, 'initial', 12, 0, 12, 620.00, 'initial', 'Stock inicial - PT-SSD-014', 1),
(15, 'initial', 9, 0, 9, 890.00, 'initial', 'Stock inicial - PT-870-015', 1),
(16, 'initial', 6, 0, 6, 250.00, 'initial', 'Stock inicial - PT-TP-016', 1),
(17, 'initial', 4, 0, 4, 190.00, 'initial', 'Stock inicial - PT-HINGE-017', 1);

-- ============================================
-- Funciones Almacenadas para Búsqueda Avanzada
-- ============================================

DELIMITER $$

-- Función para búsqueda por número de parte
CREATE FUNCTION search_by_part_number(search_term VARCHAR(255))
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result_text TEXT DEFAULT '';
    
    SELECT GROUP_CONCAT(
        CONCAT(
            'ID:', p.id, 
            ' | Name:', p.name,
            ' | Part:', COALESCE(p.part_number, 'N/A'),
            ' | MPN:', COALESCE(p.manufacturer_part_number, 'N/A')
        ) SEPARATOR '\n'
    ) INTO result_text
    FROM products p
    WHERE 
        p.part_number LIKE CONCAT('%', search_term, '%') OR
        p.manufacturer_part_number LIKE CONCAT('%', search_term, '%') OR
        p.id IN (
            SELECT product_id 
            FROM product_alternate_parts 
            WHERE alternate_part_number LIKE CONCAT('%', search_term, '%')
        )
    AND p.status = 'active';
    
    RETURN COALESCE(result_text, 'No se encontraron productos');
END$$

-- Procedimiento para búsqueda completa de productos
CREATE PROCEDURE search_products_comprehensive(
    IN search_term VARCHAR(255),
    IN category_filter INT,
    IN brand_filter VARCHAR(100),
    IN limit_records INT
)
BEGIN
    DECLARE sql_query TEXT;
    
    SET sql_query = '
        SELECT DISTINCT
            p.id,
            p.name,
            p.sku,
            p.part_number,
            p.manufacturer_part_number,
            p.brand,
            p.price,
            p.stock,
            p.status,
            c.name as category_name,
            GROUP_CONCAT(DISTINCT ap.alternate_part_number SEPARATOR " | ") as alternate_parts
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_alternate_parts ap ON p.id = ap.product_id
        WHERE p.status = "active"
    ';
    
    -- Agregar filtro de búsqueda si se proporciona
    IF search_term IS NOT NULL AND search_term != '' THEN
        SET sql_query = CONCAT(sql_query, '
            AND (
                MATCH(p.name, p.description, p.brand, p.part_number, p.manufacturer_part_number, p.compatible_models) 
                AGAINST("', search_term, '" IN NATURAL LANGUAGE MODE)
                OR p.sku LIKE "%', search_term, '%"
                OR p.part_number LIKE "%', search_term, '%"
                OR p.manufacturer_part_number LIKE "%', search_term, '%"
                OR EXISTS (
                    SELECT 1 FROM product_alternate_parts ap2 
                    WHERE ap2.product_id = p.id 
                    AND ap2.alternate_part_number LIKE "%', search_term, '%"
                )
            )
        ');
    END IF;
    
    -- Agregar filtro de categoría
    IF category_filter IS NOT NULL AND category_filter > 0 THEN
        SET sql_query = CONCAT(sql_query, ' AND p.category_id = ', category_filter);
    END IF;
    
    -- Agregar filtro de marca
    IF brand_filter IS NOT NULL AND brand_filter != '' THEN
        SET sql_query = CONCAT(sql_query, ' AND p.brand = "', brand_filter, '"');
    END IF;
    
    -- Agrupar y ordenar
    SET sql_query = CONCAT(sql_query, '
        GROUP BY p.id
        ORDER BY 
            CASE 
                WHEN p.part_number LIKE "%', COALESCE(search_term, ''), '%" THEN 1
                WHEN p.manufacturer_part_number LIKE "%', COALESCE(search_term, ''), '%" THEN 2
                WHEN p.name LIKE "%', COALESCE(search_term, ''), '%" THEN 3
                ELSE 4
            END,
            p.featured DESC,
            p.stock DESC,
            p.name ASC
    ');
    
    -- Agregar límite
    IF limit_records IS NOT NULL AND limit_records > 0 THEN
        SET sql_query = CONCAT(sql_query, ' LIMIT ', limit_records);
    END IF;
    
    SET @sql = sql_query;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

-- ============================================
-- Verificaciones y Estadísticas Finales
-- ============================================

-- Verificar integridad de datos
SELECT 'VERIFICACIÓN DE INTEGRIDAD DE DATOS' as info;

-- Productos sin categoría
SELECT 'Productos sin categoría válida:' as check_type, COUNT(*) as count
FROM products p 
LEFT JOIN categories c ON p.category_id = c.id 
WHERE c.id IS NULL;

-- Productos sin números de parte
SELECT 'Productos sin número de parte:' as check_type, COUNT(*) as count
FROM products 
WHERE part_number IS NULL OR part_number = '';

-- Ventas sin items
SELECT 'Ventas sin items:' as check_type, COUNT(*) as count
FROM sales s 
LEFT JOIN sale_items si ON s.id = si.sale_id 
WHERE si.id IS NULL;

-- Estadísticas del sistema
SELECT 'ESTADÍSTICAS DEL SISTEMA' as info;

SELECT 
    'Productos totales' as metric,
    COUNT(*) as value,
    'Incluye todos los estados' as note
FROM products
UNION ALL
SELECT 
    'Productos activos' as metric,
    COUNT(*) as value,
    'Solo productos disponibles' as note
FROM products WHERE status = 'active'
UNION ALL
SELECT 
    'Productos con part number' as metric,
    COUNT(*) as value,
    'Productos con número de parte asignado' as note
FROM products WHERE part_number IS NOT NULL AND part_number != ''
UNION ALL
SELECT 
    'Números de parte alternativos' as metric,
    COUNT(*) as value,
    'Total de números alternativos registrados' as note
FROM product_alternate_parts
UNION ALL
SELECT 
    'Categorías activas' as metric,
    COUNT(*) as value,
    'Categorías disponibles' as note
FROM categories WHERE status = 'active'
UNION ALL
SELECT 
    'Clientes registrados' as metric,
    COUNT(*) as value,
    'Total de clientes en sistema' as note
FROM customers
UNION ALL
SELECT 
    'Ventas realizadas' as metric,
    COUNT(*) as value,
    'Transacciones completadas' as note
FROM sales WHERE sale_status = 'completed'
UNION ALL
SELECT 
    'Valor total inventario' as metric,
    CONCAT('$', FORMAT(SUM(price * stock), 2)) as value,
    'Valor total del inventario' as note
FROM products WHERE status = 'active';

-- Ejemplo de búsqueda por número de parte
SELECT 'EJEMPLO DE BÚSQUEDA POR NÚMERO DE PARTE' as info;

SELECT 
    p.name,
    p.part_number,
    p.manufacturer_part_number,
    p.brand,
    p.price,
    p.stock,
    GROUP_CONCAT(ap.alternate_part_number SEPARATOR ' | ') as alternate_parts
FROM products p
LEFT JOIN product_alternate_parts ap ON p.id = ap.product_id
WHERE 
    p.part_number LIKE '%LCD%' OR
    p.manufacturer_part_number LIKE '%LCD%' OR
    ap.alternate_part_number LIKE '%LCD%'
GROUP BY p.id
LIMIT 5;

-- Test de función de búsqueda
SELECT 'TEST DE FUNCIÓN DE BÚSQUEDA' as info;
SELECT search_by_part_number('04Y0824') as search_result;

SELECT 'BASE DE DATOS PRISMATECH CONFIGURADA EXITOSAMENTE' as status;
SELECT 'Versión: 2.0 con soporte completo para números de parte' as version;
SELECT NOW() as timestamp;