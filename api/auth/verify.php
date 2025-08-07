class AuthVerifyAPI extends ApiBase {
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'GET':
            case 'POST':
                $this->verifyToken();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function verifyToken(): void {
        try {
            // Verificar y obtener usuario autenticado
            $user = $this->authenticateAdmin();
            
            // Respuesta con información del usuario
            $this->sendSuccess([
                'valid' => true,
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'full_name' => $user['full_name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ],
                'expires_at' => $user['expires_at'] ?? null
            ], 200, 'Token válido');
            
        } catch (Exception $e) {
            $this->sendError(401, 'Token inválido o expirado');
        }
    }
}