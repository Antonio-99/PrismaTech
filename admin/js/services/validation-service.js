// ============================================
// admin/js/services/validation-service.js - Servicio de Validación
// ============================================

class ValidationService {
    constructor() {
        this.rules = new Map();
        this.messages = {
            required: 'Este campo es obligatorio',
            email: 'Formato de email inválido',
            phone: 'Formato de teléfono inválido',
            number: 'Debe ser un número válido',
            integer: 'Debe ser un número entero',
            min: 'Valor mínimo: {min}',
            max: 'Valor máximo: {max}',
            minLength: 'Mínimo {minLength} caracteres',
            maxLength: 'Máximo {maxLength} caracteres',
            pattern: 'Formato inválido',
            unique: 'Este valor ya existe',
            match: 'Los campos no coinciden'
        };
    }

    // Validación individual de campos
    validateField(value, rules = {}) {
        const errors = [];
        const val = typeof value === 'string' ? value.trim() : value;

        // Required validation
        if (rules.required && !this.required(val)) {
            errors.push(this.messages.required);
        }

        // Skip other validations if field is empty and not required
        if (!val && !rules.required) {
            return errors;
        }

        // Type validations
        if (rules.email && !this.isValidEmail(val)) {
            errors.push(this.messages.email);
        }

        if (rules.phone && !this.isValidPhone(val)) {
            errors.push(this.messages.phone);
        }

        if (rules.number && !this.isNumber(val)) {
            errors.push(this.messages.number);
        }

        if (rules.integer && !this.isInteger(val)) {
            errors.push(this.messages.integer);
        }

        // Length validations
        if (rules.minLength && val.length < rules.minLength) {
            errors.push(this.messages.minLength.replace('{minLength}', rules.minLength));
        }

        if (rules.maxLength && val.length > rules.maxLength) {
            errors.push(this.messages.maxLength.replace('{maxLength}', rules.maxLength));
        }

        // Value validations
        if (rules.min !== undefined && parseFloat(val) < rules.min) {
            errors.push(this.messages.min.replace('{min}', rules.min));
        }

        if (rules.max !== undefined && parseFloat(val) > rules.max) {
            errors.push(this.messages.max.replace('{max}', rules.max));
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(val)) {
            errors.push(rules.patternMessage || this.messages.pattern);
        }

        // Custom validation
        if (rules.custom && typeof rules.custom === 'function') {
            const customResult = rules.custom(val);
            if (customResult !== true) {
                errors.push(customResult || 'Validación personalizada falló');
            }
        }

        return errors;
    }

    // Validación de objeto completo
    validateObject(data, rules) {
        let isValid = true;
        const errors = {};

        Object.keys(rules).forEach(fieldName => {
            const fieldValue = data[fieldName];
            const fieldRules = rules[fieldName];
            const fieldErrors = this.validateField(fieldValue, fieldRules);

            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
                isValid = false;
                this.showError(fieldName, fieldErrors[0]);
            } else {
                this.clearError(fieldName);
            }
        });

        return isValid ? true : errors;
    }

    // Validación en tiempo real
    setupRealTimeValidation(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return;

        Object.keys(rules).forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!field) return;

            // Validate on blur
            field.addEventListener('blur', () => {
                const value = field.value;
                const fieldRules = rules[fieldName];
                const errors = this.validateField(value, fieldRules);

                if (errors.length > 0) {
                    this.showError(fieldName, errors[0]);
                } else {
                    this.clearError(fieldName);
                }
            });

            // Clear errors on input
            field.addEventListener('input', () => {
                if (field.classList.contains('error')) {
                    this.clearError(fieldName);
                }
            });
        });
    }

    // Mostrar error en campo
    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + 'Error');

        if (field) {
            field.classList.add('error');
        }

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }

        return false;
    }

    // Limpiar error de campo
    clearError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + 'Error');

        if (field) {
            field.classList.remove('error');
        }

        if (errorElement) {
            errorElement.classList.add('hidden');
            errorElement.textContent = '';
        }

        return true;
    }

    // Métodos de validación específicos
    required(value) {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return value !== null && Object.keys(value).length > 0;
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    isValidEmail(email) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }

    isValidPhone(phone) {
        // Formato mexicano: 10 dígitos, con o sin código de país
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        const pattern = /^(\+52|52)?[0-9]{10}$/;
        return pattern.test(cleaned);
    }

    isNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    isInteger(value) {
        return Number.isInteger(parseFloat(value));
    }

    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isValidDate(date) {
        return date instanceof Date && !isNaN(date);
    }

    // Validaciones comunes predefinidas
    getCommonRules() {
        return {
            productName: {
                required: true,
                minLength: 3,
                maxLength: 255
            },
            productPrice: {
                required: true,
                number: true,
                min: 0
            },
            customerName: {
                required: true,
                minLength: 2,
                maxLength: 255
            },
            customerEmail: {
                email: true,
                maxLength: 255
            },
            customerPhone: {
                phone: true
            },
            password: {
                required: true,
                minLength: 8,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                patternMessage: 'Debe contener al menos una mayúscula, una minúscula y un número'
            }
        };
    }
}
