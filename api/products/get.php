<?php
/**
 * ============================================
 * PrismaTech API - Get Products
 * Endpoint para obtener productos
 * GET /api/products/get.php
 * ============================================
 */

require_once __DIR__ . '/../config/api_base.php';

class ProductsGetAPI extends ApiBase {
    
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
                $this->getProducts();
                break;
                
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    /**
     * Obtener productos con filtros y paginación
     */
    private function getProducts(): void {
        try {
            // Obtener parámetros de paginación
            $pagination = $this->getPaginationParams();
            
            // Obtener parámetros de ordenamiento
            $allowed_sort_fields = ['id', 'name', 'price', 'stock', 'created_at', 'category_name'];
            $sort = $this->getSortParams($allowed_sort_fields);
            
            // Construir query base con JOIN para categoría
            $base_query = "
                FROM v_products_extended p 
                WHERE p.status = 'active'
            ";
            
            $where_conditions = [];
            $params = [];
            
            // Filtro por categoría
            if (!empty($this->input['category'])) {
                $where_conditions[] = "p.category_slug = :category";
                $params['category'] = $this->input['category'];
            }
            
            if (!empty($this->input['category_id'])) {
                $where_conditions[] = "p.category_id = :category_id";
                $params['category_id'] = (int)$this->input['category_id'];
            }
            
            // Filtro por búsqueda de texto
            if (!empty($this->input['search'])) {
                $search_term = '%' . $this->input['search'] . '%';
                $where_conditions[] = "(
                    p.name LIKE :search OR 
                    p.description LIKE :search OR 
                    p.brand LIKE :search OR
                    p.category_name LIKE :search
                )";
                $params['search'] = $search_term;
            }
            
            // Filtro por marca
            if (!empty($this->input['brand'])) {
                $where_conditions[] = "p.brand = :brand";
                $params['brand'] = $this->input['brand'];
            }
            
            // Filtro por rango de precios
            if (!empty($this->input['min_price']) && is_numeric($this->input['min_price'])) {
                $where_conditions[] = "p.price >= :min_price";
                $params['min_price'] = (float)$this->input['min_price'];
            }
            
            if (!empty($this->input['max_price']) && is_numeric($this->input['max_price'])) {
                $where_conditions[] = "p.price <= :max_price";
                $params['max_price'] = (float)$this->input['max_price'];
            }
            
            // Filtro por disponibilidad de stock
            if (isset($this->input['in_stock'])) {
                if ($this->input['in_stock'] === '1' || $this->input['in_stock'] === 'true') {
                    $where_conditions[] = "p.stock > 0";
                } elseif ($this->input['in_stock'] === '0' || $this->input['in_stock'] === 'false') {
                    $where_conditions[] = "p.stock = 0";
                }
            }
            
            // Filtro por estado de stock
            if (!empty($this->input['stock_status'])) {
                switch ($this->input['stock_status']) {
                    case 'in_stock':
                        $where_conditions[] = "p.stock > p.min_stock";
                        break;
                    case 'low_stock':
                        $where_conditions[] = "p.stock <= p.min_stock AND p.stock > 0";
                        break;
                    case 'out_of_stock':
                        $where_conditions[] = "p.stock = 0";
                        break;
                }
            }
            
            // Filtro por productos destacados
            if (isset($this->input['featured'])) {
                if ($this->input['featured'] === '1' || $this->input['featured'] === 'true') {
                    $where_conditions[] = "p.featured = 1";
                }
            }
            
            // Agregar condiciones WHERE si existen
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
                    p.*,
                    CASE 
                        WHEN p.stock = 0 THEN 'out_of_stock'
                        WHEN p.stock <= p.min_stock THEN 'low_stock'
                        ELSE 'in_stock'
                    END as stock_status_text
                " . $base_query . "
                ORDER BY p.{$sort['sort_by']} {$sort['sort_order']}
                LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
            ";
            
            $products = Database::fetchAll($data_query, $params);
            
            // Formatear productos
            $formatted_products = array_map([ApiUtils::class, 'formatProductResponse'], $products);
            
            // Agregar información adicional
            foreach ($formatted_products as &$product) {
                // Calcular descuentos si aplica
                if ($product['cost_price'] > 0) {
                    $product['profit_margin'] = $product['price'] - $product['cost_price'];
                    $product['profit_percentage'] = round(($product['profit_margin'] / $product['cost_price']) * 100, 2);
                }
                
                // URLs de imagen (placeholder por ahora)
                $product['image_url'] = $product['image_url'] ?: '/images/products/placeholder.jpg';
                
                // Información de disponibilidad
                $product['availability'] = [
                    'in_stock' => $product['stock'] > 0,
                    'quantity' => $product['stock'],
                    'status' => $product['stock_status_text'],
                    'low_stock_threshold' => $product['min_stock']
                ];
            }
            
            // Obtener información adicional si es solicitada
            $include_stats = ($this->input['include_stats'] ?? false);
            $additional_data = [];
            
            if ($include_stats) {
                $additional_data['statistics'] = $this->getProductStatistics($params, $base_query);
            }
            
            // Crear respuesta paginada
            $response_data = PaginatedResponse::create(
                $formatted_products,
                $total,
                $pagination['page'],
                $pagination['limit'],
                '/api/products/get.php'
            );
            
            // Agregar datos adicionales
            if (!empty($additional_data)) {
                $response_data = array_merge($response_data, $additional_data);
            }
            
            $this->sendSuccess($response_data, 200, 'Productos obtenidos exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting products: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor', [
                'error_detail' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Obtener estadísticas de productos
     */
    private function getProductStatistics(array $params, string $base_query): array {
        try {
            // Total de productos
            $total_query = "SELECT COUNT(*) as total " . $base_query;
            $total_result = Database::fetchOne($total_query, $params);
            
            // Productos por estado de stock
            $stock_stats_query = "
                SELECT 
                    SUM(CASE WHEN p.stock > p.min_stock THEN 1 ELSE 0 END) as in_stock,
                    SUM(CASE WHEN p.stock <= p.min_stock AND p.stock > 0 THEN 1 ELSE 0 END) as low_stock,
                    SUM(CASE WHEN p.stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
                    AVG(p.price) as avg_price,
                    MIN(p.price) as min_price,
                    MAX(p.price) as max_price,
                    SUM(p.stock * p.price) as total_inventory_value
                " . $base_query;
                
            $stock_stats = Database::fetchOne($stock_stats_query, $params);
            
            // Top categorías
            $categories_query = "
                SELECT 
                    p.category_name,
                    p.category_slug,
                    COUNT(*) as product_count
                " . $base_query . "
                GROUP BY p.category_id, p.category_name, p.category_slug
                ORDER BY product_count DESC
                LIMIT 5
            ";
            
            $top_categories = Database::fetchAll($categories_query, $params);
            
            // Top marcas
            $brands_query = "
                SELECT 
                    p.brand,
                    COUNT(*) as product_count,
                    AVG(p.price) as avg_price
                " . $base_query . "
                AND p.brand IS NOT NULL AND p.brand != ''
                GROUP BY p.brand
                ORDER BY product_count DESC
                LIMIT 5
            ";
            
            $top_brands = Database::fetchAll($brands_query, $params);
            
            return [
                'total_products' => (int)$total_result['total'],
                'stock_distribution' => [
                    'in_stock' => (int)$stock_stats['in_stock'],
                    'low_stock' => (int)$stock_stats['low_stock'],
                    'out_of_stock' => (int)$stock_stats['out_of_stock']
                ],
                'price_range' => [
                    'min' => (float)$stock_stats['min_price'],
                    'max' => (float)$stock_stats['max_price'],
                    'average' => round((float)$stock_stats['avg_price'], 2)
                ],
                'total_inventory_value' => round((float)$stock_stats['total_inventory_value'], 2),
                'top_categories' => $top_categories,
                'top_brands' => $top_brands
            ];
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting statistics: " . $e->getMessage());
            return [];
        }
    }
}

// Manejar rate limiting básico
$client_ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Rate limit: 100 requests por hora por IP para GET (más permisivo para lectura)
try {
    $rate_limit_key = "products_get:" . $client_ip;
    $api = new ProductsGetAPI();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 500,
            'message' => 'Error interno del servidor'
        ]
    ]);
}

/**
 * Endpoint adicional para obtener un producto específico por ID o slug
 * GET /api/products/get.php?id=123
 * GET /api/products/get.php?slug=producto-ejemplo
 */
class SingleProductAPI extends ApiBase {
    
