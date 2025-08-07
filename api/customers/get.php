// api/customers/get.php
class CustomersGetAPI extends ApiBase {
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'GET':
                if (isset($_GET['id'])) {
                    $this->getCustomerById((int)$_GET['id']);
                } else {
                    $this->getCustomers();
                }
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function getCustomers(): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager', 'employee']);
            
            // Rate limiting
            $this->checkRateLimit('customers_get:' . $user['id'], 100, 3600);
            
            // Obtener parámetros de paginación
            $pagination = $this->getPaginationParams();
            
            // Obtener parámetros de ordenamiento
            $allowed_sort_fields = ['id', 'name', 'email', 'total_purchases', 'total_orders', 'created_at'];
            $sort = $this->getSortParams($allowed_sort_fields);
            
            // Query base
            $base_query = "FROM customers WHERE 1=1";
            $params = [];
            
            // Filtros
            if (!empty($this->input['search'])) {
                $search = '%' . $this->input['search'] . '%';
                $base_query .= " AND (name LIKE :search OR email LIKE :search OR phone LIKE :search)";
                $params['search'] = $search;
            }
            
            if (!empty($this->input['customer_type'])) {
                $base_query .= " AND customer_type = :customer_type";
                $params['customer_type'] = $this->input['customer_type'];
            }
            
            if (!empty($this->input['status'])) {
                $base_query .= " AND status = :status";
                $params['status'] = $this->input['status'];
            } else {
                $base_query .= " AND status = 'active'";
            }
            
            if (!empty($this->input['city'])) {
                $base_query .= " AND city = :city";
                $params['city'] = $this->input['city'];
            }
            
            // Contar total
            $count_query = "SELECT COUNT(*) as total " . $base_query;
            $total_result = Database::fetchOne($count_query, $params);
            $total = (int)$total_result['total'];
            
            // Obtener datos
            $data_query = "
                SELECT *
                " . $base_query . "
                ORDER BY {$sort['sort_by']} {$sort['sort_order']}
                LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
            ";
            
            $customers = Database::fetchAll($data_query, $params);
            
            // Formatear clientes
            $formatted_customers = array_map(function($customer) {
                return [
                    'id' => (int)$customer['id'],
                    'name' => $customer['name'],
                    'email' => $customer['email'],
                    'phone' => $customer['phone'],
                    'address' => $customer['address'],
                    'city' => $customer['city'],
                    'state' => $customer['state'],
                    'postal_code' => $customer['postal_code'],
                    'tax_id' => $customer['tax_id'],
                    'customer_type' => $customer['customer_type'],
                    'credit_limit' => (float)$customer['credit_limit'],
                    'total_purchases' => (float)$customer['total_purchases'],
                    'total_orders' => (int)$customer['total_orders'],
                    'status' => $customer['status'],
                    'notes' => $customer['notes'],
                    'created_at' => $customer['created_at'],
                    'updated_at' => $customer['updated_at']
                ];
            }, $customers);
            
            // Crear respuesta paginada
            $response_data = PaginatedResponse::create(
                $formatted_customers,
                $total,
                $pagination['page'],
                $pagination['limit'],
                '/api/customers/get.php'
            );
            
            $this->sendSuccess($response_data, 200, 'Clientes obtenidos exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting customers: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function getCustomerById(int $id): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager', 'employee']);
            
            // Obtener cliente con estadísticas
            $query = "
                SELECT c.*,
                       COUNT(s.id) as total_sales,
                       COALESCE(AVG(s.total), 0) as avg_purchase,
                       MAX(s.sale_date) as last_purchase_date
                FROM customers c
                LEFT JOIN sales s ON c.id = s.customer_id
                WHERE c.id = :id
                GROUP BY c.id
            ";
            
            $customer = Database::fetchOne($query, ['id' => $id]);
            
            if (!$customer) {
                $this->sendError(404, 'Cliente no encontrado');
            }
            
            // Obtener historial de compras recientes
            $purchases_query = "
                SELECT sale_number, sale_date, total, sale_status
                FROM sales
                WHERE customer_id = :id
                ORDER BY sale_date DESC
                LIMIT 10
            ";
            
            $recent_purchases = Database::fetchAll($purchases_query, ['id' => $id]);
            
            // Formatear respuesta
            $formatted_customer = [
                'id' => (int)$customer['id'],
                'name' => $customer['name'],
                'email' => $customer['email'],
                'phone' => $customer['phone'],
                'address' => $customer['address'],
                'city' => $customer['city'],
                'state' => $customer['state'],
                'postal_code' => $customer['postal_code'],
                'tax_id' => $customer['tax_id'],
                'customer_type' => $customer['customer_type'],
                'credit_limit' => (float)$customer['credit_limit'],
                'total_purchases' => (float)$customer['total_purchases'],
                'total_orders' => (int)$customer['total_orders'],
                'status' => $customer['status'],
                'notes' => $customer['notes'],
                'created_at' => $customer['created_at'],
                'updated_at' => $customer['updated_at'],
                'statistics' => [
                    'total_sales' => (int)$customer['total_sales'],
                    'avg_purchase' => round((float)$customer['avg_purchase'], 2),
                    'last_purchase_date' => $customer['last_purchase_date']
                ],
                'recent_purchases' => $recent_purchases
            ];
            
            $this->sendSuccess($formatted_customer, 200, 'Cliente encontrado');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting customer by ID: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
}
