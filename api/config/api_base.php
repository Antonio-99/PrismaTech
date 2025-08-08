
    <?php
/**
 * ============================================
 * PrismaTech API - Base Configuration
 * Configuración base para todos los endpoints
 * ============================================
 */

// Definir constante de acceso ANTES de incluir database.php
if (!defined('PRISMATECH_ACCESS')) {
    define('PRISMATECH_ACCESS', true);
}

// Incluir configuración de base de datos
require_once __DIR__ . '/../../config/database.php';

/**
 * Clase base para API REST
 */
class ApiBase {
    
    protected PDO $db;
    protected array $headers;
    protected string $method;
    protected array $input;
    
    public function __construct() {
        $this->setHeaders();
        $this->db = Database::getConnection();
        $this->method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $this->parseInput();
        $this->validateRequest();
    }
    
    /**
     * Configurar headers CORS y Content-Type
     */
    private function setHeaders(): void {
        // CORS Headers
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Content-Type: application/json; charset=UTF-8');
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
        
        // Security headers
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
    }
    
    /**
     * Parsear input según método HTTP
     */
    private function parseInput(): void {
        switch ($this->method) {
            case 'GET':
                $this->input = $_GET;
                break;
                
            case 'POST':
            case 'PUT':
            case 'DELETE':
                $raw_input = file_get_contents('php://input');
                if (!empty($raw_input)) {
                    $this->input = json_decode($raw_input, true) ?? [];
                } else {
                    $this->input = $_POST;
                }
                break;
                
            default:
                $this->input = [];
        }
    }
    
    /**
     * Validar request básico
     */
    private function validateRequest(): void {
        // Validar Content-Type para requests con body
        if (in_array($this->method, ['POST', 'PUT']) && !empty(file_get_contents('php://input'))) {
            $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
            if (!str_contains($content_type, 'application/json') && !str_contains($content_type, 'application/x-www-form-urlencoded')) {
                $this->sendError(400, 'Content-Type debe ser application/json');
            }
        }
    }
    
