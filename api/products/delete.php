<?php
/**
 * ============================================
 * PrismaTech API - Delete Products
 * Endpoint para eliminar productos
 * DELETE /api/products/delete.php?id=123
 * ============================================
 */

require_once __DIR__ . '/../config/api_base.php';

class ProductsDeleteAPI extends ApiBase {
    
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
            case 'DELETE':
                $this->deleteProduct();
                break;
                
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    /**
     * Eliminar producto
     */
    private function deleteProduct(): void {
        try {
            // Autenticar usuario administrador
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin']); // Solo admins pueden eliminar
            
            // Rate limiting estricto para eliminaciones
            $this->checkRateLimit('product_delete:' . $this->user['id'], 10, 3600);
            
            // Validar ID del producto
            $product_id = $this->getProductId();
            
            // Obtener producto actual
            $product = $this->getCurrentProduct($product_id);
            
            // Verificar si el producto puede ser eliminado
            $this->validateProductDeletion($product_id, $product);
            
            // Determinar tipo de eliminación (soft delete vs hard delete)
            $force_delete = isset($_GET['force']) && $_GET['force'] === '1';
            
            Database::beginTransaction();
            
            try {
                if ($force_delete) {
                    // Eliminación completa (hard delete)
                    $this->hardDeleteProduct($product_id, $product);
                } else {
                    // Eliminación suave (soft delete) - cambiar estado a inactive
                    $this->softDeleteProduct($product_id, $product);
                }
                
                Database::commit();
                
                // Log de actividad
                $this->logActivity($force_delete ? 'product_hard_deleted' : 'product_soft_deleted', [
                    'product_id' => $product_id,
                    'product_name' => $product['name'],
                    'product_sku' => $product['sku']
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'product_id' => $product_id,
                    'product_name' => $product['name'],
                    'deletion_type' => $force_delete ? 'permanent' : 'soft',
                    'message' => $force_delete ? 
                        'Producto eliminado permanentemente' : 
                        'Producto marcado como inactivo'
                ], 200, 'Producto eliminado exitosamente');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error deleting product: " . $e->getMessage());
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
        $query = "
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = :id
        ";
        
        $product = Database::fetchOne($query, ['id' => $product_id]);
        
        if (!$product) {
            $this->sendError(404, 'Producto no encontrado', ['id' => $product_id]);
        }
        
        return $product;
    }
    
    /**
     * Validar si el producto puede ser eliminado
     */
    private function validateProductDeletion(int $product_id, array $product): void {
        $issues = [];
        
        // Verificar si el producto tiene ventas asociadas
        $sales_query = "SELECT COUNT(*) as count FROM sale_items WHERE product_id = :product_id";
        $sales_result = Database::fetchOne($sales_query, ['product_id' => $product_id]);
        
        if ($sales_result['count'] > 0) {
            $issues[] = [
                'type' => 'has_sales',
                'count' => (int)$sales_result['count'],
                'message' => 'El producto tiene ventas asociadas'
            ];
        }
        
        // Verificar si tiene movimientos de inventario
        $movements_query = "SELECT COUNT(*) as count FROM inventory_movements WHERE product_id = :product_id";
        $movements_result = Database::fetchOne($movements_query, ['product_id' => $product_id]);
        
        if ($movements_result['count'] > 0) {
            $issues[] = [
                'type' => 'has_inventory_movements',
                'count' => (int)$movements_result['count'],
                'message' => 'El producto tiene movimientos de inventario'
            ];
        }
        
        // Verificar si tiene stock actual
        if ($product['stock'] > 0) {
            $issues[] = [
                'type' => 'has_stock',
                'stock' => (int)$product['stock'],
                'message' => 'El producto tiene stock disponible'
            ];
        }
        
        // Si hay issues y no es eliminación forzada, mostrar advertencias
        if (!empty($issues) && (!isset($_GET['force']) || $_GET['force'] !== '1')) {
            $this->sendError(409, 'No se puede eliminar el producto', [
                'issues' => $issues,
                'suggestion' => 'Use force=1 para eliminación forzada o considere desactivar el producto',
                'alternative_endpoints' => [
                    'soft_delete' => '/api/products/put.php?id=' . $product_id . ' (status: inactive)',
                    'force_delete' => '/api/products/delete.php?id=' . $product_id . '&force=1'
                ]
            ]);
        }
        
        // Almacenar issues para referencia en logs
        $this->deletion_issues = $issues;
    }
    
    /**
     * Eliminación suave (cambiar estado a inactive)
     */
    private function softDeleteProduct(int $product_id, array $product): void {
        // Cambiar estado a inactive
        $query = "
            UPDATE products 
            SET status = 'inactive', 
                updated_at = NOW() 
            WHERE id = :id
        ";
        
        Database::execute($query, ['id' => $product_id]);
        
        // Registrar movimiento de inventario si hay stock
        if ($product['stock'] > 0) {
            $this->recordStockMovement($product_id, $product, 'soft_delete');
        }
    }
    
    /**
     * Eliminación completa (hard delete)
     */
    private function hardDeleteProduct(int $product_id, array $product): void {
        // Eliminar en orden correcto por dependencias de foreign keys
        
        // 1. Eliminar movimientos de inventario
        $movements_query = "DELETE FROM inventory_movements WHERE product_id = :product_id";
        Database::execute($movements_query, ['product_id' => $product_id]);
        
        // 2. Verificar y manejar items de ventas
        $sale_items_query = "SELECT COUNT(*) as count FROM sale_items WHERE product_id = :product_id";
        $sale_items_result = Database::fetchOne($sale_items_query, ['product_id' => $product_id]);
        
        if ($sale_items_result['count'] > 0) {
            // En lugar de eliminar sale_items (que rompería el historial),
            // actualizar para mantener referencia pero marcar como eliminado
            $update_sale_items = "
                UPDATE sale_items 
                SET product_name = CONCAT(product_name, ' [PRODUCTO ELIMINADO]')
                WHERE product_id = :product_id
            ";
            Database::execute($update_sale_items, ['product_id' => $product_id]);
            
            // Opcional: Nullificar la FK si la tabla lo permite
            // Database::execute("UPDATE sale_items SET product_id = NULL WHERE product_id = :product_id", ['product_id' => $product_id]);
        }
        
        // 3. Eliminar el producto
        $delete_query = "DELETE FROM products WHERE id = :id";
        Database::execute($delete_query, ['id' => $product_id]);
        
        // Verificar que se eliminó correctamente
        $deleted_count = Database::getRowCount(Database::execute("SELECT * FROM products WHERE id = :id", ['id' => $product_id]));
        if ($deleted_count > 0) {
            throw new Exception("Error al eliminar producto de la base de datos");
        }
    }
    
    /**
     * Registrar movimiento de inventario para eliminación
     */
    private function recordStockMovement(int $product_id, array $product, string $deletion_type): void {
        if ($product['stock'] <= 0) {
            return;
        }
        
        $movement_data = [
            'product_id' => $product_id,
            'movement_type' => 'out',
            'quantity' => (int)$product['stock'],
            'previous_stock' => (int)$product['stock'],
            'new_stock' => 0,
            'unit_cost' => (float)$product['cost_price'],
            'reference_type' => $deletion_type === 'soft_delete' ? 'adjustment' : 'initial',
            'reference_id' => null,
            'notes' => $deletion_type === 'soft_delete' ? 
                'Stock removido - producto desactivado' : 
                'Stock removido - producto eliminado permanentemente',
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

/**
 * Endpoint para restaurar productos desactivados
 * POST /api/products/delete.php?restore=1&id=123
 */
class ProductRestoreAPI extends ApiBase {
    
    private array $user;
    
    public function restoreProduct(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager']);
            
            // Rate limiting
            $this->checkRateLimit('product_restore:' . $this->user['id'], 20, 3600);
            
            // Validar ID del producto
            if (!isset($_GET['id'])) {
                $this->sendError(400, 'ID de producto requerido');
            }
            
            $product_id = $this->validateId($_GET['id']);
            
            // Obtener producto inactivo
            $query = "SELECT * FROM products WHERE id = :id AND status = 'inactive'";
            $product = Database::fetchOne($query, ['id' => $product_id]);
            
            if (!$product) {
                $this->sendError(404, 'Producto inactivo no encontrado', ['id' => $product_id]);
            }
            
            Database::beginTransaction();
            
            try {
                // Restaurar producto
                $restore_query = "
                    UPDATE products 
                    SET status = 'active', 
                        updated_at = NOW() 
                    WHERE id = :id
                ";
                
                Database::execute($restore_query, ['id' => $product_id]);
                
                // Registrar movimiento de inventario si es necesario
                if ($product['stock'] > 0) {
                    $this->recordRestoreMovement($product_id, $product);
                }
                
                Database::commit();
                
                // Obtener producto restaurado
                $restored_product = Database::fetchOne(
                    "SELECT * FROM products WHERE id = :id", 
                    ['id' => $product_id]
                );
                
                // Log de actividad
                $this->logActivity('product_restored', [
                    'product_id' => $product_id,
                    'product_name' => $product['name']
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'product' => ApiUtils::formatProductResponse($restored_product),
                    'message' => 'Producto restaurado exitosamente'
                ], 200, 'Producto restaurado exitosamente');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error restoring product: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    /**
     * Registrar movimiento de restauración
     */
    private function recordRestoreMovement(int $product_id, array $product): void {
        $movement_data = [
            'product_id' => $product_id,
            'movement_type' => 'in',
            'quantity' => (int)$product['stock'],
            'previous_stock' => 0,
            'new_stock' => (int)$product['stock'],
            'unit_cost' => (float)$product['cost_price'],
            'reference_type' => 'adjustment',
            'reference_id' => null,
            'notes' => 'Stock restaurado - producto reactivado',
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

/**
 * Endpoint para eliminación masiva
 * DELETE /api/products/delete.php?bulk=1
 */
class BulkProductDeleteAPI extends ApiBase {
    
    private array $user;
    
    public function deleteBulkProducts(): void {
        try {
            // Autenticar usuario - solo admin para eliminaciones masivas
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin']);
            
            // Rate limiting muy estricto
            $this->checkRateLimit('product_bulk_delete:' . $this->user['id'], 3, 3600);
            
            // Validar input
            if (!isset($this->input['product_ids']) || !is_array($this->input['product_ids'])) {
                $this->sendError(400, 'Se requiere array de product_ids');
            }
            
            $product_ids = array_map('intval', $this->input['product_ids']);
            $product_ids = array_filter($product_ids, fn($id) => $id > 0);
            
            if (empty($product_ids) || count($product_ids) > 20) {
                $this->sendError(400, 'Límite: 1-20 productos para eliminación masiva');
            }
            
            $force_delete = isset($this->input['force']) && $this->input['force'] === true;
            $successful_deletions = [];
            $errors = [];
            
            Database::beginTransaction();
            
            try {
                foreach ($product_ids as $product_id) {
                    try {
                        // Obtener producto
                        $product = Database::fetchOne(
                            "SELECT * FROM products WHERE id = :id", 
                            ['id' => $product_id]
                        );
                        
                        if (!$product) {
                            throw new Exception("Producto no encontrado");
                        }
                        
                        // Verificar restricciones si no es eliminación forzada
                        if (!$force_delete) {
                            $this->validateBulkProductDeletion($product_id);
                        }
                        
                        // Realizar eliminación
                        if ($force_delete) {
                            $this->performHardDelete($product_id, $product);
                            $deletion_type = 'permanent';
                        } else {
                            $this->performSoftDelete($product_id);
                            $deletion_type = 'soft';
                        }
                        
                        $successful_deletions[] = [
                            'product_id' => $product_id,
                            'product_name' => $product['name'],
                            'deletion_type' => $deletion_type
                        ];
                        
                    } catch (Exception $e) {
                        $errors[] = [
                            'product_id' => $product_id,
                            'error' => $e->getMessage()
                        ];
                    }
                }
                
                Database::commit();
                
                // Log de actividad
                $this->logActivity('products_bulk_deleted', [
                    'deleted_count' => count($successful_deletions),
                    'error_count' => count($errors),
                    'force_delete' => $force_delete
                ], $this->user['id']);
                
                $this->sendSuccess([
                    'successful_deletions' => $successful_deletions,
                    'errors' => $errors,
                    'summary' => [
                        'total_requested' => count($product_ids),
                        'successful' => count($successful_deletions),
                        'failed' => count($errors),
                        'deletion_type' => $force_delete ? 'permanent' : 'soft'
                    ]
                ], 200, 'Eliminación masiva completada');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error bulk delete: " . $e->getMessage());
            $this->sendError(500, 'Error en eliminación masiva');
        }
    }
    
    private function validateBulkProductDeletion(int $product_id): void {
        // Verificar ventas
        $sales_count = Database::fetchOne(
            "SELECT COUNT(*) as count FROM sale_items WHERE product_id = :id", 
            ['id' => $product_id]
        );
        
        if ($sales_count['count'] > 0) {
            throw new Exception("Tiene ventas asociadas");
        }
    }
    
    private function performSoftDelete(int $product_id): void {
        Database::execute(
            "UPDATE products SET status = 'inactive', updated_at = NOW() WHERE id = :id",
            ['id' => $product_id]
        );
    }
    
    private function performHardDelete(int $product_id, array $product): void {
        // Eliminar movimientos de inventario
        Database::execute(
            "DELETE FROM inventory_movements WHERE product_id = :id",
            ['id' => $product_id]
        );
        
        // Actualizar referencias en sale_items si existen
        Database::execute(
            "UPDATE sale_items SET product_name = CONCAT(product_name, ' [ELIMINADO]') WHERE product_id = :id",
            ['id' => $product_id]
        );
        
        // Eliminar producto
        Database::execute("DELETE FROM products WHERE id = :id", ['id' => $product_id]);
    }
}

/**
 * Endpoint para obtener productos eliminados (papelera)
 * GET /api/products/delete.php?trash=1
 */
class ProductTrashAPI extends ApiBase {
    
    public function getDeletedProducts(): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager']);
            
            // Obtener parámetros de paginación
            $pagination = $this->getPaginationParams();
            
            // Query para productos inactivos (eliminados suavemente)
            $base_query = "
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                WHERE p.status = 'inactive'
            ";
            
            // Contar total
            $total_result = Database::fetchOne("SELECT COUNT(*) as total " . $base_query);
            $total = (int)$total_result['total'];
            
            // Obtener productos eliminados
            $products_query = "
                SELECT p.*, c.name as category_name, c.slug as category_slug
                " . $base_query . "
                ORDER BY p.updated_at DESC
                LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
            ";
            
            $products = Database::fetchAll($products_query);
            
            // Formatear productos
            $formatted_products = array_map([ApiUtils::class, 'formatProductResponse'], $products);
            
            // Crear respuesta paginada
            $response_data = PaginatedResponse::create(
                $formatted_products,
                $total,
                $pagination['page'],
                $pagination['limit'],
                '/api/products/delete.php?trash=1'
            );
            
            $this->sendSuccess($response_data, 200, 'Productos eliminados obtenidos');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting deleted products: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
}

// Manejar diferentes tipos de operación
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['trash'])) {
    // Obtener productos en papelera
    $trash_api = new ProductTrashAPI();
    $trash_api->getDeletedProducts();
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['restore'])) {
    // Restaurar producto
    $restore_api = new ProductRestoreAPI();
    $restore_api->restoreProduct();
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && isset($_GET['bulk'])) {
    // Eliminación masiva
    $bulk_api = new BulkProductDeleteAPI();
    $bulk_api->deleteBulkProducts();
} else {
    // Eliminación individual
    new ProductsDeleteAPI();
}