<?php
/**
 * ============================================
 * PrismaTech API - Create Products
 * Endpoint para crear productos
 * POST /api/products/post.php
 * ============================================
 */

require_once __DIR__ . '/../config/api_base.php';

class ProductsCreateAPI extends ApiBase {
    
    private array $user;
    
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
                $this->createProduct();
                break;
                
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    /**
     * Crear nuevo producto
     */
    private function createProduct(): void {
        try {
            // Autenticar usuario administrador
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager']);
            
            // Rate limiting más estricto para operaciones de escritura
            $this->checkRateLimit('product_create:' . $this->user['id'], 20, 3600);
            
            // Validar campos requeridos
            $this->validateRequiredFields([
                'name', 'category_id', 'price'
            ]);
            
            // Sanitizar input
            $input = $this->sanitizeInput($this->input);
            
            // Validar estructura del producto
            $validation_errors = ApiUtils::validateProductStructure($input);
            if (!empty($validation_errors)) {
                $this->sendError(400, 'Datos de producto inválidos', [
                    'validation_errors' => $validation_errors
                ]);
            }
            
            // Validar que la categoría existe
            $this->validateCategory($input['category_id']);
            
            // Preparar datos del producto
            $product_data = $this->prepareProductData($input);
            
            // Iniciar transacción
            Database::beginTransaction();
            
            try {
                // Insertar producto
                $product_id = $this->insertProduct($product_data);
                
                // Registrar movimiento de inventario inicial si hay stock
                if ($product_data['stock'] > 0) {
                    $this->recordInitialStockMovement($product_id, $product_data);
                }
                
                // Confirmar transacción
                Database::commit();
                
                // Obtener producto creado con datos completos
                $created_product = $this->getCreatedProduct($product_id);
                
                // Log de actividad
                $this->logActivity('product_created', [
                    'product_id' => $product_id,
                    'product_name' => $product_data['name']
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'product' => $created_product,
                    'message' => 'Producto creado exitosamente'
                ], 201, 'Producto creado exitosamente');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error creating product: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor', [
                'error_detail' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Validar que la categoría existe y está activa
     */
    private function validateCategory(int $category_id): void {
        $query = "SELECT id, name FROM categories WHERE id = :id AND status = 'active'";
        $category = Database::fetchOne($query, ['id' => $category_id]);
        
        if (!$category) {
            $this->sendError(400, 'Categoría no válida o inactiva', [
                'category_id' => $category_id
            ]);
        }
    }
    
    /**
     * Preparar datos del producto para inserción
     */
    private function prepareProductData(array $input): array {
        // Generar slug único
        $slug = ApiUtils::generateSlug($input['name'], 'products');
        
        // Generar SKU si no se proporciona
        $sku = $input['sku'] ?? null;
        if (empty($sku)) {
            $category = Database::fetchOne("SELECT slug FROM categories WHERE id = :id", ['id' => $input['category_id']]);
            $sku = ApiUtils::generateSKU($category['slug'] ?? 'PROD', $input['brand'] ?? '');
        } else {
            // Validar que el SKU no existe
            $existing_sku = Database::fetchOne("SELECT id FROM products WHERE sku = :sku", ['sku' => $sku]);
            if ($existing_sku) {
                $this->sendError(400, 'SKU ya existe', ['sku' => $sku]);
            }
        }
        
        // Preparar especificaciones como JSON
        $specifications = [];
        if (!empty($input['specifications'])) {
            if (is_array($input['specifications'])) {
                $specifications = $input['specifications'];
            } elseif (is_string($input['specifications'])) {
                $specifications = json_decode($input['specifications'], true) ?? [];
            }
        }
        
        // Preparar compatibilidad como JSON
        $compatibility = [];
        if (!empty($input['compatibility'])) {
            if (is_array($input['compatibility'])) {
                $compatibility = $input['compatibility'];
            } elseif (is_string($input['compatibility'])) {
                // Si es string separado por comas
                $compatibility = array_map('trim', explode(',', $input['compatibility']));
            }
        }
        
        // Preparar dimensiones como JSON
        $dimensions = [];
        if (!empty($input['dimensions'])) {
            if (is_array($input['dimensions'])) {
                $dimensions = $input['dimensions'];
            } elseif (is_string($input['dimensions'])) {
                $dimensions = json_decode($input['dimensions'], true) ?? [];
            }
        }
        
        return [
            'name' => $input['name'],
            'slug' => $slug,
            'category_id' => (int)$input['category_id'],
            'brand' => $input['brand'] ?? null,
            'sku' => $sku,
            'price' => (float)$input['price'],
            'cost_price' => (float)($input['cost_price'] ?? 0),
            'stock' => (int)($input['stock'] ?? 0),
            'min_stock' => (int)($input['min_stock'] ?? 3),
            'max_stock' => (int)($input['max_stock'] ?? 100),
            'description' => $input['description'] ?? null,
            'specifications' => json_encode($specifications),
            'compatibility' => json_encode($compatibility),
            'dimensions' => json_encode($dimensions),
            'icon' => $input['icon'] ?? 'fas fa-cube',
            'image_url' => $input['image_url'] ?? null,
            'weight' => (float)($input['weight'] ?? 0),
            'warranty_months' => (int)($input['warranty_months'] ?? 12),
            'status' => $input['status'] ?? 'active',
            'featured' => (bool)($input['featured'] ?? false),
            'created_by' => $this->user['id']
        ];
    }
    
    /**
     * Insertar producto en la base de datos
     */
    private function insertProduct(array $product_data): int {
        $query = "
            INSERT INTO products (
                name, slug, category_id, brand, sku, price, cost_price, 
                stock, min_stock, max_stock, description, specifications, 
                compatibility, dimensions, icon, image_url, weight, 
                warranty_months, status, featured, created_by
            ) VALUES (
                :name, :slug, :category_id, :brand, :sku, :price, :cost_price,
                :stock, :min_stock, :max_stock, :description, :specifications,
                :compatibility, :dimensions, :icon, :image_url, :weight,
                :warranty_months, :status, :featured, :created_by
            )
        ";
        
        Database::execute($query, $product_data);
        return (int)Database::getLastInsertId();
    }
    
    /**
     * Registrar movimiento inicial de inventario
     */
    private function recordInitialStockMovement(int $product_id, array $product_data): void {
        if ($product_data['stock'] <= 0) {
            return;
        }
        
        $movement_data = [
            'product_id' => $product_id,
            'movement_type' => 'initial',
            'quantity' => $product_data['stock'],
            'previous_stock' => 0,
            'new_stock' => $product_data['stock'],
            'unit_cost' => $product_data['cost_price'],
            'reference_type' => 'initial',
            'reference_id' => null,
            'notes' => 'Stock inicial del producto',
            'created_by' => $this->user['id']
        ];
        
        $query = "
            INSERT INTO inventory_movements (
                product_id, movement_type, quantity, previous_stock, 
                new_stock, unit_cost, reference_type, reference_id, 
                notes, created_by
            ) VALUES (
                :product_id, :movement_type, :quantity, :previous_stock,
                :new_stock, :unit_cost, :reference_type, :reference_id,
                :notes, :created_by
            )
        ";
        
        Database::execute($query, $movement_data);
    }
    
    /**
     * Obtener producto creado con datos completos
     */
    private function getCreatedProduct(int $product_id): array {
        $query = "
            SELECT p.*, c.name as category_name, c.slug as category_slug,
                   u.full_name as created_by_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.id = :id
        ";
        
        $product = Database::fetchOne($query, ['id' => $product_id]);
        return ApiUtils::formatProductResponse($product);
    }
}

/**
 * Endpoint para crear múltiples productos (bulk create)
 * POST /api/products/post.php?bulk=1
 */
class BulkProductsCreateAPI extends ApiBase {
    
    private array $user;
    
    public function createBulkProducts(): void {
        try {
            // Autenticar usuario administrador
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin']);
            
            // Rate limiting más estricto para bulk operations
            $this->checkRateLimit('product_bulk_create:' . $this->user['id'], 5, 3600);
            
            // Validar que se envió un array de productos
            if (!isset($this->input['products']) || !is_array($this->input['products'])) {
                $this->sendError(400, 'Se requiere un array de productos', [
                    'expected_format' => ['products' => []]
                ]);
            }
            
            $products_input = $this->input['products'];
            
            if (empty($products_input)) {
                $this->sendError(400, 'Array de productos no puede estar vacío');
            }
            
            // Limitar cantidad de productos por batch
            if (count($products_input) > 50) {
                $this->sendError(400, 'Máximo 50 productos por batch', [
                    'provided_count' => count($products_input),
                    'max_allowed' => 50
                ]);
            }
            
            $created_products = [];
            $errors = [];
            
            Database::beginTransaction();
            
            try {
                foreach ($products_input as $index => $product_data) {
                    try {
                        // Validar campos requeridos para cada producto
                        $required = ['name', 'category_id', 'price'];
                        foreach ($required as $field) {
                            if (!isset($product_data[$field]) || 
                                (is_string($product_data[$field]) && trim($product_data[$field]) === '')) {
                                throw new Exception("Campo requerido faltante: $field");
                            }
                        }
                        
                        // Sanitizar input
                        $sanitized_input = $this->sanitizeInput($product_data);
                        
                        // Validar estructura
                        $validation_errors = ApiUtils::validateProductStructure($sanitized_input);
                        if (!empty($validation_errors)) {
                            throw new Exception("Errores de validación: " . implode(', ', $validation_errors));
                        }
                        
                        // Validar categoría
                        $category_query = "SELECT id FROM categories WHERE id = :id AND status = 'active'";
                        $category = Database::fetchOne($category_query, ['id' => $sanitized_input['category_id']]);
                        if (!$category) {
                            throw new Exception("Categoría inválida: " . $sanitized_input['category_id']);
                        }
                        
                        // Preparar datos del producto
                        $prepared_data = $this->prepareBulkProductData($sanitized_input, $index);
                        
                        // Insertar producto
                        $product_id = $this->insertBulkProduct($prepared_data);
                        
                        // Registrar movimiento de inventario si hay stock
                        if ($prepared_data['stock'] > 0) {
                            $this->recordBulkStockMovement($product_id, $prepared_data);
                        }
                        
                        $created_products[] = [
                            'index' => $index,
                            'product_id' => $product_id,
                            'name' => $prepared_data['name'],
                            'sku' => $prepared_data['sku']
                        ];
                        
                    } catch (Exception $e) {
                        $errors[] = [
                            'index' => $index,
                            'product_name' => $product_data['name'] ?? 'unknown',
                            'error' => $e->getMessage()
                        ];
                    }
                }
                
                Database::commit();
                
                // Log de actividad
                $this->logActivity('products_bulk_created', [
                    'created_count' => count($created_products),
                    'error_count' => count($errors)
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'created_products' => $created_products,
                    'errors' => $errors,
                    'summary' => [
                        'total_processed' => count($products_input),
                        'successful' => count($created_products),
                        'failed' => count($errors)
                    ]
                ], 201, 'Proceso bulk completado');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error creating bulk products: " . $e->getMessage());
            $this->sendError(500, 'Error en creación bulk', [
                'error_detail' => $e->getMessage()
            ]);
        }
    }
    
    private function prepareBulkProductData(array $input, int $index): array {
        // Similar a prepareProductData pero con manejo de duplicados para bulk
        $base_slug = ApiUtils::generateSlug($input['name'], 'products');
        
        // Para bulk, agregar índice si hay conflicto
        $slug = $base_slug;
        $slug_counter = 1;
        while ($this->slugExists($slug)) {
            $slug = $base_slug . '-' . $slug_counter;
            $slug_counter++;
        }
        
        // Generar SKU único para bulk
        $category = Database::fetchOne("SELECT slug FROM categories WHERE id = :id", ['id' => $input['category_id']]);
        $base_sku = ApiUtils::generateSKU($category['slug'] ?? 'PROD', $input['brand'] ?? '');
        
        $sku = $base_sku;
        $sku_counter = 1;
        while ($this->skuExists($sku)) {
            $sku = $base_sku . '-' . $sku_counter;
            $sku_counter++;
        }
        
        return [
            'name' => $input['name'],
            'slug' => $slug,
            'category_id' => (int)$input['category_id'],
            'brand' => $input['brand'] ?? null,
            'sku' => $sku,
            'price' => (float)$input['price'],
            'cost_price' => (float)($input['cost_price'] ?? 0),
            'stock' => (int)($input['stock'] ?? 0),
            'min_stock' => (int)($input['min_stock'] ?? 3),
            'max_stock' => (int)($input['max_stock'] ?? 100),
            'description' => $input['description'] ?? null,
            'specifications' => json_encode($input['specifications'] ?? []),
            'compatibility' => json_encode($input['compatibility'] ?? []),
            'dimensions' => json_encode($input['dimensions'] ?? []),
            'icon' => $input['icon'] ?? 'fas fa-cube',
            'image_url' => $input['image_url'] ?? null,
            'weight' => (float)($input['weight'] ?? 0),
            'warranty_months' => (int)($input['warranty_months'] ?? 12),
            'status' => $input['status'] ?? 'active',
            'featured' => (bool)($input['featured'] ?? false),
            'created_by' => $this->user['id']
        ];
    }
    
    private function slugExists(string $slug): bool {
        $result = Database::fetchOne("SELECT COUNT(*) as count FROM products WHERE slug = :slug", ['slug' => $slug]);
        return $result['count'] > 0;
    }
    
    private function skuExists(string $sku): bool {
        $result = Database::fetchOne("SELECT COUNT(*) as count FROM products WHERE sku = :sku", ['sku' => $sku]);
        return $result['count'] > 0;
    }
    
    private function insertBulkProduct(array $product_data): int {
        $query = "
            INSERT INTO products (
                name, slug, category_id, brand, sku, price, cost_price, 
                stock, min_stock, max_stock, description, specifications, 
                compatibility, dimensions, icon, image_url, weight, 
                warranty_months, status, featured, created_by
            ) VALUES (
                :name, :slug, :category_id, :brand, :sku, :price, :cost_price,
                :stock, :min_stock, :max_stock, :description, :specifications,
                :compatibility, :dimensions, :icon, :image_url, :weight,
                :warranty_months, :status, :featured, :created_by
            )
        ";
        
        Database::execute($query, $product_data);
        return (int)Database::getLastInsertId();
    }
    
    private function recordBulkStockMovement(int $product_id, array $product_data): void {
        if ($product_data['stock'] <= 0) return;
        
        $movement_data = [
            'product_id' => $product_id,
            'movement_type' => 'initial',
            'quantity' => $product_data['stock'],
            'previous_stock' => 0,
            'new_stock' => $product_data['stock'],
            'unit_cost' => $product_data['cost_price'],
            'reference_type' => 'initial',
            'reference_id' => null,
            'notes' => 'Stock inicial - creación bulk',
            'created_by' => $this->user['id']
        ];
        
        $query = "
            INSERT INTO inventory_movements (
                product_id, movement_type, quantity, previous_stock, 
                new_stock, unit_cost, reference_type, reference_id, 
                notes, created_by
            ) VALUES (
                :product_id, :movement_type, :quantity, :previous_stock,
                :new_stock, :unit_cost, :reference_type, :reference_id,
                :notes, :created_by
            )
        ";
        
        Database::execute($query, $movement_data);
    }
}

// Manejar request
if (isset($_GET['bulk']) && $_GET['bulk'] == '1') {
    $bulk_api = new BulkProductsCreateAPI();
    $bulk_api->createBulkProducts();
} else {
    new ProductsCreateAPI();
}