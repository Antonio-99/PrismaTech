<?php
/**
 * ============================================
 * PrismaTech API - Create Sales
 * Endpoint para crear ventas
 * POST /api/sales/post.php
 * ============================================
 */

require_once __DIR__ . '/../config/api_base.php';

class SalesCreateAPI extends ApiBase {
    
    private array $user;
    private float $defaultTaxRate = 0.16; // 16% IVA México
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    /**
     * Manejar request según método HTTP
     */
    private function handleRequest(): void {
        switch ($this->method) {
            case 'POST':
                $this->createSale();
                break;
                
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    /**
     * Crear nueva venta
     */
    private function createSale(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager', 'employee']);
            
            // Rate limiting para creación de ventas
            $this->checkRateLimit('sale_create:' . $this->user['id'], 50, 3600);
            
            // Validar campos requeridos
            $this->validateRequiredFields([
                'customer_name', 'items', 'payment_method'
            ]);
            
            // Sanitizar input
            $input = $this->sanitizeInput($this->input);
            
            // Validar estructura de la venta
            $this->validateSaleStructure($input);
            
            // Validar y procesar items
            $processed_items = $this->processAndValidateItems($input['items']);
            
            // Calcular totales
            $totals = $this->calculateTotals($processed_items, $input);
            
            // Preparar datos de la venta
            $sale_data = $this->prepareSaleData($input, $totals);
            
            // Validar stock disponible
            $this->validateStockAvailability($processed_items);
            
            Database::beginTransaction();
            
            try {
                // Crear venta
                $sale_id = $this->createSaleRecord($sale_data);
                
                // Crear items de venta
                $this->createSaleItems($sale_id, $processed_items);
                
                // Actualizar stock de productos (automático vía trigger)
                // Los triggers en la DB se encargan de esto
                
                // Actualizar totales del cliente si existe
                if (!empty($sale_data['customer_id'])) {
                    $this->updateCustomerTotals($sale_data['customer_id'], $totals['total']);
                }
                
                Database::commit();
                
                // Obtener venta completa creada
                $created_sale = $this->getCreatedSale($sale_id);
                
                // Log de actividad
                $this->logActivity('sale_created', [
                    'sale_id' => $sale_id,
                    'sale_number' => $sale_data['sale_number'],
                    'total' => $totals['total'],
                    'items_count' => count($processed_items)
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'sale' => $created_sale,
                    'receipt_url' => "/api/sales/receipt.php?id={$sale_id}",
                    'message' => 'Venta creada exitosamente'
                ], 201, 'Venta creada exitosamente');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error creating sale: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor', [
                'error_detail' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Validar estructura de la venta
     */
    private function validateSaleStructure(array $input): void {
        $errors = [];
        
        // Validar nombre del cliente
        if (empty($input['customer_name']) || strlen(trim($input['customer_name'])) < 2) {
            $errors[] = 'Nombre del cliente debe tener al menos 2 caracteres';
        }
        
        // Validar teléfono si se proporciona
        if (!empty($input['customer_phone']) && !$this->validateMexicanPhone($input['customer_phone'])) {
            $errors[] = 'Formato de teléfono inválido';
        }
        
        // Validar email si se proporciona
        if (!empty($input['customer_email']) && !$this->validateEmail($input['customer_email'])) {
            $errors[] = 'Email inválido';
        }
        
        // Validar items
        if (!is_array($input['items']) || empty($input['items'])) {
            $errors[] = 'Debe incluir al menos un item en la venta';
        }
        
        // Validar método de pago
        $valid_payment_methods = ['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque'];
        if (!in_array($input['payment_method'], $valid_payment_methods)) {
            $errors[] = 'Método de pago inválido';
        }
        
        if (!empty($errors)) {
            $this->sendError(400, 'Datos de venta inválidos', [
                'validation_errors' => $errors
            ]);
        }
    }
    
    /**
     * Procesar y validar items de la venta
     */
    private function processAndValidateItems(array $items): array {
        $processed_items = [];
        $errors = [];
        
        foreach ($items as $index => $item) {
            try {
                // Validar campos requeridos del item
                if (!isset($item['product_id']) || !isset($item['quantity'])) {
                    throw new Exception("Item $index: product_id y quantity son requeridos");
                }
                
                $product_id = $this->validateId($item['product_id']);
                $quantity = (int)$item['quantity'];
                
                if ($quantity <= 0) {
                    throw new Exception("Item $index: cantidad debe ser mayor a 0");
                }
                
                // Obtener información del producto
                $product = $this->getProductForSale($product_id);
                
                if (!$product) {
                    throw new Exception("Item $index: producto no encontrado o inactivo");
                }
                
                // Validar stock disponible
                if ($product['stock'] < $quantity) {
                    throw new Exception("Item $index: stock insuficiente. Disponible: {$product['stock']}, Solicitado: $quantity");
                }
                
                // Calcular precios
                $unit_price = isset($item['unit_price']) ? (float)$item['unit_price'] : (float)$product['price'];
                $discount_percentage = isset($item['discount_percentage']) ? (float)$item['discount_percentage'] : 0;
                
                // Validar descuento
                if ($discount_percentage < 0 || $discount_percentage > 100) {
                    throw new Exception("Item $index: descuento debe estar entre 0 y 100%");
                }
                
                $discount_amount = ($unit_price * $quantity * $discount_percentage) / 100;
                $subtotal = ($unit_price * $quantity) - $discount_amount;
                
                $processed_items[] = [
                    'product_id' => $product_id,
                    'product_name' => $product['name'],
                    'product_sku' => $product['sku'],
                    'quantity' => $quantity,
                    'unit_price' => $unit_price,
                    'unit_cost' => (float)$product['cost_price'],
                    'discount_percentage' => $discount_percentage,
                    'discount_amount' => $discount_amount,
                    'subtotal' => $subtotal
                ];
                
            } catch (Exception $e) {
                $errors[] = $e->getMessage();
            }
        }
        
        if (!empty($errors)) {
            $this->sendError(400, 'Errores en items de venta', [
                'item_errors' => $errors
            ]);
        }
        
        return $processed_items;
    }
    
    /**
     * Obtener producto para venta
     */
    private function getProductForSale(int $product_id): ?array {
        $query = "
            SELECT id, name, sku, price, cost_price, stock, status
            FROM products 
            WHERE id = :id AND status = 'active'
        ";
        
        return Database::fetchOne($query, ['id' => $product_id]);
    }
    
    /**
     * Calcular totales de la venta
     */
    private function calculateTotals(array $items, array $input): array {
        $subtotal = 0;
        
        foreach ($items as $item) {
            $subtotal += $item['subtotal'];
        }
        
        // Aplicar descuento general si existe
        $general_discount = isset($input['discount_amount']) ? (float)$input['discount_amount'] : 0;
        $subtotal_after_discount = $subtotal - $general_discount;
        
        // Calcular impuestos
        $tax_rate = isset($input['tax_rate']) ? (float)$input['tax_rate'] : $this->defaultTaxRate;
        $tax_amount = $subtotal_after_discount * $tax_rate;
        
        $total = $subtotal_after_discount + $tax_amount;
        
        return [
            'subtotal' => $subtotal,
            'discount_amount' => $general_discount,
            'tax_rate' => $tax_rate,
            'tax_amount' => $tax_amount,
            'total' => $total
        ];
    }
    
    /**
     * Preparar datos de la venta
     */
    private function prepareSaleData(array $input, array $totals): array {
        // Generar número de venta único
        $sale_number = $this->generateSaleNumber();
        
        // Buscar cliente existente por email o teléfono
        $customer_id = null;
        if (!empty($input['customer_email']) || !empty($input['customer_phone'])) {
            $customer_id = $this->findOrCreateCustomer($input);
        }
        
        return [
            'sale_number' => $sale_number,
            'customer_id' => $customer_id,
            'customer_name' => $input['customer_name'],
            'customer_phone' => $input['customer_phone'] ?? null,
            'customer_email' => $input['customer_email'] ?? null,
            'subtotal' => $totals['subtotal'],
            'tax_rate' => $totals['tax_rate'],
            'tax_amount' => $totals['tax_amount'],
            'discount_amount' => $totals['discount_amount'],
            'total' => $totals['total'],
            'payment_method' => $input['payment_method'],
            'payment_status' => $input['payment_status'] ?? 'paid',
            'sale_status' => $input['sale_status'] ?? 'completed',
            'notes' => $input['notes'] ?? null,
            'sold_by' => $this->user['id'],
            'sale_date' => $input['sale_date'] ?? date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Generar número de venta único
     */
    private function generateSaleNumber(): string {
        $prefix = 'V-' . date('Y') . '-';
        
        // Obtener el último número de venta del año
        $query = "
            SELECT sale_number 
            FROM sales 
            WHERE sale_number LIKE :prefix 
            ORDER BY id DESC 
            LIMIT 1
        ";
        
        $last_sale = Database::fetchOne($query, ['prefix' => $prefix . '%']);
        
        if ($last_sale) {
            // Extraer número y incrementar
            $last_number = (int)substr($last_sale['sale_number'], strlen($prefix));
            $next_number = $last_number + 1;
        } else {
            $next_number = 1;
        }
        
        return $prefix . str_pad($next_number, 4, '0', STR_PAD_LEFT);
    }
    
    /**
     * Buscar o crear cliente
     */
    private function findOrCreateCustomer(array $input): ?int {
        $customer = null;
        
        // Buscar por email
        if (!empty($input['customer_email'])) {
            $customer = Database::fetchOne(
                "SELECT id FROM customers WHERE email = :email",
                ['email' => $input['customer_email']]
            );
        }
        
        // Buscar por teléfono si no se encontró por email
        if (!$customer && !empty($input['customer_phone'])) {
            $customer = Database::fetchOne(
                "SELECT id FROM customers WHERE phone = :phone",
                ['phone' => $input['customer_phone']]
            );
        }
        
        if ($customer) {
            return (int)$customer['id'];
        }
        
        // Crear nuevo cliente si se proporciona email o teléfono
        if (!empty($input['customer_email']) || !empty($input['customer_phone'])) {
            $customer_data = [
                'name' => $input['customer_name'],
                'email' => $input['customer_email'] ?? null,
                'phone' => $input['customer_phone'] ?? null,
                'customer_type' => 'individual',
                'status' => 'active'
            ];
            
            return $this->createCustomer($customer_data);
        }
        
        return null;
    }
    
    /**
     * Crear nuevo cliente
     */
    private function createCustomer(array $data): int {
        $query = "
            INSERT INTO customers (name, email, phone, customer_type, status)
            VALUES (:name, :email, :phone, :customer_type, :status)
        ";
        
        Database::execute($query, $data);
        return (int)Database::getLastInsertId();
    }
    
    /**
     * Validar disponibilidad de stock
     */
    private function validateStockAvailability(array $items): void {
        $stock_errors = [];
        
        foreach ($items as $item) {
            $current_stock = Database::fetchOne(
                "SELECT stock FROM products WHERE id = :id",
                ['id' => $item['product_id']]
            );
            
            if (!$current_stock || $current_stock['stock'] < $item['quantity']) {
                $stock_errors[] = [
                    'product_name' => $item['product_name'],
                    'requested' => $item['quantity'],
                    'available' => $current_stock['stock'] ?? 0
                ];
            }
        }
        
        if (!empty($stock_errors)) {
            $this->sendError(409, 'Stock insuficiente', [
                'stock_errors' => $stock_errors
            ]);
        }
    }
    
    /**
     * Crear registro de venta
     */
    private function createSaleRecord(array $sale_data): int {
        $query = "
            INSERT INTO sales (
                sale_number, customer_id, customer_name, customer_phone, 
                customer_email, subtotal, tax_rate, tax_amount, discount_amount, 
                total, payment_method, payment_status, sale_status, notes, 
                sold_by, sale_date
            ) VALUES (
                :sale_number, :customer_id, :customer_name, :customer_phone,
                :customer_email, :subtotal, :tax_rate, :tax_amount, :discount_amount,
                :total, :payment_method, :payment_status, :sale_status, :notes,
                :sold_by, :sale_date
            )
        ";
        
        Database::execute($query, $sale_data);
        return (int)Database::getLastInsertId();
    }
    
    /**
     * Crear items de venta
     */
    private function createSaleItems(int $sale_id, array $items): void {
        $query = "
            INSERT INTO sale_items (
                sale_id, product_id, product_name, product_sku, quantity,
                unit_price, unit_cost, discount_percentage, discount_amount, subtotal
            ) VALUES (
                :sale_id, :product_id, :product_name, :product_sku, :quantity,
                :unit_price, :unit_cost, :discount_percentage, :discount_amount, :subtotal
            )
        ";
        
        foreach ($items as $item) {
            $item['sale_id'] = $sale_id;
            Database::execute($query, $item);
        }
    }
    
    /**
     * Actualizar totales del cliente
     */
    private function updateCustomerTotals(int $customer_id, float $sale_total): void {
        $query = "
            UPDATE customers 
            SET total_purchases = total_purchases + :amount,
                total_orders = total_orders + 1,
                updated_at = NOW()
            WHERE id = :id
        ";
        
        Database::execute($query, [
            'amount' => $sale_total,
            'id' => $customer_id
        ]);
    }
    
    /**
     * Obtener venta creada con detalles completos
     */
    private function getCreatedSale(int $sale_id): array {
        $sale_query = "
            SELECT s.*, c.customer_type, u.full_name as seller_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.sold_by = u.id
            WHERE s.id = :id
        ";
        
        $sale = Database::fetchOne($sale_query, ['id' => $sale_id]);
        
        // Obtener items
        $items_query = "
            SELECT * FROM sale_items WHERE sale_id = :sale_id ORDER BY id
        ";
        
        $items = Database::fetchAll($items_query, ['sale_id' => $sale_id]);
        
        // Formatear respuesta
        $sale['items'] = $items;
        $sale['items_count'] = count($items);
        $sale['total_quantity'] = array_sum(array_column($items, 'quantity'));
        
        return $sale;
    }
}

/**
 * Endpoint para cotizaciones (draft sales)
 * POST /api/sales/post.php?quote=1
 */
class QuoteCreateAPI extends ApiBase {
    
    private array $user;
    
    public function createQuote(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager', 'employee']);
            
            // Rate limiting
            $this->checkRateLimit('quote_create:' . $this->user['id'], 30, 3600);
            
            // Validar input básico
            $this->validateRequiredFields(['customer_name', 'items']);
            
            $input = $this->sanitizeInput($this->input);
            
            // Crear venta como borrador (cotización)
            $input['sale_status'] = 'draft';
            $input['payment_status'] = 'pending';
            $input['payment_method'] = $input['payment_method'] ?? 'efectivo';
            
            // Usar la misma lógica de creación pero con estado de borrador
            $sales_api = new SalesCreateAPI();
            
            // Simular la creación pero saltando validaciones de stock estrictas
            $this->createQuoteRecord($input);
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error creating quote: " . $e->getMessage());
            $this->sendError(500, 'Error creando cotización');
        }
    }
    
    private function createQuoteRecord(array $input): void {
        // Implementación simplificada para cotizaciones
        // No actualiza stock, solo crea el registro como borrador
        
        $quote_data = [
            'sale_number' => 'COT-' . date('Y') . '-' . uniqid(),
            'customer_name' => $input['customer_name'],
            'customer_phone' => $input['customer_phone'] ?? null,
            'customer_email' => $input['customer_email'] ?? null,
            'subtotal' => 0, // Se calculará después
            'tax_rate' => 0.16,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total' => 0,
            'payment_method' => $input['payment_method'],
            'payment_status' => 'pending',
            'sale_status' => 'draft',
            'notes' => 'Cotización - ' . ($input['notes'] ?? ''),
            'sold_by' => $this->user['id']
        ];
        
        Database::beginTransaction();
        
        try {
            // Crear cotización
            $query = "
                INSERT INTO sales (
                    sale_number, customer_name, customer_phone, customer_email,
                    subtotal, tax_rate, tax_amount, discount_amount, total,
                    payment_method, payment_status, sale_status, notes, sold_by
                ) VALUES (
                    :sale_number, :customer_name, :customer_phone, :customer_email,
                    :subtotal, :tax_rate, :tax_amount, :discount_amount, :total,
                    :payment_method, :payment_status, :sale_status, :notes, :sold_by
                )
            ";
            
            Database::execute($query, $quote_data);
            $quote_id = (int)Database::getLastInsertId();
            
            // Agregar items sin afectar stock
            $this->addQuoteItems($quote_id, $input['items']);
            
            Database::commit();
            
            $this->sendSuccess([
                'quote_id' => $quote_id,
                'quote_number' => $quote_data['sale_number'],
                'status' => 'draft',
                'message' => 'Cotización creada exitosamente'
            ], 201, 'Cotización creada');
            
        } catch (Exception $e) {
            Database::rollback();
            throw $e;
        }
    }
    
    private function addQuoteItems(int $quote_id, array $items): void {
        foreach ($items as $item) {
            // Obtener producto para precios
            $product = Database::fetchOne(
                "SELECT name, sku, price, cost_price FROM products WHERE id = :id",
                ['id' => $item['product_id']]
            );
            
            if ($product) {
                $quantity = (int)$item['quantity'];
                $unit_price = isset($item['unit_price']) ? (float)$item['unit_price'] : (float)$product['price'];
                $subtotal = $unit_price * $quantity;
                
                $item_data = [
                    'sale_id' => $quote_id,
                    'product_id' => (int)$item['product_id'],
                    'product_name' => $product['name'],
                    'product_sku' => $product['sku'],
                    'quantity' => $quantity,
                    'unit_price' => $unit_price,
                    'unit_cost' => (float)$product['cost_price'],
                    'discount_percentage' => 0,
                    'discount_amount' => 0,
                    'subtotal' => $subtotal
                ];
                
                $query = "
                    INSERT INTO sale_items (
                        sale_id, product_id, product_name, product_sku, quantity,
                        unit_price, unit_cost, discount_percentage, discount_amount, subtotal
                    ) VALUES (
                        :sale_id, :product_id, :product_name, :product_sku, :quantity,
                        :unit_price, :unit_cost, :discount_percentage, :discount_amount, :subtotal
                    )
                ";
                
                Database::execute($query, $item_data);
            }
        }
    }
}

// Manejar diferentes tipos de creación
if (isset($_GET['quote']) && $_GET['quote'] == '1') {
    $quote_api = new QuoteCreateAPI();
    $quote_api->createQuote();
} else {
    new SalesCreateAPI();
}