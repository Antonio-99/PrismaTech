-- ============================================
-- PrismaTech Database Schema - Versión Corregida
-- Correcciones y mejoras al schema original
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
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_role (role)
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
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_parent (parent_id),
    INDEX idx_sort (sort_order)
) COMMENT 'Categorías de productos (jerárquicas)';

-- ============================================
-- Tabla de Productos - CORREGIDA
-- ============================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    brand VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    part_number VARCHAR(100),
    manufacturer_part_number VARCHAR(100),
    barcode VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT DEFAULT 3,
    max_stock INT DEFAULT 100,
    reserved_stock INT DEFAULT 0, -- Stock reservado para ventas pendientes
    description TEXT,
    specifications JSON,
    compatibility JSON,
    compatible_models TEXT,
    icon VARCHAR(50) DEFAULT 'fas fa-cube',
    image_url VARCHAR(255),
    gallery JSON, -- URLs de múltiples imágenes
    weight DECIMAL(8,2) DEFAULT 0.00,
    dimensions JSON,
    warranty_months INT DEFAULT 12,
    condition_type ENUM('new', 'refurbished', 'used', 'open_box') DEFAULT 'new',
    original_equipment BOOLEAN DEFAULT FALSE,
    location VARCHAR(100), -- Ubicación física en almacén
    supplier_id INT,
    status ENUM('active', 'inactive', 'discontinued', 'pending') DEFAULT 'active',
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
    INDEX idx_part_number (part_number),
    INDEX idx_manufacturer_part_number (manufacturer_part_number),
    INDEX idx_barcode (barcode),
    INDEX idx_status (status),
    INDEX idx_stock (stock),
    INDEX idx_featured (featured),
    INDEX idx_condition (condition_type),
    INDEX idx_original_equipment (original_equipment),
    INDEX idx_price (price),
    INDEX idx_location (location),
    
    -- Índice compuesto para búsquedas comunes
    INDEX idx_status_stock (status, stock),
    INDEX idx_category_status (category_id, status),
    
    -- ÍNDICE FULLTEXT mejorado
    FULLTEXT idx_search_comprehensive (name, description, brand, part_number, manufacturer_part_number, compatible_models, sku)
) COMMENT 'Tabla principal de productos del inventario';

-- ============================================
-- Tabla de Proveedores - NUEVA
-- ============================================
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    tax_id VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'México',
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    website VARCHAR(255),
    notes TEXT,
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    
    FULLTEXT idx_search (name, company_name, contact_person)
) COMMENT 'Proveedores de productos';

-- Agregar FK después de crear suppliers
ALTER TABLE products 
ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- ============================================
-- Tabla de Clientes - MEJORADA
-- ============================================
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(20) UNIQUE,
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
    current_credit DECIMAL(10,2) DEFAULT 0.00,
    total_purchases DECIMAL(12,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    payment_terms VARCHAR(50) DEFAULT 'immediate',
    status ENUM('active', 'inactive', 'blocked', 'suspended') DEFAULT 'active',
    notes TEXT,
    birthday DATE NULL,
    registration_date DATE DEFAULT (CURRENT_DATE),
    last_purchase_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer_code (customer_code),
    INDEX idx_name (name),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_customer_type (customer_type),
    INDEX idx_status (status),
    INDEX idx_registration_date (registration_date),
    
    FULLTEXT idx_search (name, email, phone, customer_code)
) COMMENT 'Clientes del sistema';

