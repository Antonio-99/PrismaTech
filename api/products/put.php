<?php
/**
 * ============================================
 * PrismaTech API - Update Products
 * Endpoint para actualizar productos
 * PUT /api/products/put.php?id=123
 * ============================================
 */

require_once __DIR__ . '/../config/api_base.php';

class ProductsUpdateAPI extends ApiBase {
    
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
            case 'PUT':
                $this->updateProduct();
                break;
                
            case 'PATCH':
                $this->patchProduct();
                break;
                
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    /**
     * Actualizar producto completo (PUT)
     */
    private function updateProduct(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager']);
            
            // Rate limiting
            $this->checkRateLimit('product_update:' . $this->user['id'], 30, 3600);
            
            // Validar ID del producto
            $product_id = $this->getProductId();
            
            // Obtener producto actual
            $current_product = $this->getCurrentProduct($product_id);
            
            // Validar campos requeridos para actualización completa
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
            
            // Validar categoría
            $this->validateCategory($input['category_id']);
            
            // Preparar datos de actualización
            $update_data = $this->prepareUpdateData($input, $current_product);
            
            Database::beginTransaction();
            
            try {
                // Actualizar producto
                $this->executeUpdate($product_id, $update_data);
                
                // Manejar cambios en el stock
                $this->handleStockChanges($product_id, $current_product, $update_data);
                
                Database::commit();
                
                // Obtener producto actualizado
                $updated_product = $this->getUpdatedProduct($product_id);
                
                // Log de actividad
                $this->logActivity('product_updated', [
                    'product_id' => $product_id,
                    'product_name' => $update_data['name'],
                    'changes' => $this->getChanges($current_product, $update_data)
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'product' => $updated_product,
                    'changes' => $this->getChanges($current_product, $update_data)
                ], 200, 'Producto actualizado exitosamente');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error updating product: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor', [
                'error_detail' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Actualizar producto parcial (PATCH)
     */
    private function patchProduct(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager', 'employee']);
            
            // Rate limiting más permisivo para PATCH
            $this->checkRateLimit('product_patch:' . $this->user['id'], 50, 3600);
            
            // Validar ID del producto
            $product_id = $this->getProductId();
            
            // Obtener producto actual
            $current_product = $this->getCurrentProduct($product_id);
            
            // Para PATCH no se requieren todos los campos
            if (empty($this->input)) {
                $this->sendError(400, 'No hay datos para actualizar');
            }
            
            // Sanitizar input
            $input = $this->sanitizeInput($this->input);
            
            // Validar solo los campos enviados
            $this->validatePatchFields($input);
            
            // Preparar datos de actualización parcial
            $update_data = $this->preparePatchData($input, $current_product);
            
            Database::beginTransaction();
            
            try {
                // Actualizar solo los campos modificados
                $this->executePatchUpdate($product_id, $update_data);
                
                // Manejar cambios en el stock si se modificó
                if (isset($update_data['stock'])) {
                    $this->handleStockChanges($product_id, $current_product, $update_data);
                }
                
                Database::commit();
                
                // Obtener producto actualizado
                $updated_product = $this->getUpdatedProduct($product_id);
                
                // Log de actividad
                $this->logActivity('product_patched', [
                    'product_id' => $product_id,
                    'product_name' => $current_product['name'],
                    'fields_updated' => array_keys($update_data)
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'product' => $updated_product,
                    'updated_fields' => array_keys($update_data)
                ], 200, 'Producto actualizado parcialmente');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error patching product: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor', [
                'error_detail' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Obtener ID del producto desde la URL
     */
    private function getProductId(): int {
        if (!isset($_GET['id'])) {
            $this->sendError(400, 'ID de producto requerido');
        }
        
        return $this->validateId($_GET['id']);
    }
    
    /**
     * Obtener producto actual
     */
    private function getCurrentProduct(int $product_id): array {
        $query = "SELECT * FROM products WHERE id = :id";
        $product = Database::fetchOne($query, ['id' => $product_id]);
        
        if (!$product) {
            $this->sendError(404, 'Producto no encontrado', ['id' => $product_id]);
        }
        
        return $product;
    }
    
    /**
     * Validar categoría existe y está activa
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
     * Validar campos específicos para PATCH
     */
    private function validatePatchFields(array $input): void {
        $errors = [];
        
        // Validar precio si se envía
        if (isset($input['price']) && (!is_numeric($input['price']) || $input['price'] <= 0)) {
            $errors[] = 'Precio debe ser un número mayor a 0';
        }
        
        // Validar stock si se envía
        if (isset($input['stock']) && (!is_numeric($input['stock']) || $input['stock'] < 0)) {
            $errors[] = 'Stock debe ser un número mayor o igual a 0';
        }
        
        // Validar categoría si se envía
        if (isset($input['category_id'])) {
            if (!is_numeric($input['category_id'])) {
                $errors[] = 'ID de categoría debe ser numérico';
            } else {
                $this->validateCategory((int)$input['category_id']);
            }
        }
        
        // Validar nombre si se envía
        if (isset($input['name']) && (empty($input['name']) || strlen($input['name']) < 3)) {
            $errors[] = 'Nombre debe tener al menos 3 caracteres';
        }
        
        // Validar email si se envía
        if (isset($input['email']) && !empty($input['email']) && !$this->validateEmail($input['email'])) {
            $errors[] = 'Email inválido';
        }
        
        if (!empty($errors)) {
            $this->sendError(400, 'Errores de validación', ['errors' => $errors]);
        }
    }
    
    /**
     * Preparar datos de actualización completa
     */
    private function prepareUpdateData(array $input, array $current_product): array {
        // Manejar slug - regenerar solo si el nombre cambió
        $slug = $current_product['slug'];
        if ($input['name'] !== $current_product['name']) {
            $slug = ApiUtils::generateSlug($input['name'], 'products');
        }
        
        // Manejar SKU - mantener actual si no se proporciona
        $sku = $input['sku'] ?? $current_product['sku'];
        if ($sku !== $current_product['sku']) {
            // Validar que el nuevo SKU no existe
            $existing_sku = Database::fetchOne(
                "SELECT id FROM products WHERE sku = :sku AND id != :id", 
                ['sku' => $sku, 'id' => $current_product['id']]
            );
            if ($existing_sku) {
                $this->sendError(400, 'SKU ya existe', ['sku' => $sku]);
            }
        }
        
        // Preparar JSON fields
        $specifications = $this->prepareJsonField($input['specifications'] ?? []);
        $compatibility = $this->prepareCompatibilityField($input['compatibility'] ?? []);
        $dimensions = $this->prepareJsonField($input['dimensions'] ?? []);
        
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
            'specifications' => $specifications,
            'compatibility' => $compatibility,
            'dimensions' => $dimensions,
            'icon' => $input['icon'] ?? 'fas fa-cube',
            'image_url' => $input['image_url'] ?? null,
            'weight' => (float)($input['weight'] ?? 0),
            'warranty_months' => (int)($input['warranty_months'] ?? 12),
            'status' => $input['status'] ?? 'active',
            'featured' => (bool)($input['featured'] ?? false),
            'updated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Preparar datos de actualización parcial
     */
    private function preparePatchData(array $input, array $current_product): array {
        $update_data = [];
        
        // Solo incluir campos que se están actualizando
        $updatable_fields = [
            'name', 'category_id', 'brand', 'sku', 'price', 'cost_price',
            'stock', 'min_stock', 'max_stock', 'description', 'icon',
            'image_url', 'weight', 'warranty_months', 'status', 'featured'
        ];
        
        foreach ($updatable_fields as $field) {
            if (isset($input[$field])) {
                switch ($field) {
                    case 'category_id':
                    case 'stock':
                    case 'min_stock':
                    case 'max_stock':
                    case 'warranty_months':
                        $update_data[$field] = (int)$input[$field];
                        break;
                        
                    case 'price':
                    case 'cost_price':
                    case 'weight':
                        $update_data[$field] = (float)$input[$field];
                        break;
                        
                    case 'featured':
                        $update_data[$field] = (bool)$input[$field];
                        break;
                        
                    default:
                        $update_data[$field] = $input[$field];
                }
            }
        }
        
        // Manejar campos JSON
        if (isset($input['specifications'])) {
            $update_data['specifications'] = $this->prepareJsonField($input['specifications']);
        }
        
        if (isset($input['compatibility'])) {
            $update_data['compatibility'] = $this->prepareCompatibilityField($input['compatibility']);
        }
        
        if (isset($input['dimensions'])) {
            $update_data['dimensions'] = $this->prepareJsonField($input['dimensions']);
        }
        
        // Regenerar slug si el nombre cambió
        if (isset($update_data['name']) && $update_data['name'] !== $current_product['name']) {
            $update_data['slug'] = ApiUtils::generateSlug($update_data['name'], 'products');
        }
        
        // Validar SKU único si se cambió
        if (isset($update_data['sku']) && $update_data['sku'] !== $current_product['sku']) {
            $existing_sku = Database::fetchOne(
                "SELECT id FROM products WHERE sku = :sku AND id != :id", 
                ['sku' => $update_data['sku'], 'id' => $current_product['id']]
            );
            if ($existing_sku) {
                $this->sendError(400, 'SKU ya existe', ['sku' => $update_data['sku']]);
            }
        }
        
        $update_data['updated_at'] = date('Y-m-d H:i:s');
        
        return $update_data;
    }
    
    /**
     * Preparar campo JSON
     */
    private function prepareJsonField($field): string {
        if (is_array($field)) {
            return json_encode($field);
        } elseif (is_string($field)) {
            $decoded = json_decode($field, true);
            return json_encode($decoded ?? []);
        }
        return json_encode([]);
    }
    
    /**
     * Preparar campo de compatibilidad
     */
    private function prepareCompatibilityField($field): string {
        if (is_array($field)) {
            return json_encode($field);
        } elseif (is_string($field)) {
            // Si es string separado por comas
            $compatibility = array_map('trim', explode(',', $field));
            return json_encode($compatibility);
        }
        return json_encode([]);
    }
    
    /**
     * Ejecutar actualización completa
     */
    private function executeUpdate(int $product_id, array $update_data): void {
        $fields = array_keys($update_data);
        $set_clause = array_map(fn($field) => "$field = :$field", $fields);
        
        $query = "
            UPDATE products 
            SET " . implode(', ', $set_clause) . "
            WHERE id = :id
        ";
        
        $update_data['id'] = $product_id;
        Database::execute($query, $update_data);
    }
    
    /**
     * Ejecutar actualización parcial
     */
    private function executePatchUpdate(int $product_id, array $update_data): void {
        if (empty($update_data)) {
            return;
        }
        
        $fields = array_keys($update_data);
        $set_clause = array_map(fn($field) => "$field = :$field", $fields);
        
        $query = "
            UPDATE products 
            SET " . implode(', ', $set_clause) . "
            WHERE id = :id
        ";
        
        $update_data['id'] = $product_id;
        Database::execute($query, $update_data);
    }
    
    /**
     * Manejar cambios en el stock
     */
    private function handleStockChanges(int $product_id, array $current_product, array $update_data): void {
        if (!isset($update_data['stock'])) {
            return;
        }
        
        $old_stock = (int)$current_product['stock'];
        $new_stock = (int)$update_data['stock'];
        
        if ($old_stock === $new_stock) {
            return;
        }
        
        $movement_type = $new_stock > $old_stock ? 'in' : 'out';
        $quantity = abs($new_stock - $old_stock);
        
        $movement_data = [
            'product_id' => $product_id,
            'movement_type' => $movement_type,
            'quantity' => $quantity,
            'previous_stock' => $old_stock,
            'new_stock' => $new_stock,
            'unit_cost' => (float)($update_data['cost_price'] ?? $current_product['cost_price']),
            'reference_type' => 'adjustment',
            'reference_id' => null,
            'notes' => 'Ajuste de stock vía API - actualización de producto',
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
     * Obtener producto actualizado
     */
    private function getUpdatedProduct(int $product_id): array {
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
    
    /**
     * Obtener cambios realizados
     */
    private function getChanges(array $before, array $after): array {
        $changes = [];
        
        foreach ($after as $field => $new_value) {
            if ($field === 'updated_at') continue;
            
            $old_value = $before[$field] ?? null;
            
            // Comparar valores considerando tipos
            if ($this->valuesAreDifferent($old_value, $new_value)) {
                $changes[$field] = [
                    'from' => $old_value,
                    'to' => $new_value
                ];
            }
        }
        
        return $changes;
    }
    
    /**
     * Comparar si dos valores son diferentes
     */
    private function valuesAreDifferent($old, $new): bool {
        // Manejar comparación de JSON
        if (is_string($old) && is_string($new)) {
            $old_decoded = json_decode($old, true);
            $new_decoded = json_decode($new, true);
            
            if ($old_decoded !== null && $new_decoded !== null) {
                return $old_decoded !== $new_decoded;
            }
        }
        
        return $old !== $new;
    }
}

/**
 * Endpoint para actualización masiva de stock
 * PUT /api/products/put.php?bulk_stock=1
 */
class BulkStockUpdateAPI extends ApiBase {
    
    private array $user;
    
    public function updateBulkStock(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager']);
            
            // Rate limiting estricto para bulk operations
            $this->checkRateLimit('product_bulk_stock:' . $this->user['id'], 10, 3600);
            
            // Validar input
            if (!isset($this->input['stock_updates']) || !is_array($this->input['stock_updates'])) {
                $this->sendError(400, 'Se requiere array stock_updates', [
                    'expected_format' => ['stock_updates' => [['id' => 1, 'stock' => 10]]]
                ]);
            }
            
            $stock_updates = $this->input['stock_updates'];
            
            if (empty($stock_updates) || count($stock_updates) > 100) {
                $this->sendError(400, 'Límite de actualizaciones: 1-100 productos');
            }
            
            $successful_updates = [];
            $errors = [];
            
            Database::beginTransaction();
            
            try {
                foreach ($stock_updates as $index => $update) {
                    try {
                        if (!isset($update['id']) || !isset($update['stock'])) {
                            throw new Exception("ID y stock requeridos");
                        }
                        
                        $product_id = $this->validateId($update['id']);
                        $new_stock = (int)$update['stock'];
                        
                        if ($new_stock < 0) {
                            throw new Exception("Stock no puede ser negativo");
                        }
                        
                        // Obtener producto actual
                        $current_product = Database::fetchOne(
                            "SELECT id, name, stock FROM products WHERE id = :id", 
                            ['id' => $product_id]
                        );
                        
                        if (!$current_product) {
                            throw new Exception("Producto no encontrado");
                        }
                        
                        $old_stock = (int)$current_product['stock'];
                        
                        // Actualizar stock
                        Database::execute(
                            "UPDATE products SET stock = :stock, updated_at = NOW() WHERE id = :id",
                            ['stock' => $new_stock, 'id' => $product_id]
                        );
                        
                        // Registrar movimiento si hay cambio
                        if ($old_stock !== $new_stock) {
                            $this->recordStockMovement($product_id, $old_stock, $new_stock);
                        }
                        
                        $successful_updates[] = [
                            'index' => $index,
                            'product_id' => $product_id,
                            'product_name' => $current_product['name'],
                            'old_stock' => $old_stock,
                            'new_stock' => $new_stock
                        ];
                        
                    } catch (Exception $e) {
                        $errors[] = [
                            'index' => $index,
                            'product_id' => $update['id'] ?? 'unknown',
                            'error' => $e->getMessage()
                        ];
                    }
                }
                
                Database::commit();
                
                // Log de actividad
                $this->logActivity('bulk_stock_updated', [
                    'updated_count' => count($successful_updates),
                    'error_count' => count($errors)
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'successful_updates' => $successful_updates,
                    'errors' => $errors,
                    'summary' => [
                        'total_processed' => count($stock_updates),
                        'successful' => count($successful_updates),
                        'failed' => count($errors)
                    ]
                ], 200, 'Actualización masiva de stock completada');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error bulk stock update: " . $e->getMessage());
            $this->sendError(500, 'Error en actualización masiva');
        }
    }
    
    private function recordStockMovement(int $product_id, int $old_stock, int $new_stock): void {
        $movement_type = $new_stock > $old_stock ? 'in' : 'out';
        $quantity = abs($new_stock - $old_stock);
        
        $movement_data = [
            'product_id' => $product_id,
            'movement_type' => $movement_type,
            'quantity' => $quantity,
            'previous_stock' => $old_stock,
            'new_stock' => $new_stock,
            'unit_cost' => 0,
            'reference_type' => 'adjustment',
            'reference_id' => null,
            'notes' => 'Actualización masiva de stock vía API',
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

// Manejar diferentes tipos de actualización
if (isset($_GET['bulk_stock']) && $_GET['bulk_stock'] == '1') {
    $bulk_stock_api = new BulkStockUpdateAPI();
    $bulk_stock_api->updateBulkStock();
} else {
    new ProductsUpdateAPI();
}