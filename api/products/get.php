<?php
/**
 * ============================================
 * PrismaTech API - Get Products
 * Endpoint para obtener productos con búsqueda por número de parte
 * GET /api/products/get.php
 * ============================================
 */

// Definir constante de acceso
if (!defined('PRISMATECH_ACCESS')) {
    define('PRISMATECH_ACCESS', true);
}

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
        // Verificar si se solicita un producto específico
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $this->getProductById((int)$_GET['id']);
        } elseif (isset($_GET['slug']) && !empty($_GET['slug'])) {
            $this->getProductBySlug($_GET['slug']);
        } elseif (isset($_GET['part_number']) && !empty($_GET['part_number'])) {
            $this->getProductByPartNumber($_GET['part_number']);
        } else {
            $this->getProducts();
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
            $allowed_sort_fields = ['id', 'name', 'price', 'stock', 'created_at', 'category_name', 'part_number'];
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
            
            // BÚSQUEDA MEJORADA: Incluye número de parte
            if (!empty($this->input['search'])) {
                $search_term = '%' . $this->input['search'] . '%';
                $where_conditions[] = "(
                    p.name LIKE :search OR 
                    p.description LIKE :search OR 
                    p.brand LIKE :search OR
                    p.sku LIKE :search OR
                    p.part_number LIKE :search OR
                    p.category_name LIKE :search
                )";
                $params['search'] = $search_term;
            }
            
            // Búsqueda específica por número de parte
            if (!empty($this->input['search_part_number'])) {
                $part_number_search = '%' . $this->input['search_part_number'] . '%';
                $where_conditions[] = "p.part_number LIKE :part_number_search";
                $params['part_number_search'] = $part_number_search;
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
            $formatted_products = array_map([$this, 'formatProductResponse'], $products);
            
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
     * Obtener producto por ID
     */
    private function getProductById(int $id): void {
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
            
            $formatted_product = $this->formatProductResponse($product);
            $formatted_product['related_products'] = $this->getRelatedProducts($id, $product['category_id']);
            
            $this->sendSuccess($formatted_product, 200, 'Producto encontrado');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting product by ID: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    /**
     * Obtener producto por slug
     */
    private function getProductBySlug(string $slug): void {
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
            
            $formatted_product = $this->formatProductResponse($product);
            $formatted_product['related_products'] = $this->getRelatedProducts($product['id'], $product['category_id']);
            
            $this->sendSuccess($formatted_product, 200, 'Producto encontrado');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting product by slug: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    /**
     * NUEVO: Obtener producto por número de parte
     */
    private function getProductByPartNumber(string $partNumber): void {
        try {
            $query = "
                SELECT p.*, c.name as category_name, c.slug as category_slug
                FROM v_products_extended p
                WHERE p.part_number = :part_number AND p.status = 'active'
                LIMIT 1
            ";
            
            $product = Database::fetchOne($query, ['part_number' => $partNumber]);
            
            if (!$product) {
                $this->sendError(404, 'Producto no encontrado', ['part_number' => $partNumber]);
            }
            
            $formatted_product = $this->formatProductResponse($product);
            $formatted_product['related_products'] = $this->getRelatedProducts($product['id'], $product['category_id']);
            
            $this->sendSuccess($formatted_product, 200, 'Producto encontrado por número de parte');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting product by part number: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    /**
     * Formatear respuesta de producto
     */
    private function formatProductResponse(array $product): array {
        // Parsear JSON fields si existen
        if (isset($product['specifications']) && is_string($product['specifications'])) {
            $product['specifications'] = json_decode($product['specifications'], true) ?? [];
        }
        
        if (isset($product['compatibility']) && is_string($product['compatibility'])) {
            $product['compatibility'] = json_decode($product['compatibility'], true) ?? [];
        }
        
        if (isset($product['dimensions']) && is_string($product['dimensions'])) {
            $product['dimensions'] = json_decode($product['dimensions'], true) ?? [];
        }
        
        // Convertir tipos numéricos
        $numeric_fields = ['id', 'category_id', 'price', 'cost_price', 'stock', 'min_stock', 'max_stock', 'warranty_months'];
        foreach ($numeric_fields as $field) {
            if (isset($product[$field])) {
                $product[$field] = is_numeric($product[$field]) ? (float)$product[$field] : null;
            }
        }
        
        // Convertir booleanos
        if (isset($product['featured'])) {
            $product['featured'] = (bool)$product['featured'];
        }
        
        // Agregar información de disponibilidad
        $product['availability'] = [
            'in_stock' => $product['stock'] > 0,
            'quantity' => $product['stock'],
            'status' => $product['stock_status_text'] ?? $product['stock_status'] ?? 'unknown',
            'low_stock_threshold' => $product['min_stock']
        ];
        
        // URLs de imagen (placeholder por ahora)
        $product['image_url'] = $product['image_url'] ?: '/images/products/placeholder.jpg';
        
        return $product;
    }
    
    /**
     * Obtener productos relacionados
     */
    private function getRelatedProducts(int $product_id, int $category_id): array {
        try {
            $query = "
                SELECT id, name, slug, part_number, price, stock, image_url, stock_status
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
                'total_inventory_value' => round((float)$stock_stats['total_inventory_value'], 2)
            ];
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error getting statistics: " . $e->getMessage());
            return [];
        }
    }
}

// Instanciar API
new ProductsGetAPI();