    public function getProductById(int $id): void {
        try {
            $query = "
                SELECT p.*, c.name as category_name, c.slug as category_slug
                FROM v_products_extended p
                WHERE p.id = :id AND p.status = 'active'
                LIMIT 1
            ";
            
            $product = Database::fetchOne($query, ['id' => $id]);
            
            if (!$product) {
                $this->sendError(404, 'Producto no encontrado', ['id' => $id]);
            }
            
            $formatted_product = ApiUtils::formatProductResponse($product);
            
            // Agregar información adicional
            $formatted_product['related_products'] = $this->getRelatedProducts($id, $product['category_id']);
            $formatted_product['availability'] = [
                'in_stock' => $product['stock'] > 0,
                'quantity' => $product['stock'],
                'status' => $product['stock_status'],
                'low_stock_threshold' => $product['min_stock']
            ];
            
            $this->sendSuccess($formatted_product, 200, 'Producto encontrado');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting product by ID: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    public function getProductBySlug(string $slug): void {
        try {
            $query = "
                SELECT p.*, c.name as category_name, c.slug as category_slug
                FROM v_products_extended p
                WHERE p.slug = :slug AND p.status = 'active'
                LIMIT 1
            ";
            
            $product = Database::fetchOne($query, ['slug' => $slug]);
            
            if (!$product) {
                $this->sendError(404, 'Producto no encontrado', ['slug' => $slug]);
            }
            
            $formatted_product = ApiUtils::formatProductResponse($product);
            
            // Agregar información adicional
            $formatted_product['related_products'] = $this->getRelatedProducts($product['id'], $product['category_id']);
            $formatted_product['availability'] = [
                'in_stock' => $product['stock'] > 0,
                'quantity' => $product['stock'],
                'status' => $product['stock_status'],
                'low_stock_threshold' => $product['min_stock']
            ];
            
            $this->sendSuccess($formatted_product, 200, 'Producto encontrado');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting product by slug: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function getRelatedProducts(int $product_id, int $category_id): array {
        try {
            $query = "
                SELECT id, name, slug, price, stock, image_url, stock_status
                FROM v_products_extended
                WHERE category_id = :category_id 
                AND id != :product_id 
                AND status = 'active'
                AND stock > 0
                ORDER BY featured DESC, RAND()
                LIMIT 4
            ";
            
            return Database::fetchAll($query, [
                'category_id' => $category_id,
                'product_id' => $product_id
            ]);
            
        } catch (Exception $e) {
            return [];
        }
    }
}

// Si se solicita un producto específico
if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $single_api = new SingleProductAPI();
    $single_api->getProductById((int)$_GET['id']);
} elseif (isset($_GET['slug']) && !empty($_GET['slug'])) {
    $single_api = new SingleProductAPI();
    $single_api->getProductBySlug($_GET['slug']);
}