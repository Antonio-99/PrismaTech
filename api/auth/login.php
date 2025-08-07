// api/auth/login.php
require_once __DIR__ . '/../config/api_base.php';

class AuthLoginAPI extends ApiBase {
    
    private string $jwtSecret;
    private int $tokenExpiry = 28800; // 8 horas
    
    public function __construct() {
        parent::__construct();
        $this->jwtSecret = $_ENV['JWT_SECRET'] ?? 'prismatech_secret_key_2025';
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'POST':
                $this->login();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function login(): void {
        try {
            // Rate limiting para intentos de login
            $client_ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $this->checkRateLimit('login_attempts:' . $client_ip, 10, 900); // 10 intentos por 15 min
            
            // Validar campos requeridos
            $this->validateRequiredFields(['username', 'password']);
            
            $input = $this->sanitizeInput($this->input);
            
            // Buscar usuario
            $user = $this->findUser($input['username']);
            
            if (!$user) {
                $this->logFailedAttempt($input['username'], $client_ip, 'user_not_found');
                $this->sendError(401, 'Credenciales inválidas');
            }
            
            // Verificar contraseña
            if (!password_verify($input['password'], $user['password_hash'])) {
                $this->logFailedAttempt($input['username'], $client_ip, 'invalid_password');
                $this->sendError(401, 'Credenciales inválidas');
            }
            
            // Verificar que el usuario esté activo
            if ($user['status'] !== 'active') {
                $this->logFailedAttempt($input['username'], $client_ip, 'inactive_user');
                $this->sendError(403, 'Usuario inactivo');
            }
            
            // Generar token JWT
            $token = $this->generateJWT($user);
            
            // Crear sesión en base de datos
            $session_id = $this->createUserSession($user['id'], $token, $client_ip);
            
            // Actualizar último login
            $this->updateLastLogin($user['id']);
            
            // Log de login exitoso
            $this->logActivity('user_login', [
                'user_id' => $user['id'],
                'username' => $user['username'],
                'ip_address' => $client_ip
            ], $user['id']);
            
            // Respuesta exitosa
            $this->sendSuccess([
                'token' => $token,
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'full_name' => $user['full_name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ],
                'expires_at' => date('Y-m-d H:i:s', time() + $this->tokenExpiry),
                'permissions' => $this->getUserPermissions($user['role'])
            ], 200, 'Login exitoso');
            
        } catch (Exception $e) {
            error_log("[PrismaTech Auth] Login error: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function findUser(string $username): ?array {
        $query = "
            SELECT id, username, password_hash, full_name, email, role, status, last_login
            FROM users 
            WHERE username = :username OR email = :username
            LIMIT 1
        ";
        
        return Database::fetchOne($query, ['username' => $username]);
    }
    
    private function generateJWT(array $user): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => (int)$user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + $this->tokenExpiry
        ]);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->jwtSecret, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }
    
    private function createUserSession(int $user_id, string $token, string $ip): string {
        $session_id = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', time() + $this->tokenExpiry);
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        $query = "
            INSERT INTO user_sessions (id, user_id, ip_address, user_agent, expires_at)
            VALUES (:id, :user_id, :ip_address, :user_agent, :expires_at)
        ";
        
        Database::execute($query, [
            'id' => $session_id,
            'user_id' => $user_id,
            'ip_address' => $ip,
            'user_agent' => $user_agent,
            'expires_at' => $expires_at
        ]);
        
        return $session_id;
    }
    
    private function updateLastLogin(int $user_id): void {
        Database::execute(
            "UPDATE users SET last_login = NOW() WHERE id = :id",
            ['id' => $user_id]
        );
    }
    
    private function getUserPermissions(string $role): array {
        $permissions = [
            'admin' => [
                'products' => ['create', 'read', 'update', 'delete'],
                'sales' => ['create', 'read', 'update', 'delete'],
                'customers' => ['create', 'read', 'update', 'delete'],
                'users' => ['create', 'read', 'update', 'delete'],
                'reports' => ['read'],
                'settings' => ['read', 'update']
            ],
            'manager' => [
                'products' => ['create', 'read', 'update'],
                'sales' => ['create', 'read', 'update'],
                'customers' => ['create', 'read', 'update'],
                'users' => ['read'],
                'reports' => ['read'],
                'settings' => ['read']
            ],
            'employee' => [
                'products' => ['read'],
                'sales' => ['create', 'read'],
                'customers' => ['create', 'read', 'update'],
                'reports' => []
            ]
        ];
        
        return $permissions[$role] ?? [];
    }
    
    private function logFailedAttempt(string $username, string $ip, string $reason): void {
        error_log("[PrismaTech Auth] Failed login attempt - Username: $username, IP: $ip, Reason: $reason");
    }
}