-- ============================================
-- Tabla de Ventas - MEJORADA
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
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    shipping_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque', 'credito') NOT NULL,
    payment_status ENUM('pending', 'partial', 'paid', 'refunded', 'cancelled') DEFAULT 'paid',
    payment_reference VARCHAR(100),
    sale_status ENUM('draft', 'completed', 'cancelled', 'refunded', 'shipped', 'delivered') DEFAULT 'completed',
    sale_type ENUM('sale', 'quote', 'order') DEFAULT 'sale',
    delivery_method ENUM('pickup', 'shipping', 'digital') DEFAULT 'pickup',
    delivery_address TEXT,
    tracking_number VARCHAR(100),
    notes TEXT,
    internal_notes TEXT, -- Notas privadas para el equipo
    sold_by INT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (sold_by) REFERENCES users(id),
    
    INDEX idx_sale_number (sale_number),
    INDEX idx_customer (customer_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_payment_status (payment_status),
    INDEX idx_sale_status (sale_status),
    INDEX idx_sale_type (sale_type),
    INDEX idx_sale_date (sale_date),
    INDEX idx_sold_by (sold_by),
    INDEX idx_delivery_date (delivery_date),
    
    -- Índices compuestos para reportes
    INDEX idx_status_date (sale_status, sale_date),
    INDEX idx_payment_status_date (payment_status, sale_date),
    
    FULLTEXT idx_search (customer_name, customer_phone, notes, sale_number)
) COMMENT 'Ventas realizadas';

-- ============================================
-- Tabla de Items de Venta - MEJORADA
-- ============================================
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(50),
    product_part_number VARCHAR(100),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    line_discount_amount DECIMAL(10,2) DEFAULT 0.00, -- Descuento específico de línea
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    warranty_months INT DEFAULT 12,
    serial_numbers JSON, -- Para productos con números de serie
    returned_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    
    INDEX idx_sale (sale_id),
    INDEX idx_product (product_id),
    INDEX idx_product_sku (product_sku),
    INDEX idx_product_part_number (product_part_number),
    INDEX idx_quantity (quantity),
    INDEX idx_returned (returned_quantity)
) COMMENT 'Items vendidos en cada venta';

-- ============================================
-- Tabla de Movimientos de Inventario - MEJORADA
-- ============================================
CREATE TABLE inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment', 'initial', 'transfer', 'damaged', 'returned') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    reference_type ENUM('sale', 'purchase', 'adjustment', 'initial', 'return', 'transfer', 'damage', 'correction') NOT NULL,
    reference_id INT,
    reference_number VARCHAR(50), -- Número de documento relacionado
    location_from VARCHAR(100),
    location_to VARCHAR(100),
    notes TEXT,
    created_by INT,
    authorized_by INT, -- Usuario que autorizó el movimiento
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (authorized_by) REFERENCES users(id),
    
    INDEX idx_product (product_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created_at (created_at),
    INDEX idx_created_by (created_by),
    INDEX idx_reference_number (reference_number),
    
    -- Índices compuestos para reportes
    INDEX idx_product_date (product_id, created_at),
    INDEX idx_type_date (movement_type, created_at)
) COMMENT 'Historial de movimientos de inventario';

-- ============================================
-- Tabla de Sesiones de Usuario - MEJORADA
-- ============================================
CREATE TABLE user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_info JSON,
    location_info JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_activity (last_activity),
    INDEX idx_is_active (is_active)
) COMMENT 'Sesiones activas de usuarios';

-- ============================================
-- Tabla de Configuración del Sistema - MEJORADA
-- ============================================
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json', 'encrypted') DEFAULT 'string',
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Si es visible para APIs públicas
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    INDEX idx_setting_key (setting_key),
    INDEX idx_category (category),
    INDEX idx_is_public (is_public)
) COMMENT 'Configuración del sistema';

-- ============================================
-- Tabla de Números de Parte Alternativos - MEJORADA
-- ============================================
CREATE TABLE product_alternate_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    alternate_part_number VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100),
    part_type ENUM('oem', 'compatible', 'alternative', 'superseded', 'cross_reference') DEFAULT 'compatible',
    confidence_level ENUM('high', 'medium', 'low') DEFAULT 'medium',
    verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_by INT,
    verified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    
    UNIQUE KEY unique_product_part (product_id, alternate_part_number),
    INDEX idx_alternate_part (alternate_part_number),
    INDEX idx_manufacturer (manufacturer),
    INDEX idx_part_type (part_type),
    INDEX idx_verified (verified),
    
    FULLTEXT idx_search_alt_parts (alternate_part_number, manufacturer, notes)
) COMMENT 'Números de parte alternativos y compatibles';

