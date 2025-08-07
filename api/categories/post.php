// api/categories/post.php
class CategoriesCreateAPI extends ApiBase {
    
    private array $user;
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'POST':
                $this->createCategory();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function createCategory(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager']);
            
            // Rate limiting
            $this->checkRateLimit('category_create:' . $this->user['id'], 20, 3600);
            
            // Validar campos requeridos
            $this->validateRequiredFields(['name']);
            
            $input = $this->sanitizeInput($this->input);
            
            // Validar nombre único
            $existing = Database::fetchOne(
                "SELECT id FROM categories WHERE name = :name",
                ['name' => $input['name']]
            );
            
            if ($existing) {
                $this->sendError(400, 'Ya existe una categoría con ese nombre');
            }
            
            // Preparar datos
            $category_data = [
                'name' => $input['name'],
                'slug' => ApiUtils::generateSlug($input['name'], 'categories'),
                'description' => $input['description'] ?? null,
                'icon' => $input['icon'] ?? 'fas fa-tag',
                'status' => $input['status'] ?? 'active'
            ];
            
            // Crear categoría
            $query = "
                INSERT INTO categories (name, slug, description, icon, status)
                VALUES (:name, :slug, :description, :icon, :status)
            ";
            
            Database::execute($query, $category_data);
            $category_id = (int)Database::getLastInsertId();
            
            // Obtener categoría creada
            $created_category = Database::fetchOne(
                "SELECT * FROM categories WHERE id = :id",
                ['id' => $category_id]
            );
            
            // Log de actividad
            $this->logActivity('category_created', [
                'category_id' => $category_id,
                'category_name' => $category_data['name']
            ], $this->user['id']);
            
            $this->sendSuccess([
                'category' => $created_category,
                'message' => 'Categoría creada exitosamente'
            ], 201, 'Categoría creada exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error creating category: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
}