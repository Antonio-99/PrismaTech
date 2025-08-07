// api/auth/change-password.php
class AuthChangePasswordAPI extends ApiBase {
    
    private array $user;
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'POST':
                $this->changePassword();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function changePassword(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            
            // Rate limiting
            $this->checkRateLimit('change_password:' . $this->user['id'], 5, 3600);
            
            // Validar campos requeridos
            $this->validateRequiredFields(['current_password', 'new_password']);
            
            $input = $this->sanitizeInput($this->input);
            
            // Validar contraseña actual
            $current_user = Database::fetchOne(
                "SELECT password_hash FROM users WHERE id = :id",
                ['id' => $this->user['id']]
            );
            
            if (!password_verify($input['current_password'], $current_user['password_hash'])) {
                $this->sendError(401, 'Contraseña actual incorrecta');
            }
            
            // Validar nueva contraseña
            if (strlen($input['new_password']) < 8) {
                $this->sendError(400, 'La nueva contraseña debe tener al menos 8 caracteres');
            }
            
            // No permitir misma contraseña
            if ($input['current_password'] === $input['new_password']) {
                $this->sendError(400, 'La nueva contraseña debe ser diferente a la actual');
            }
            
            // Hash nueva contraseña
            $new_password_hash = password_hash($input['new_password'], PASSWORD_DEFAULT);
            
            Database::beginTransaction();
            
            try {
                // Actualizar contraseña
                Database::execute(
                    "UPDATE users SET password_hash = :password, updated_at = NOW() WHERE id = :id",
                    ['password' => $new_password_hash, 'id' => $this->user['id']]
                );
                
                // Invalidar todas las sesiones del usuario excepto la actual
                $current_session = substr($_SERVER['HTTP_AUTHORIZATION'] ?? '', 7);
                Database::execute(
                    "UPDATE user_sessions SET is_active = 0 WHERE user_id = :user_id AND id != :current_session",
                    ['user_id' => $this->user['id'], 'current_session' => $current_session]
                );
                
                Database::commit();
                
                // Log de actividad
                $this->logActivity('password_changed', [], $this->user['id']);
                
                $this->sendSuccess([
                    'message' => 'Contraseña actualizada exitosamente'
                ], 200, 'Contraseña cambiada');
                
            } catch (Exception $e) {
                Database::rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            error_log("[PrismaTech Auth] Change password error: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
}