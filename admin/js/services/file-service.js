// ============================================
// admin/js/services/file-service.js - Servicio de Archivos
// ============================================

class FileService {
    constructor(apiService) {
        this.api = apiService;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.allowedDocumentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
    }

    // Validación de archivos
    validateFile(file, type = 'image') {
        const errors = [];

        // Verificar tamaño
        if (file.size > this.maxFileSize) {
            errors.push(`El archivo es demasiado grande. Máximo ${this.maxFileSize / 1024 / 1024}MB`);
        }

        // Verificar tipo
        const allowedTypes = type === 'image' ? this.allowedImageTypes : this.allowedDocumentTypes;
        if (!allowedTypes.includes(file.type)) {
            errors.push(`Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Subir archivo
    async uploadFile(file, category = 'general', additionalData = {}) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        try {
            const response = await this.api.uploadFile('/files/upload.php', file, {
                category: category,
                ...additionalData
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error al subir archivo: ${error.message}`);
        }
    }

    // Crear preview de imagen
    createImagePreview(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('El archivo no es una imagen'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error leyendo el archivo'));
            reader.readAsDataURL(file);
        });
    }

    // Redimensionar imagen
    async resizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calcular nuevas dimensiones
                let { width, height } = img;
                const ratio = Math.min(maxWidth / width, maxHeight / height);

                if (ratio < 1) {
                    width *= ratio;
                    height *= ratio;
                }

                // Redimensionar
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a blob
                canvas.toBlob(resolve, file.type, quality);
            };

            img.onerror = () => reject(new Error('Error cargando imagen'));
            img.src = URL.createObjectURL(file);
        });
    }

    // Obtener información del archivo
    getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            sizeFormatted: this.formatFileSize(file.size)
        };
    }

    // Formatear tamaño de archivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Obtener icono según tipo de archivo
    getFileIcon(fileType) {
        const iconMap = {
            'image/': 'fas fa-image',
            'application/pdf': 'fas fa-file-pdf',
            'application/msword': 'fas fa-file-word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fas fa-file-word',
            'application/vnd.ms-excel': 'fas fa-file-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fas fa-file-excel',
            'text/': 'fas fa-file-alt',
            'video/': 'fas fa-file-video',
            'audio/': 'fas fa-file-audio'
        };

        for (const [type, icon] of Object.entries(iconMap)) {
            if (fileType.startsWith(type)) {
                return icon;
            }
        }

        return 'fas fa-file';
    }

    // Drag and Drop handler
    setupDragAndDrop(element, callback, options = {}) {
        const defaults = {
            multiple: false,
            accept: 'image/*',
            dragClass: 'drag-over'
        };
        
        const config = { ...defaults, ...options };

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add(config.dragClass);
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!element.contains(e.relatedTarget)) {
                element.classList.remove(config.dragClass);
            }
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove(config.dragClass);

            const files = Array.from(e.dataTransfer.files);
            const filteredFiles = config.multiple ? files : [files[0]];

            if (callback) {
                callback(filteredFiles);
            }
        });
    }
}