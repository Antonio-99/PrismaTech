// api/auth/logout.php
class AuthLogoutAPI extends ApiBase {
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'POST':
                $this->logout();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function logout(): void {
        try {
            // Obtener token del header
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            
            if (empty($auth_header) || !str_starts_with($auth_header, 'Bearer ')) {
                $this->sendSuccess(['message' => 'Sesión cerrada'], 200, 'Logout exitoso');
                return;
            }
            
            $token = substr($auth_header, 7);
            
            // Buscar y desactivar sesión
            $query = "
                UPDATE user_sessions 
                SET is_active = 0 
                WHERE id = :token
            ";
            
            Database::execute($query, ['token' => $token]);
            
            // Log de actividad
            $this->logActivity('user_logout', ['token' => substr($token, 0, 10) . '...']);
            
            $this->sendSuccess(['message' => 'Sesión cerrada exitosamente'], 200, 'Logout exitoso');
            
        } catch (Exception $e) {
            error_log("[PrismaTech Auth] Logout error: " . $e->getMessage());
            $this->sendSuccess(['message' => 'Sesión cerrada'], 200, 'Logout exitoso');
        }
    }
}