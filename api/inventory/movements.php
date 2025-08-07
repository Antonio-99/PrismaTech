// api/inventory/movements.php
class InventoryMovementsAPI extends ApiBase {
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'GET':
                $this->getMovements();
                break;
            case 'POST':
                $this->createMovement();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function getMovements(): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager']);
            
            // Obtener parámetros de paginación
            $pagination = $this->getPaginationParams();
            
            // Query base
            $base_query = "
                FROM inventory_movements im
                JOIN products p ON im.product_id = p.id
                LEFT JOIN users u ON im.created_by = u.id
                WHERE 1=1
            ";
            
            $params = [];
            
            // Filtros
            if (!empty($this->input['product_id'])) {
                $base_query .= " AND im.product_id = :product_id";
                $params['product_id'] = (int)$this->input['product_id'];
            }
            
            if (!empty($this->input['movement_type'])) {
                $base_query .= " AND im.movement_type = :movement_type";
                $params['movement_type'] = $this->input['movement_type'];
            }
            
            if (!empty($this->input['date_from'])) {
                $base_query .= " AND DATE(im.created_at) >= :date_from";
                $params['date_from'] = $this->input['date_from'];
            }
            
            if (!empty($this->input['date_to'])) {
                $base_query .= " AND DATE(im.created_at) <= :date_to";
                $params['date_to'] = $this->input['date_to'];
            }
            
            // Contar total
            $count_query = "SELECT COUNT(*) as total " . $base_query;
            $total_result = Database::fetchOne($count_query, $params);
            $total = (int)$total_result['total'];
            
            // Obtener movimientos
            $data_query = "
                SELECT 
                    im.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    u.full_name as created_by_name
                " . $base_query . "
                ORDER BY im.created_at DESC
                LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
            ";
            
            $movements = Database::fetchAll($data_query, $params);
            
            // Formatear movimientos
            $formatted_movements = array_map(function($movement) {
                return [
                    'id' => (int)$movement['id'],
                    'product_id' => (int)$movement['product_id'],
                    'product_name' => $movement['product_name'],
                    'product_sku' => $movement['product_sku'],
                    'movement_type' => $movement['movement_type'],
                    'quantity' => (int)$movement['quantity'],
                    'previous_stock' => (int)$movement['previous_stock'],
                    'new_stock' => (int)$movement['new_stock'],
                    'unit_cost' => (float)$movement['unit_cost'],
                    'reference_type' => $movement['reference_type'],
                    'reference_id' => $movement['reference_id'],
                    'notes' => $movement['notes'],
                    'created_by' => (int)$movement['created_by'],
                    'created_by_name' => $movement['created_by_name'],
                    'created_at' => $movement['created_at']
                ];
            }, $movements);
            
            // Crear respuesta paginada
            $response_data = PaginatedResponse::create(
                $formatted_movements,
                $total,
                $pagination['page'],
                $pagination['limit'],
                '/api/inventory/movements.php'
            );
            
            $this->sendSuccess($response_data, 200, 'Movimientos obtenidos exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting inventory movements: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function createMovement(): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager']);
            
            // Rate limiting
            $this->checkRateLimit('inventory_movement:' . $user['id'], 30, 3600);
            
            // Validar campos requeridos
            $this->validateRequiredFields(['product_id', 'movement_type', 'quantity']);
            
            $input = $this->sanitizeInput($this->input);
            
            $product_id = $this->validateId($input['product_id']);
            $movement_type = $input['movement_type'];
            $quantity = (int)$input['quantity'];
            
            // Validar movement_type
            if (!in_array($movement_type, ['in', 'out', 'adjustment'])) {
                $this->sendError(400, 'Tipo de movimiento inválido');
            }
            
            // Validar cantidad
            if ($quantity <= 0) {
                $this->sendError(400, 'La cantidad debe ser mayor a 0');
            }
            
            // Obtener producto actual
            $product = Database::fetchOne(
                "SELECT id, name, stock, cost_price FROM products WHERE id = :id",
                ['id' => $product_id]
            );
            
            if (!$product) {
                $this->sendError(404, 'Producto no encontrado');
            }
            
            $current_stock = (int)$product['stock'];
            
            // Calcular nuevo stock
            $new_stock = $current_stock;
            if ($movement_type === 'in') {
                $new_stock += $quantity;
            } elseif ($movement_type === 'out') {
                if ($current_stock < $quantity) {
                    $this->sendError(400, 'Stock insuficiente');
                }
                $new_stock -= $quantity;
            } else { // adjustment
                $new_stock = $quantity;
                $quantity = abs($new_stock - $current_stock);
                $movement_type = $new_stock > $current_stock ? 'in' : 'out';
            }
            
            Database::beginTransaction();
            
            try {
                // Actualizar stock del producto
                Database::execute(
                    "UPDATE products SET stock = :stock, updated_at = NOW() WHERE id = :id",
                    ['stock' => $new_stock, 'id' => $product_id]
                );
                
                // Registrar movimiento
                $movement_data = [
                    'product_id' => $product_id,
                    'movement_type' => $movement_type,
                    'quantity' => $quantity,
                    'previous_stock' => $current_stock,
                    'new_stock' => $new_stock,
                    'unit_cost' => (float)($input['unit_cost'] ?? $product['cost_price']),
                    'reference_type' => 'adjustment',
                    'reference_id' => null,
                    'notes' => $input['notes'] ?? 'Ajuste manual de inventario',
                    'created_by' => $user['id']
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
                $movement_id = (int)Database::getLastInsertId();
                
                Database::commit();
                
                // Log de actividad
                $this->logActivity('inventory_adjustment', [
                    'product_id' => $product_id,
                    'product_name' => $product['name'],
                    'movement_type' => $movement_type,
                    'quantity' => $quantity,
                    'previous_stock' => $current_stock,
                    'new_stock' => $new_stock
                ], $user['id']);
                
                $this->sendSuccess([
                    'movement_id' => $movement_id,
                    'product_name' => $product['name'],
                    'previous_stock' => $current_stock,
                    'new_stock' => $new_stock,
                    'message' => 'Movimiento de inventario registrado exitosamente'
                ], 201, 'Movimiento registrado exitosamente');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error creating inventory movement: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
}

// Routing básico
$request_uri = $_SERVER['REQUEST_URI'] ?? '';

if (strpos($request_uri, '/api/categories/get.php') !== false) {
    new CategoriesGetAPI();
} elseif (strpos($request_uri, '/api/categories/post.php') !== false) {
    new CategoriesCreateAPI();
} elseif (strpos($request_uri, '/api/customers/get.php') !== false) {
    new CustomersGetAPI();
} elseif (strpos($request_uri, '/api/customers/post.php') !== false) {
    new CustomersCreateAPI();
} elseif (strpos($request_uri, '/api/reports/sales.php') !== false) {
    new SalesReportsAPI();
} elseif (strpos($request_uri, '/api/inventory/movements.php') !== false) {
    new InventoryMovementsAPI();
}