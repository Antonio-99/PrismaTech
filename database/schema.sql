-- ============================================
-- PrismaTech Database Schema
-- Sistema de Inventario y Ventas
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS prismatech_db 
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
);

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
);

-- ============================================
-- Tabla de Productos
-- ============================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    brand VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT DEFAULT 3,
    max_stock INT DEFAULT 100,
    description TEXT,
    specifications JSON,
    compatibility JSON,
    icon VARCHAR(50) DEFAULT 'fas fa-cube',
    image_url VARCHAR(255),
    weight DECIMAL(8,2) DEFAULT 0.00,
    dimensions JSON,
    warranty_months INT DEFAULT 12,
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
    INDEX idx_status (status),
    INDEX idx_stock (stock),
    INDEX idx_featured (featured),
    
    FULLTEXT idx_search (name, description, brand)
);

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
);

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
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON SET NULL,
    FOREIGN KEY (sold_by) REFERENCES users(id),
    
    INDEX idx_sale_number (sale_number),
    INDEX idx_customer (customer_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_payment_status (payment_status),
    INDEX idx_sale_status (sale_status),
    INDEX idx_sale_date (sale_date),
    INDEX idx_sold_by (sold_by),
    
    FULLTEXT idx_search (customer_name, customer_phone, notes)
);

-- ============================================
-- Tabla de Items de Venta
-- ============================================
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(50),
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
    INDEX idx_product_sku (product_sku)
);

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
);

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
-- Vistas para Reportes
-- ============================================

-- Vista de productos con información de categoría
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
    END as stock_status
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
-- Triggers para Auditoría y Control
-- ============================================

-- Trigger para actualizar stock después de venta
DELIMITER $$
CREATE TRIGGER update_stock_after_sale
AFTER INSERT ON sale_items
FOR EACH ROW
BEGIN
    -- Actualizar stock del producto
    UPDATE products 
    SET stock = stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
    
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
        CONCAT('Venta #', (SELECT sale_number FROM sales WHERE id = NEW.sale_id)),
        (SELECT sold_by FROM sales WHERE id = NEW.sale_id)
    );
END$$

-- Trigger para actualizar totales del cliente
CREATE TRIGGER update_customer_totals
AFTER INSERT ON sales
FOR EACH ROW
BEGIN
    UPDATE customers 
    SET total_purchases = total_purchases + NEW.total,
        total_orders = total_orders + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.customer_id;
END$$

DELIMITER ;

-- ============================================
-- Índices adicionales para optimización
-- ============================================
CREATE INDEX idx_products_price_range ON products(price, status);
CREATE INDEX idx_sales_date_range ON sales(sale_date, sale_status);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at, product_id);

-- ============================================
-- Comentarios de documentación
-- ============================================
ALTER TABLE products ADD COMMENT 'Tabla principal de productos del inventario';
ALTER TABLE sales ADD COMMENT 'Tabla principal de ventas realizadas';
ALTER TABLE sale_items ADD COMMENT 'Detalles de productos vendidos en cada venta';
ALTER TABLE inventory_movements ADD COMMENT 'Registro de todos los movimientos de inventario';
ALTER TABLE customers ADD COMMENT 'Información de clientes del sistema';
ALTER TABLE categories ADD COMMENT 'Categorías de productos disponibles';
ALTER TABLE users ADD COMMENT 'Usuarios administrativos del sistema';