-- ============================================
-- Tabla de Auditoría - NUEVA
-- ============================================
CREATE TABLE audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_fields JSON,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_action (action),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) COMMENT 'Log de auditoría para cambios importantes';

-- ============================================
-- VISTAS MEJORADAS
-- ============================================

-- Vista completa de productos con stock disponible
CREATE VIEW v_products_extended AS
SELECT 
    p.*,
    c.name as category_name,
    c.slug as category_slug,
    c.parent_id as category_parent_id,
    s.name as supplier_name,
    u.full_name as created_by_name,
    (p.price - p.cost_price) as profit_margin,
    CASE 
        WHEN p.cost_price > 0 THEN ((p.price - p.cost_price) / p.cost_price * 100)
        ELSE 0 
    END as profit_percentage,
    (p.stock - p.reserved_stock) as available_stock,
    CASE 
        WHEN (p.stock - p.reserved_stock) <= 0 THEN 'out_of_stock'
        WHEN (p.stock - p.reserved_stock) <= p.min_stock THEN 'low_stock'
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
LEFT JOIN suppliers s ON p.supplier_id = s.id
LEFT JOIN users u ON p.created_by = u.id;

-- Vista de ventas con resumen completo
CREATE VIEW v_sales_summary AS
SELECT 
    s.*,
    c.customer_type,
    c.city as customer_city,
    c.discount_percentage as customer_discount,
    u.full_name as seller_name,
    COUNT(si.id) as total_items,
    SUM(si.quantity) as total_quantity,
    SUM(si.returned_quantity) as total_returned
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN users u ON s.sold_by = u.id
LEFT JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.id;

-- Vista de stock crítico
CREATE VIEW v_critical_stock AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.part_number,
    p.stock,
    p.reserved_stock,
    (p.stock - p.reserved_stock) as available_stock,
    p.min_stock,
    c.name as category_name,
    s.name as supplier_name,
    CASE 
        WHEN (p.stock - p.reserved_stock) <= 0 THEN 'out_of_stock'
        WHEN (p.stock - p.reserved_stock) <= p.min_stock THEN 'low_stock'
        ELSE 'normal'
    END as status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.status = 'active' 
AND (p.stock - p.reserved_stock) <= p.min_stock
ORDER BY (p.stock - p.reserved_stock) ASC;

-- ============================================
-- TRIGGERS MEJORADOS
-- ============================================

DELIMITER $$

-- Trigger para generar código de cliente automático
CREATE TRIGGER generate_customer_code
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
    IF NEW.customer_code IS NULL THEN
        SET NEW.customer_code = CONCAT('CLI-', YEAR(NOW()), '-', LPAD((
            SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code, -6) AS UNSIGNED)), 0) + 1
            FROM customers 
            WHERE customer_code LIKE CONCAT('CLI-', YEAR(NOW()), '-%')
        ), 6, '0'));
    END IF;
END$$

-- Trigger mejorado para actualizar stock después de venta
CREATE TRIGGER update_stock_after_sale
AFTER INSERT ON sale_items
FOR EACH ROW
BEGIN
    DECLARE current_part_number VARCHAR(100);
    DECLARE sale_status VARCHAR(20);
    
    -- Obtener estado de la venta
    SELECT sale_status INTO sale_status 
    FROM sales WHERE id = NEW.sale_id;
    
    -- Solo actualizar stock si la venta está completada
    IF sale_status = 'completed' THEN
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
            total_cost,
            reference_type, 
            reference_id,
            reference_number,
            notes,
            created_by
        ) VALUES (
            NEW.product_id,
            'out',
            NEW.quantity,
            (SELECT stock + NEW.quantity FROM products WHERE id = NEW.product_id),
            (SELECT stock FROM products WHERE id = NEW.product_id),
            NEW.unit_cost,
            NEW.unit_cost * NEW.quantity,
            'sale',
            NEW.sale_id,
            (SELECT sale_number FROM sales WHERE id = NEW.sale_id),
            CONCAT('Venta #', (SELECT sale_number FROM sales WHERE id = NEW.sale_id), 
                   ' - Part: ', COALESCE(current_part_number, 'N/A')),
            (SELECT sold_by FROM sales WHERE id = NEW.sale_id)
        );
    END IF;