    /**
     * Enviar respuesta de éxito
     */
    protected function sendSuccess(mixed $data = null, int $code = 200, string $message = 'success'): void {
        http_response_code($code);
        
        $response = [
            'success' => true,
            'message' => $message,
            'timestamp' => date('c'),
            'method' => $this->method
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
    
    /**
     * Enviar respuesta de error
     */
    protected function sendError(int $code, string $message, mixed $details = null): void {
        http_response_code($code);
        
        $response = [
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'timestamp' => date('c'),
                'method' => $this->method,
                'endpoint' => $_SERVER['REQUEST_URI'] ?? 'unknown'
            ]
        ];
        
        if ($details !== null) {
            $response['error']['details'] = $details;
        }
        
        // Log error for debugging
        error_log("[PrismaTech API] Error $code: $message");
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
    
    /**
     * Validar parámetros requeridos
     */
    protected function validateRequiredFields(array $required_fields): void {
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (!isset($this->input[$field]) || 
                (is_string($this->input[$field]) && trim($this->input[$field]) === '')) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            $this->sendError(400, 'Campos requeridos faltantes', [
                'missing_fields' => $missing_fields,
                'required_fields' => $required_fields
            ]);
        }
    }
    
    /**
     * Sanitizar input
     */
    protected function sanitizeInput(array $input): array {
        $sanitized = [];
        
        foreach ($input as $key => $value) {
            if (is_string($value)) {
                $sanitized[$key] = trim(htmlspecialchars($value, ENT_QUOTES, 'UTF-8'));
            } elseif (is_array($value)) {
                $sanitized[$key] = $this->sanitizeInput($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Validar email
     */
    protected function validateEmail(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Validar número de teléfono mexicano
     */
    protected function validateMexicanPhone(string $phone): bool {
        // Remover espacios, guiones y paréntesis
        $clean_phone = preg_replace('/[\s\-\(\)]/', '', $phone);
        
        // Validar formato mexicano (10 dígitos o 12 con código de país)
        return preg_match('/^(\+52|52)?[0-9]{10}$/', $clean_phone);
    }
    
    /**
     * Validar y convertir ID
     */
    protected function validateId(mixed $id): int {
        if (!is_numeric($id) || (int)$id <= 0) {
            $this->sendError(400, 'ID inválido', ['provided_id' => $id]);
        }
        
        return (int)$id;
    }
    
    /**
     * Obtener parámetros de paginación
     */
    protected function getPaginationParams(): array {
        $page = max(1, (int)($this->input['page'] ?? 1));
        $limit = min(100, max(10, (int)($this->input['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset
        ];
    }
    
    /**
     * Obtener parámetros de ordenamiento
     */
    protected function getSortParams(array $allowed_fields): array {
        $sort_by = $this->input['sort_by'] ?? 'id';
        $sort_order = strtoupper($this->input['sort_order'] ?? 'ASC');
        
        // Validar campo de ordenamiento
        if (!in_array($sort_by, $allowed_fields)) {
            $sort_by = $allowed_fields[0] ?? 'id';
        }
        
        // Validar orden
        if (!in_array($sort_order, ['ASC', 'DESC'])) {
            $sort_order = 'ASC';
        }
        
        return [
            'sort_by' => $sort_by,
            'sort_order' => $sort_order
        ];
    }
    
    /**
     * Autenticar usuario admin
     */
    protected function authenticateAdmin(): array {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($auth_header)) {
            $this->sendError(401, 'Token de autenticación requerido');
        }
        
        if (!str_starts_with($auth_header, 'Bearer ')) {
            $this->sendError(401, 'Formato de token inválido');
        }
        
        $token = substr($auth_header, 7);
        
        try {
            // Verificar token en base de datos
            $query = "SELECT u.*, s.expires_at 
                     FROM user_sessions s 
                     JOIN users u ON s.user_id = u.id 
                     WHERE s.id = :token AND s.is_active = 1 AND s.expires_at > NOW()";
                     
            $user = Database::fetchOne($query, ['token' => $token]);
            
            if (!$user) {
                $this->sendError(401, 'Token inválido o expirado');
            }
            
            // Actualizar última actividad
            Database::execute(
                "UPDATE user_sessions SET last_activity = NOW() WHERE id = :token",
                ['token' => $token]
            );
            
            return $user;
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Auth error: " . $e->getMessage());
            $this->sendError(500, 'Error de autenticación');
        }
    }
    
    /**
     * Verificar permisos de rol
     */
    protected function checkPermissions(array $user, array $allowed_roles): void {
        if (!in_array($user['role'], $allowed_roles)) {
            $this->sendError(403, 'Permisos insuficientes', [
                'user_role' => $user['role'],
                'required_roles' => $allowed_roles
            ]);
        }
    }
    
    /**
     * Log de actividad
     */
    protected function logActivity(string $action, array $data = [], int $user_id = null): void {
        try {
            $log_data = [
                'action' => $action,
                'user_id' => $user_id,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                'data' => json_encode($data),
                'endpoint' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                'method' => $this->method,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            // En un sistema más avanzado, esto iría a una tabla de logs
            error_log("[PrismaTech Activity] " . json_encode($log_data));
            
        } catch (Exception $e) {
            // No fallar por errores de logging
            error_log("[PrismaTech] Logging error: " . $e->getMessage());
        }
    }
    
    /**
     * Rate limiting básico
     */
    protected function checkRateLimit(string $identifier, int $max_requests = 60, int $window = 3600): void {
        $cache_key = "rate_limit:" . md5($identifier . floor(time() / $window));
        
        // En un sistema real, usarías Redis o Memcached
        // Por ahora, implementación básica con archivos
        $cache_file = sys_get_temp_dir() . "/" . $cache_key;
        $current_requests = 0;
        
        if (file_exists($cache_file)) {
            $current_requests = (int)file_get_contents($cache_file);
        }
        
        if ($current_requests >= $max_requests) {
            $this->sendError(429, 'Límite de requests excedido', [
                'max_requests' => $max_requests,
                'window_seconds' => $window,
                'retry_after' => $window - (time() % $window)
            ]);
        }
        
        file_put_contents($cache_file, $current_requests + 1);
    }
}

/**
 * Clase para manejo de respuestas paginadas
 */
class PaginatedResponse {
    
    public static function create(
        array $data,
        int $total,
        int $page,
        int $limit,
        string $base_url = ''
    ): array {
        $total_pages = (int)ceil($total / $limit);
        $has_next = $page < $total_pages;
        $has_prev = $page > 1;
        
        return [
            'data' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => $total,
                'total_pages' => $total_pages,
                'has_next' => $has_next,
                'has_prev' => $has_prev,
                'next_page' => $has_next ? $page + 1 : null,
                'prev_page' => $has_prev ? $page - 1 : null,
                'links' => [
                    'first' => $base_url . "?page=1&limit=$limit",
                    'last' => $base_url . "?page=$total_pages&limit=$limit",
                    'next' => $has_next ? $base_url . "?page=" . ($page + 1) . "&limit=$limit" : null,
                    'prev' => $has_prev ? $base_url . "?page=" . ($page - 1) . "&limit=$limit" : null
                ]
            ]
        ];
    }
}

/**
 * Funciones de utilidad para API
 */
class ApiUtils {
    
    /**
     * Generar slug único
     */
    public static function generateSlug(string $text, string $table, string $field = 'slug'): string {
        $slug = self::createSlug($text);
        $original_slug = $slug;
        $counter = 1;
        
        // Verificar si el slug ya existe
        while (self::slugExists($slug, $table, $field)) {
            $slug = $original_slug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }
    
    private static function createSlug(string $text): string {
        // Convertir a minúsculas
        $slug = strtolower($text);
        
        // Reemplazar caracteres especiales
        $slug = str_replace(['á', 'é', 'í', 'ó', 'ú', 'ñ'], ['a', 'e', 'i', 'o', 'u', 'n'], $slug);
        
        // Remover caracteres no alfanuméricos
        $slug = preg_replace('/[^a-z0-9\-]/', '-', $slug);
        
        // Remover guiones múltiples
        $slug = preg_replace('/-+/', '-', $slug);
        
        // Remover guiones del inicio y final
        $slug = trim($slug, '-');
        
        return $slug;
    }
    
    private static function slugExists(string $slug, string $table, string $field): bool {
        try {
            $query = "SELECT COUNT(*) as count FROM `$table` WHERE `$field` = :slug";
            $result = Database::fetchOne($query, ['slug' => $slug]);
            return $result['count'] > 0;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Generar SKU único
     */
    public static function generateSKU(string $category, string $brand = ''): string {
        $prefix = strtoupper(substr($category, 0, 3));
        if ($brand) {
            $prefix .= '-' . strtoupper(substr($brand, 0, 3));
        }
        
        $suffix = strtoupper(substr(uniqid(), -6));
        return $prefix . '-' . $suffix;
    }
    
    /**
     * Validar estructura de producto
     */
    public static function validateProductStructure(array $product): array {
        $errors = [];
        
        if (empty($product['name']) || strlen($product['name']) < 3) {
            $errors[] = 'Nombre debe tener al menos 3 caracteres';
        }
        
        if (empty($product['category_id']) || !is_numeric($product['category_id'])) {
            $errors[] = 'ID de categoría inválido';
        }
        
        if (empty($product['price']) || !is_numeric($product['price']) || $product['price'] <= 0) {
            $errors[] = 'Precio debe ser un número mayor a 0';
        }
        
        if (isset($product['stock']) && (!is_numeric($product['stock']) || $product['stock'] < 0)) {
            $errors[] = 'Stock debe ser un número mayor o igual a 0';
        }
        
        return $errors;
    }
    
    /**
     * Formatear producto para respuesta
     */
    public static function formatProductResponse(array $product): array {
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
        
        return $product;
    }
}