<?php
/**
 * ============================================
 * PrismaTech API - Complementary APIs
 * APIs para categorías, clientes y reportes
 * ============================================
 */

// api/categories/get.php
require_once __DIR__ . '/../config/api_base.php';

class CategoriesGetAPI extends ApiBase {
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'GET':
                $this->getCategories();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function getCategories(): void {
        try {
            // Rate limiting permisivo para categorías
            $client_ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $this->checkRateLimit('categories_get:' . $client_ip, 200, 3600);
            
            // Obtener parámetros de paginación
            $pagination = $this->getPaginationParams();
            
            // Query base
            $base_query = "FROM categories WHERE 1=1";
            $params = [];
            
            // Filtro por estado
            if (!empty($this->input['status'])) {
                $base_query .= " AND status = :status";
                $params['status'] = $this->input['status'];
            } else {
                $base_query .= " AND status = 'active'";
            }
            
            // Búsqueda por nombre
            if (!empty($this->input['search'])) {
                $base_query .= " AND (name LIKE :search OR description LIKE :search)";
                $params['search'] = '%' . $this->input['search'] . '%';
            }
            
            // Contar total
            $count_query = "SELECT COUNT(*) as total " . $base_query;
            $total_result = Database::fetchOne($count_query, $params);
            $total = (int)$total_result['total'];
            
            // Obtener categorías con contador de productos
            $data_query = "
                SELECT c.*, 
                       COUNT(p.id) as products_count,
                       COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_products_count
                " . $base_query . "
                LEFT JOIN products p ON c.id = p.category_id
                GROUP BY c.id
                ORDER BY c.name ASC
                LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
            ";
            
            $categories = Database::fetchAll($data_query, $params);
            
            // Formatear categorías
            $formatted_categories = array_map(function($category) {
                return [
                    'id' => (int)$category['id'],
                    'name' => $category['name'],
                    'slug' => $category['slug'],
                    'description' => $category['description'],
                    'icon' => $category['icon'],
                    'status' => $category['status'],
                    'products_count' => (int)$category['products_count'],
                    'active_products_count' => (int)$category['active_products_count'],
                    'created_at' => $category['created_at'],
                    'updated_at' => $category['updated_at']
                ];
            }, $categories);
            
            // Crear respuesta paginada
            $response_data = PaginatedResponse::create(
                $formatted_categories,
                $total,
                $pagination['page'],
                $pagination['limit'],
                '/api/categories/get.php'
            );
            
            $this->sendSuccess($response_data, 200, 'Categorías obtenidas exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting categories: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
}
