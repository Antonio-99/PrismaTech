/ api/customers/post.php
class CustomersCreateAPI extends ApiBase {
    
    private array $user;
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'POST':
                $this->createCustomer();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function createCustomer(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager', 'employee']);
            
            // Rate limiting
            $this->checkRateLimit('customer_create:' . $this->user['id'], 30, 3600);
            
            // Validar campos requeridos
            $this->validateRequiredFields(['name']);
            
            $input = $this->sanitizeInput($this->input);
            
            // Validaciones
            if (!empty($input['email'])) {
                if (!$this->validateEmail($input['email'])) {
                    $this->sendError(400, 'Email inválido');
                }
                
                // Verificar email único
                $existing_email = Database::fetchOne(
                    "SELECT id FROM customers WHERE email = :email",
                    ['email' => $input['email']]
                );
                
                if ($existing_email) {
                    $this->sendError(400, 'Ya existe un cliente con ese email');
                }
            }
            
            if (!empty($input['phone']) && !$this->validateMexicanPhone($input['phone'])) {
                $this->sendError(400, 'Formato de teléfono inválido');
            }
            
            // Preparar datos
            $customer_data = [
                'name' => $input['name'],
                'email' => $input['email'] ?? null,
                'phone' => $input['phone'] ?? null,
                'address' => $input['address'] ?? null,
                'city' => $input['city'] ?? null,
                'state' => $input['state'] ?? null,
                'postal_code' => $input['postal_code'] ?? null,
                'tax_id' => $input['tax_id'] ?? null,
                'customer_type' => $input['customer_type'] ?? 'individual',
                'credit_limit' => (float)($input['credit_limit'] ?? 0),
                'status' => $input['status'] ?? 'active',
                'notes' => $input['notes'] ?? null
            ];
            
            // Crear cliente
            $query = "
                INSERT INTO customers (
                    name, email, phone, address, city, state, postal_code,
                    tax_id, customer_type, credit_limit, status, notes
                ) VALUES (
                    :name, :email, :phone, :address, :city, :state, :postal_code,
                    :tax_id, :customer_type, :credit_limit, :status, :notes
                )
            ";
            
            Database::execute($query, $customer_data);
            $customer_id = (int)Database::getLastInsertId();
            
            // Obtener cliente creado
            $created_customer = Database::fetchOne(
                "SELECT * FROM customers WHERE id = :id",
                ['id' => $customer_id]
            );
            
            // Log de actividad
            $this->logActivity('customer_created', [
                'customer_id' => $customer_id,
                'customer_name' => $customer_data['name']
            ], $this->user['id']);
            
            $this->sendSuccess([
                'customer' => $created_customer,
                'message' => 'Cliente creado exitosamente'
            ], 201, 'Cliente creado exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error creating customer: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
}