END$$

-- Trigger para actualizar totales del cliente
CREATE TRIGGER update_customer_totals
AFTER UPDATE ON sales
FOR EACH ROW
BEGIN
    IF NEW.customer_id IS NOT NULL AND NEW.sale_status = 'completed' AND OLD.sale_status != 'completed' THEN
        UPDATE customers 
        SET total_purchases = total_purchases + NEW.total,
            total_orders = total_orders + 1,
            last_purchase_date = NEW.sale_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.customer_id;
    END IF;
    
    -- Si se cancela una venta, restar del total
    IF NEW.customer_id IS NOT NULL AND NEW.sale_status IN ('cancelled', 'refunded') AND OLD.sale_status = 'completed' THEN
        UPDATE customers 
        SET total_purchases = total_purchases - NEW.total,
            total_orders = GREATEST(total_orders - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.customer_id;
    END IF;
END$$

-- Trigger para auditoría automática en productos
CREATE TRIGGER audit_products_changes
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (
        'products',
        NEW.id,
        'UPDATE',
        JSON_OBJECT(
            'name', OLD.name,
            'price', OLD.price,
            'stock', OLD.stock,
            'status', OLD.status
        ),
        JSON_OBJECT(
            'name', NEW.name,
            'price', NEW.price,
            'stock', NEW.stock,
            'status', NEW.status
        ),
        @current_user_id
    );
END$$

DELIMITER ;

-- ============================================
-- Índices adicionales para optimización
-- ============================================
CREATE INDEX idx_products_search_performance ON products(status, category_id, stock);
CREATE INDEX idx_sales_reporting ON sales(sale_date, sale_status, payment_status);
CREATE INDEX idx_inventory_analysis ON inventory_movements(created_at, product_id, movement_type);
CREATE INDEX idx_customers_activity ON customers(status, last_purchase_date);

-- ============================================
-- Configuración inicial del sistema
-- ============================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('system_name', 'PrismaTech', 'string', 'general', 'Nombre del sistema', true),
('company_name', 'PrismaTech', 'string', 'company', 'Nombre de la empresa', true),
('company_address', 'Teziutlán, Puebla, México', 'string', 'company', 'Dirección de la empresa', true),
('company_phone', '+52 (238) 123-4567', 'string', 'company', 'Teléfono principal', true),
('company_email', 'info@prismatech.mx', 'string', 'company', 'Email de contacto', true),
('tax_rate', '0.16', 'number', 'billing', 'Tasa de IVA por defecto', false),
('currency', 'MXN', 'string', 'billing', 'Moneda del sistema', true),
('currency_symbol', '$', 'string', 'billing', 'Símbolo de moneda', true),
('enable_part_number_search', 'true', 'boolean', 'search', 'Habilitar búsqueda por número de parte', false),
('search_include_alternates', 'true', 'boolean', 'search', 'Incluir números de parte alternativos en búsqueda', false),
('low_stock_threshold', '5', 'number', 'inventory', 'Umbral de stock bajo global', false),
('session_timeout', '28800', 'number', 'security', 'Timeout de sesión en segundos', false),
('max_login_attempts', '5', 'number', 'security', 'Intentos máximos de login', false),
('lockout_duration', '300', 'number', 'security', 'Duración de bloqueo en segundos', false),
('backup_frequency', 'daily', 'string', 'maintenance', 'Frecuencia de respaldos automáticos', false),
('enable_audit_log', 'true', 'boolean', 'security', 'Habilitar log de auditoría', false);

-- ============================================
-- Verificación de integridad
-- ============================================
SELECT 'Schema corregido y mejorado instalado exitosamente' as status;
SELECT 'Verificar configuración de indices y triggers' as next_step;