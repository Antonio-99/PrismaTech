// ============================================
// admin/js/services/auth-service.js - Servicio de Autenticación
// ============================================

class AuthService {
    constructor(apiService) {
        this.api = apiService;
        this.user = null;
        this.token = localStorage.getItem('admin_token');
        this.refreshInterval = null;
        this.sessionTimeout = null;
        
        this.setupTokenRefresh();
    }

    async login(credentials) {
        try {
            const response = await this.api.post('/auth/login.php', credentials);
            
            this.token = response.data.token;
            this.user = response.data.user;
            
            // Almacenar token
            localStorage.setItem('admin_token', this.token);
            this.api.token = this.token;
            
            // Configurar renovación automática
            this.setupTokenRefresh();
            
            return {
                success: true,
                user: this.user,
                token: this.token
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Error de autenticación'
            };
        }
    }

    async logout() {
        try {
            // Notificar al servidor
            await this.api.post('/auth/logout.php');
        } catch (error) {
            console.warn('Logout server error:', error);
        } finally {
            // Limpiar datos locales
            this.clearSession();
            
            // Redireccionar al login
            window.location.href = '/admin/login.php';
        }
    }

    async checkAuth() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await this.api.get('/auth/verify.php');
            
            if (response.success) {
                this.user = response.data.user;
                return true;
            } else {
                this.clearSession();
                return false;
            }
            
        } catch (error) {
            this.clearSession();
            return false;
        }
    }

    async refreshToken() {
        if (!this.token) return false;

        try {
            const response = await this.api.post('/auth/refresh.php');
            
            if (response.success) {
                this.token = response.data.token;
                this.api.token = this.token;
                localStorage.setItem('admin_token', this.token);
                return true;
            } else {
                this.clearSession();
                return false;
            }
            
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearSession();
            return false;
        }
    }

    setupTokenRefresh() {
        // Renovar token cada 30 minutos
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.refreshToken();
        }, 30 * 60 * 1000); // 30 minutos

        // Session timeout después de 8 horas de inactividad
        this.resetSessionTimeout();
    }

    resetSessionTimeout() {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }

        this.sessionTimeout = setTimeout(() => {
            this.logout();
        }, 8 * 60 * 60 * 1000); // 8 horas

        // Reset timeout en actividad del usuario
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.resetSessionTimeout();
            }, { once: true, passive: true });
        });
    }

    clearSession() {
        this.user = null;
        this.token = null;
        this.api.token = null;
        
        localStorage.removeItem('admin_token');
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
    }

    // Gestión de permisos
    hasPermission(action, resource = null) {
        if (!this.user || !this.user.permissions) {
            return false;
        }

        const permissions = this.user.permissions;
        
        // Super admin tiene todos los permisos
        if (this.user.role === 'admin') {
            return true;
        }

        // Verificar permiso específico
        if (resource) {
            return permissions[resource] && permissions[resource].includes(action);
        }

        // Verificar permiso general
        return permissions.includes(action);
    }

    canCreate(resource) {
        return this.hasPermission('create', resource);
    }

    canRead(resource) {
        return this.hasPermission('read', resource);
    }

    canUpdate(resource) {
        return this.hasPermission('update', resource);
    }

    canDelete(resource) {
        return this.hasPermission('delete', resource);
    }

    // Información del usuario
    getUser() {
        return this.user;
    }

    getUserRole() {
        return this.user ? this.user.role : null;
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // Cambio de contraseña
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await this.api.post('/auth/change-password.php', {
                current_password: currentPassword,
                new_password: newPassword
            });

            return {
                success: true,
                message: 'Contraseña actualizada exitosamente'
            };

        } catch (error) {
            return {
                success: false,
                message: error.message || 'Error al cambiar contraseña'
            };
        }
    }

    // Gestión de sesiones
    async getSessions() {
        try {
            const response = await this.api.get('/auth/sessions.php');
            return response.data.sessions;
        } catch (error) {
            console.error('Error getting sessions:', error);
            return [];
        }
    }

    async revokeSession(sessionId) {
        try {
            await this.api.delete(`/auth/sessions.php?session_id=${sessionId}`);
            return true;
        } catch (error) {
            console.error('Error revoking session:', error);
            return false;
        }
    }

    // Activity tracking
    recordActivity(action, details = {}) {
        if (!this.isAuthenticated()) return;

        // Record activity locally
        const activity = {
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            user_id: this.user.id
        };

        // Send to server (fire and forget)
        this.api.post('/auth/activity.php', activity).catch(() => {
            // Ignore errors for activity tracking
        });
    }
}