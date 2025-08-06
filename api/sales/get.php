<?php
/**
 * ============================================
 * PrismaTech API - Get Sales
 * Endpoint para obtener ventas
 * GET /api/sales/get.php
 * ============================================
 */

require_once __DIR__ . '/../config/api_base.php';

class SalesGetAPI extends ApiBase {
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    /**
     * Manejar request según método HTTP
     */
    private function handleRequest(): void {
        switch ($this->method) {
            case 'GET':
                $this->getSales();
                break;
                
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    /**
     * Obtener ventas con filtros y paginación
     */
    private function getSales(): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager', 'employee']);
            
            // Rate limiting
            $this->checkRateLimit('sales_get:' . $user['id'], 100, 3600);
            
            // Obtener parámetros de paginación
            $pagination = $this->getPaginationParams();
            
            // Obtener parámetros de ordenamiento
            $allowed_sort_fields = ['id', 'sale_number', 'sale_date', 'total', 'customer_name', 'payment_method', 'sale_status'];
            $sort = $this->getSortParams($allowed_sort_fields);
            
            // Construir query base
            $base_query = "
                FROM v_sales_summary s 
                WHERE 1=1
            ";
            
            $where_conditions = [];
            $params = [];
            
            // Filtro por número de venta
            if (!empty($this->input['sale_number'])) {
                $where_conditions[] = "s.sale_number LIKE :sale_number";
                $params['sale_number'] = '%' . $this->input['sale_number'] . '%';
            }
            
            // Filtro por cliente
            if (!empty($this->input['customer'])) {
                $search_customer = '%' . $this->input['customer'] . '%';
                $where_conditions[] = "(
                    s.customer_name LIKE :customer OR 
                    s.customer_phone LIKE :customer OR
                    s.customer_email LIKE :customer
                )";
                $params['customer'] = $search_customer;
            }
            
            // Filtro por rango de fechas
            if (!empty($this->input['date_from'])) {
                $where_conditions[] = "DATE(s.sale_date) >= :date_from";
                $params['date_from'] = $this->input['date_from'];
            }
            
            if (!empty($this->input['date_to'])) {
                $where_conditions[] = "DATE(s.sale_date) <= :date_to";
                $params['date_to'] = $this->input['date_to'];
            }
            
            // Filtro por método de pago
            if (!empty($this->input['payment_method'])) {
                $where_conditions[] = "s.payment_method = :payment_method";
                $params['payment_method'] = $this->input['payment_method'];
            }
            
            // Filtro por estado de venta
            if (!empty($this->input['sale_status'])) {
                $where_conditions[] = "s.sale_status = :sale_status";
                $params['sale_status'] = $this->input['sale_status'];
            }
            
            // Filtro por estado de pago
            if (!empty($this->input['payment_status'])) {
                $where_conditions[] = "s.payment_status = :payment_status";
                $params['payment_status'] = $this->input['payment_status'];
            }
            
            // Filtro por rango de totales
            if (!empty($this->input['min_total']) && is_numeric($this->input['min_total'])) {
                $where_conditions[] = "s.total >= :min_total";
                $params['min_total'] = (float)$this->input['min_total'];
            }
            
            if (!empty($this->input['max_total']) && is_numeric($this->input['max_total'])) {
                $where_conditions[] = "s.total <= :max_total";
                $params['max_total'] = (float)$this->input['max_total'];
            }
            
            // Filtro por vendedor
            if (!empty($this->input['sold_by']) && is_numeric($this->input['sold_by'])) {
                $where_conditions[] = "s.sold_by = :sold_by";
                $params['sold_by'] = (int)$this->input['sold_by'];
            }
            
            // Solo mostrar ventas del empleado si no es admin/manager
            if ($user['role'] === 'employee') {
                $where_conditions[] = "s.sold_by = :user_id";
                $params['user_id'] = $user['id'];
            }
            
            // Filtro por período predefinido
            if (!empty($this->input['period'])) {
                $period_condition = $this->getPeriodCondition($this->input['period']);
                if ($period_condition) {
                    $where_conditions[] = $period_condition;
                }
            }
            
            // Agregar condiciones WHERE
            if (!empty($where_conditions)) {
                $base_query .= " AND " . implode(' AND ', $where_conditions);
            }
            
            // Query para contar total de registros
            $count_query = "SELECT COUNT(*) as total " . $base_query;
            $total_result = Database::fetchOne($count_query, $params);
            $total = (int)$total_result['total'];
            
            // Query para obtener datos paginados
            $data_query = "
                SELECT 
                    s.*,
                    CASE 
                        WHEN s.payment_method = 'efectivo' THEN 'Efectivo'
                        WHEN s.payment_method = 'tarjeta_debito' THEN 'Tarjeta Débito'
                        WHEN s.payment_method = 'tarjeta_credito' THEN 'Tarjeta Crédito'
                        WHEN s.payment_method = 'transferencia' THEN 'Transferencia'
                        WHEN s.payment_method = 'cheque' THEN 'Cheque'
                        ELSE s.payment_method
                    END as payment_method_display,
                    CASE 
                        WHEN s.sale_status = 'completed' THEN 'Completada'
                        WHEN s.sale_status = 'draft' THEN 'Borrador'
                        WHEN s.sale_status = 'cancelled' THEN 'Cancelada'
                        WHEN s.sale_status = 'refunded' THEN 'Reembolsada'
                        ELSE s.sale_status
                    END as sale_status_display,
                    CASE 
                        WHEN s.payment_status = 'paid' THEN 'Pagado'
                        WHEN s.payment_status = 'pending' THEN 'Pendiente'
                        WHEN s.payment_status = 'partial' THEN 'Parcial'
                        WHEN s.payment_status = 'refunded' THEN 'Reembolsado'
                        ELSE s.payment_status
                    END as payment_status_display
                " . $base_query . "
                ORDER BY s.{$sort['sort_by']} {$sort['sort_order']}
                LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
            ";
            
            $sales = Database::fetchAll($data_query, $params);
            
            // Formatear ventas
            $formatted_sales = array_map([$this, 'formatSaleResponse'], $sales);
            
            // Obtener estadísticas si es solicitado
            $include_stats = ($this->input['include_stats'] ?? false);
            $additional_data = [];
            
            if ($include_stats) {
                $additional_data['statistics'] = $this->getSalesStatistics($params, $base_query);
            }
            
            // Crear respuesta paginada
            $response_data = PaginatedResponse::create(
                $formatted_sales,
                $total,
                $pagination['page'],
                $pagination['limit'],
                '/api/sales/get.php'
            );
            
            // Agregar datos adicionales
            if (!empty($additional_data)) {
                $response_data = array_merge($response_data, $additional_data);
            }
            
            $this->sendSuccess($response_data, 200, 'Ventas obtenidas exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting sales: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor', [
                'error_detail' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Obtener condición de período predefinido
     */
    private function getPeriodCondition(string $period): ?string {
        switch ($period) {
            case 'today':
                return "DATE(s.sale_date) = CURDATE()";
            case 'yesterday':
                return "DATE(s.sale_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
            case 'this_week':
                return "YEARWEEK(s.sale_date) = YEARWEEK(NOW())";
            case 'last_week':
                return "YEARWEEK(s.sale_date) = YEARWEEK(DATE_SUB(NOW(), INTERVAL 1 WEEK))";
            case 'this_month':
                return "YEAR(s.sale_date) = YEAR(NOW()) AND MONTH(s.sale_date) = MONTH(NOW())";
            case 'last_month':
                return "YEAR(s.sale_date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND MONTH(s.sale_date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))";
            case 'this_year':
                return "YEAR(s.sale_date) = YEAR(NOW())";
            case 'last_30_days':
                return "s.sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            case 'last_90_days':
                return "s.sale_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
            default:
                return null;
        }
    }
    
    /**
     * Formatear respuesta de venta
     */
    private function formatSaleResponse(array $sale): array {
        // Convertir tipos numéricos
        $numeric_fields = ['id', 'customer_id', 'subtotal', 'tax_amount', 'discount_amount', 'total', 'sold_by', 'total_items', 'total_quantity'];
        foreach ($numeric_fields as $field) {
            if (isset($sale[$field])) {
                $sale[$field] = is_numeric($sale[$field]) ? (float)$sale[$field] : null;
            }
        }
        
        // Formatear fecha
        if (isset($sale['sale_date'])) {
            $sale['sale_date_formatted'] = date('d/m/Y H:i', strtotime($sale['sale_date']));
        }
        
        // Agregar enlaces útiles
        $sale['links'] = [
            'self' => "/api/sales/get.php?id={$sale['id']}",
            'items' => "/api/sales/get.php?id={$sale['id']}&include_items=1",
            'receipt' => "/api/sales/receipt.php?id={$sale['id']}",
            'update' => "/api/sales/put.php?id={$sale['id']}",
            'cancel' => "/api/sales/put.php?id={$sale['id']}&action=cancel"
        ];
        
        return $sale;
    }
    
    /**
     * Obtener estadísticas de ventas
     */
    private function getSalesStatistics(array $params, string $base_query): array {
        try {
            // Estadísticas básicas
            $stats_query = "
                SELECT 
                    COUNT(*) as total_sales,
                    SUM(s.total) as total_revenue,
                    AVG(s.total) as avg_sale_amount,
                    MIN(s.total) as min_sale_amount,
                    MAX(s.total) as max_sale_amount,
                    SUM(s.total_items) as total_items_sold,
                    SUM(s.total_quantity) as total_quantity_sold
                " . $base_query;
                
            $stats = Database::fetchOne($stats_query, $params);
            
            // Ventas por método de pago
            $payment_methods_query = "
                SELECT 
                    s.payment_method,
                    COUNT(*) as count,
                    SUM(s.total) as total_amount,
                    AVG(s.total) as avg_amount
                " . $base_query . "
                GROUP BY s.payment_method
                ORDER BY total_amount DESC
            ";
            
            $payment_methods = Database::fetchAll($payment_methods_query, $params);
            
            // Ventas por estado
            $status_stats_query = "
                SELECT 
                    s.sale_status,
                    COUNT(*) as count,
                    SUM(s.total) as total_amount
                " . $base_query . "
                GROUP BY s.sale_status
            ";
            
            $status_stats = Database::fetchAll($status_stats_query, $params);
            
            // Top vendedores
            $top_sellers_query = "
                SELECT 
                    s.seller_name,
                    s.sold_by,
                    COUNT(*) as sales_count,
                    SUM(s.total) as total_revenue,
                    AVG(s.total) as avg_sale_amount
                " . $base_query . "
                AND s.seller_name IS NOT NULL
                GROUP BY s.sold_by, s.seller_name
                ORDER BY total_revenue DESC
                LIMIT 5
            ";
            
            $top_sellers = Database::fetchAll($top_sellers_query, $params);
            
            // Ventas por día (últimos 30 días si no hay filtro específico)
            $daily_sales_query = "
                SELECT 
                    DATE(s.sale_date) as sale_date,
                    COUNT(*) as sales_count,
                    SUM(s.total) as daily_revenue
                " . $base_query . "
                AND s.sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(s.sale_date)
                ORDER BY sale_date DESC
                LIMIT 30
            ";
            
            $daily_sales = Database::fetchAll($daily_sales_query, $params);
            
            return [
                'summary' => [
                    'total_sales' => (int)$stats['total_sales'],
                    'total_revenue' => round((float)$stats['total_revenue'], 2),
                    'avg_sale_amount' => round((float)$stats['avg_sale_amount'], 2),
                    'min_sale_amount' => round((float)$stats['min_sale_amount'], 2),
                    'max_sale_amount' => round((float)$stats['max_sale_amount'], 2),
                    'total_items_sold' => (int)$stats['total_items_sold'],
                    'total_quantity_sold' => (int)$stats['total_quantity_sold']
                ],
                'payment_methods' => $payment_methods,
                'status_distribution' => $status_stats,
                'top_sellers' => $top_sellers,
                'daily_sales' => array_reverse($daily_sales) // Orden cronológico
            ];
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting sales statistics: " . $e->getMessage());
            return [];
        }
    }
}

/**
 * Endpoint para obtener una venta específica con detalles
 * GET /api/sales/get.php?id=123
 */
class SingleSaleAPI extends ApiBase {
    
    public function getSaleById(int $id): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager', 'employee']);
            
            // Rate limiting
            $this->checkRateLimit('sale_detail:' . $user['id'], 200, 3600);
            
            // Obtener venta básica
            $sale_query = "
                SELECT s.*, c.customer_type, c.city as customer_city, c.address as customer_address,
                       u.full_name as seller_name, u.email as seller_email
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN users u ON s.sold_by = u.id
                WHERE s.id = :id
            ";
            
            $sale = Database::fetchOne($sale_query, ['id' => $id]);
            
            if (!$sale) {
                $this->sendError(404, 'Venta no encontrada', ['id' => $id]);
            }
            
            // Verificar permisos: empleados solo pueden ver sus propias ventas
            if ($user['role'] === 'employee' && $sale['sold_by'] != $user['id']) {
                $this->sendError(403, 'No tienes permisos para ver esta venta');
            }
            
            // Formatear venta
            $formatted_sale = $this->formatSaleResponse($sale);
            
            // Obtener items de la venta si se solicitan
            $include_items = isset($_GET['include_items']) && $_GET['include_items'] == '1';
            if ($include_items) {
                $formatted_sale['items'] = $this->getSaleItems($id);
            }
            
            // Obtener historial de cambios si se solicita
            $include_history = isset($_GET['include_history']) && $_GET['include_history'] == '1';
            if ($include_history) {
                $formatted_sale['history'] = $this->getSaleHistory($id);
            }
            
            $this->sendSuccess($formatted_sale, 200, 'Venta encontrada');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting sale by ID: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    /**
     * Obtener items de una venta
     */
    private function getSaleItems(int $sale_id): array {
        $items_query = "
            SELECT si.*, p.name as current_product_name, p.stock as current_stock,
                   p.status as product_status
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = :sale_id
            ORDER BY si.id
        ";
        
        $items = Database::fetchAll($items_query, ['sale_id' => $sale_id]);
        
        // Formatear items
        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['product_id'] = (int)$item['product_id'];
            $item['quantity'] = (int)$item['quantity'];
            $item['unit_price'] = (float)$item['unit_price'];
            $item['unit_cost'] = (float)$item['unit_cost'];
            $item['discount_percentage'] = (float)$item['discount_percentage'];
            $item['discount_amount'] = (float)$item['discount_amount'];
            $item['subtotal'] = (float)$item['subtotal'];
            
            // Información adicional del producto actual
            $item['product_info'] = [
                'current_name' => $item['current_product_name'],
                'current_stock' => (int)$item['current_stock'],
                'status' => $item['product_status'],
                'name_changed' => $item['current_product_name'] !== $item['product_name'],
                'still_exists' => !is_null($item['current_product_name'])
            ];
            
            // Limpiar campos redundantes
            unset($item['current_product_name'], $item['current_stock'], $item['product_status']);
        }
        
        return $items;
    }
    
    /**
     * Obtener historial de cambios de una venta
     */
    private function getSaleHistory(int $sale_id): array {
        // En un sistema más avanzado, tendrías una tabla de audit_log
        // Por ahora, simular con datos básicos
        return [
            [
                'action' => 'created',
                'timestamp' => date('Y-m-d H:i:s'),
                'user' => 'Sistema',
                'details' => 'Venta creada'
            ]
        ];
    }
    
    private function formatSaleResponse(array $sale): array {
        // Similar al método en SalesGetAPI pero con más detalles
        $numeric_fields = ['id', 'customer_id', 'subtotal', 'tax_rate', 'tax_amount', 'discount_amount', 'total', 'sold_by'];
        foreach ($numeric_fields as $field) {
            if (isset($sale[$field])) {
                $sale[$field] = is_numeric($sale[$field]) ? (float)$sale[$field] : null;
            }
        }
        
        // Formatear fechas
        if (isset($sale['sale_date'])) {
            $sale['sale_date_formatted'] = date('d/m/Y H:i:s', strtotime($sale['sale_date']));
        }
        
        // Agregar información de cliente
        $sale['customer_info'] = [
            'id' => $sale['customer_id'],
            'name' => $sale['customer_name'],
            'phone' => $sale['customer_phone'],
            'email' => $sale['customer_email'],
            'type' => $sale['customer_type'] ?? 'individual',
            'city' => $sale['customer_city'],
            'address' => $sale['customer_address']
        ];
        
        // Información del vendedor
        $sale['seller_info'] = [
            'id' => $sale['sold_by'],
            'name' => $sale['seller_name'],
            'email' => $sale['seller_email']
        ];
        
        return $sale;
    }
}

/**
 * Endpoint para estadísticas rápidas de ventas
 * GET /api/sales/get.php?stats_only=1
 */
class SalesStatsAPI extends ApiBase {
    
    public function getQuickStats(): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager']);
            
            // Stats generales
            $general_stats = $this->getGeneralStats($user);
            
            // Stats por período
            $period_stats = $this->getPeriodStats($user);
            
            // Top productos
            $top_products = $this->getTopProducts($user);
            
            // Tendencias
            $trends = $this->getTrends($user);
            
            $this->sendSuccess([
                'general' => $general_stats,
                'periods' => $period_stats,
                'top_products' => $top_products,
                'trends' => $trends,
                'generated_at' => date('Y-m-d H:i:s')
            ], 200, 'Estadísticas obtenidas');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting sales stats: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function getGeneralStats(array $user): array {
        $where_clause = $user['role'] === 'employee' ? "WHERE sold_by = {$user['id']}" : "";
        
        $query = "
            SELECT 
                COUNT(*) as total_sales,
                SUM(total) as total_revenue,
                AVG(total) as avg_sale,
                COUNT(DISTINCT customer_name) as unique_customers,
                SUM(CASE WHEN sale_status = 'completed' THEN 1 ELSE 0 END) as completed_sales,
                SUM(CASE WHEN sale_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_sales
            FROM sales 
            $where_clause
        ";
        
        return Database::fetchOne($query) ?: [];
    }
    
    private function getPeriodStats(array $user): array {
        $where_clause = $user['role'] === 'employee' ? "AND sold_by = {$user['id']}" : "";
        
        $periods = [
            'today' => "DATE(sale_date) = CURDATE()",
            'this_week' => "YEARWEEK(sale_date) = YEARWEEK(NOW())",
            'this_month' => "YEAR(sale_date) = YEAR(NOW()) AND MONTH(sale_date) = MONTH(NOW())",
            'this_year' => "YEAR(sale_date) = YEAR(NOW())"
        ];
        
        $stats = [];
        
        foreach ($periods as $period => $condition) {
            $query = "
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(total), 0) as revenue
                FROM sales 
                WHERE $condition $where_clause
            ";
            
            $stats[$period] = Database::fetchOne($query);
        }
        
        return $stats;
    }
    
    private function getTopProducts(array $user): array {
        $where_clause = $user['role'] === 'employee' ? "AND s.sold_by = {$user['id']}" : "";
        
        $query = "
            SELECT 
                si.product_name,
                SUM(si.quantity) as total_quantity,
                SUM(si.subtotal) as total_revenue,
                COUNT(DISTINCT s.id) as times_sold
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE s.sale_status = 'completed' $where_clause
            GROUP BY si.product_id, si.product_name
            ORDER BY total_revenue DESC
            LIMIT 10
        ";
        
        return Database::fetchAll($query);
    }
    
    private function getTrends(array $user): array {
        $where_clause = $user['role'] === 'employee' ? "AND sold_by = {$user['id']}" : "";
        
        $query = "
            SELECT 
                DATE(sale_date) as date,
                COUNT(*) as sales_count,
                SUM(total) as daily_revenue
            FROM sales
            WHERE sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) $where_clause
            GROUP BY DATE(sale_date)
            ORDER BY date DESC
            LIMIT 30
        ";
        
        return Database::fetchAll($query);
    }
}

// Manejar diferentes tipos de requests
if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $single_api = new SingleSaleAPI();
    $single_api->getSaleById((int)$_GET['id']);
} elseif (isset($_GET['stats_only']) && $_GET['stats_only'] == '1') {
    $stats_api = new SalesStatsAPI();
    $stats_api->getQuickStats();
} else {
    new SalesGetAPI();
}