// pos/js/services/api-service.js
// ============================================
class APIService {
    constructor() {
        this.baseURL = POSConfig.api.baseURL;
        this.timeout = POSConfig.api.timeout;
        this.retryAttempts = POSConfig.api.retryAttempts;
        this.token = this.getAuthToken();
    }
    
    getAuthToken() {
        return localStorage.getItem('admin_token') || '';
    }
    
    /**
     * Make HTTP request with retry logic
     */
    async request(endpoint, options = {}, attempt = 1) {
        const url = this.baseURL + endpoint;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                signal: controller.signal
            };
            
            const response = await fetch(url, { ...defaultOptions, ...options });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error?.message || 'API Error');
            }
            
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Retry logic
            if (attempt < this.retryAttempts && !controller.signal.aborted) {
                console.warn(`API request failed, retrying... (${attempt}/${this.retryAttempts})`);
                await this.delay(1000 * attempt); // Exponential backoff
                return this.request(endpoint, options, attempt + 1);
            }
            
            throw new APIError(error.message, endpoint, attempt);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Convenience methods
    async get(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        return this.request(url.pathname + url.search);
    }
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Custom Error Classes
class APIError extends Error {
    constructor(message, endpoint, attempt) {
        super(message);
        this.name = 'APIError';
        this.endpoint = endpoint;
        this.attempt = attempt;
    }
}

class ValidationError extends Error {
    constructor(field, message) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}
