class AuthSessionsAPI extends ApiBase {
    
    private array $user;
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'GET':
                $this->getUserSessions();
                break;
            case 'DELETE':
                $this->revokeSession();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function getUserSessions(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            
            // Obtener sesiones activas del usuario
            $query = "
                SELECT id, ip_address, user_agent, last_activity, expires_at, is_active,
                       CASE WHEN id = :current_session THEN 1 ELSE 0 END as is_current
                FROM user_sessions 
                WHERE user_id = :user_id AND is_active = 1
                ORDER BY last_activity DESC
            ";
            
            $current_session = substr($_SERVER['HTTP_AUTHORIZATION'] ?? '', 7);
            $sessions = Database::fetchAll($query, [
                'user_id' => $this->user['id'],
                'current_session' => $current_session
            ]);
            
            // Formatear sesiones
            $formatted_sessions = array_map(function($session) {
                return [
                    'id' => $session['id'],
                    'ip_address' => $session['ip_address'],
                    'user_agent' => $this->parseUserAgent($session['user_agent']),
                    'last_activity' => $session['last_activity'],
                    'expires_at' => $session['expires_at'],
                    'is_current' => (bool)$session['is_current'],
                    'location' => $this->getLocationFromIP($session['ip_address'])
                ];
            }, $sessions);
            
            $this->sendSuccess([
                'sessions' => $formatted_sessions,
                'total' => count($formatted_sessions)
            ], 200, 'Sesiones obtenidas');
            
        } catch (Exception $e) {
            error_log("[PrismaTech Auth] Get sessions error: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function revokeSession(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            
            // Validar session_id
            if (!isset($_GET['session_id'])) {
                $this->sendError(400, 'session_id requerido');
            }
            
            $session_id = $_GET['session_id'];
            $current_session = substr($_SERVER['HTTP_AUTHORIZATION'] ?? '', 7);
            
            // No permitir revocar la sesión actual
            if ($session_id === $current_session) {
                $this->sendError(400, 'No puedes revocar tu sesión actual');
            }
            
            // Verificar que la sesión pertenece al usuario
            $session = Database::fetchOne(
                "SELECT user_id FROM user_sessions WHERE id = :id AND is_active = 1",
                ['id' => $session_id]
            );
            
            if (!$session || $session['user_id'] != $this->user['id']) {
                $this->sendError(404, 'Sesión no encontrada');
            }
            
            // Revocar sesión
            Database::execute(
                "UPDATE user_sessions SET is_active = 0 WHERE id = :id",
                ['id' => $session_id]
            );
            
            // Log de actividad
            $this->logActivity('session_revoked', ['revoked_session' => $session_id], $this->user['id']);
            
            $this->sendSuccess([
                'message' => 'Sesión revocada exitosamente'
            ], 200, 'Sesión revocada');
            
        } catch (Exception $e) {
            error_log("[PrismaTech Auth] Revoke session error: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function parseUserAgent(string $userAgent): array {
        // Parsing básico del user agent
        $browser = 'Desconocido';
        $os = 'Desconocido';
        
        if (strpos($userAgent, 'Chrome') !== false) {
            $browser = 'Chrome';
        } elseif (strpos($userAgent, 'Firefox') !== false) {
            $browser = 'Firefox';
        } elseif (strpos($userAgent, 'Safari') !== false) {
            $browser = 'Safari';
        } elseif (strpos($userAgent, 'Edge') !== false) {
            $browser = 'Edge';
        }
        
        if (strpos($userAgent, 'Windows') !== false) {
            $os = 'Windows';
        } elseif (strpos($userAgent, 'Mac') !== false) {
            $os = 'macOS';
        } elseif (strpos($userAgent, 'Linux') !== false) {
            $os = 'Linux';
        } elseif (strpos($userAgent, 'Android') !== false) {
            $os = 'Android';
        } elseif (strpos($userAgent, 'iOS') !== false) {
            $os = 'iOS';
        }
        
        return [
            'browser' => $browser,
            'os' => $os,
            'full' => $userAgent
        ];
    }
    
    private function getLocationFromIP(string $ip): string {
        // Implementación básica de geolocalización por IP
        // En un sistema real usarías un servicio como MaxMind o similar
        if ($ip === '127.0.0.1' || $ip === 'localhost' || strpos($ip, '192.168.') === 0) {
            return 'Local';
        }
        
        return 'Ubicación desconocida';
    }
}

// Routing simple para las APIs de autenticación
$request_uri = $_SERVER['REQUEST_URI'] ?? '';

if (strpos($request_uri, '/api/auth/login.php') !== false) {
    new AuthLoginAPI();
} elseif (strpos($request_uri, '/api/auth/logout.php') !== false) {
    new AuthLogoutAPI();
} elseif (strpos($request_uri, '/api/auth/verify.php') !== false) {
    new AuthVerifyAPI();
} elseif (strpos($request_uri, '/api/auth/change-password.php') !== false) {
    new AuthChangePasswordAPI();
} elseif (strpos($request_uri, '/api/auth/sessions.php') !== false) {
    new AuthSessionsAPI();
}