<?php
/**
 * ============================================
 * PrismaTech - Database Configuration
 * Configuración de conexión a base de datos
 * ============================================
 */

// Definir constante de acceso PRIMERO
if (!defined('PRISMATECH_ACCESS')) {
    define('PRISMATECH_ACCESS', true);
}

/**
 * Configuración de base de datos
 */
class DatabaseConfig {
    
    // Configuración de producción
    private const PRODUCTION_CONFIG = [
        'host' => 'localhost',
        'dbname' => 'prismatech_db',
        'username' => 'prismatech_user',
        'password' => 'your_secure_password_here',
        'charset' => 'utf8mb4',
        'port' => 3306
    ];
    
    // Configuración de desarrollo
    private const DEVELOPMENT_CONFIG = [
        'host' => 'localhost',
        'dbname' => 'prismatech_db',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
        'port' => 3306
    ];
    
    // Configuración de testing
    private const TESTING_CONFIG = [
        'host' => 'localhost',
        'dbname' => 'prismatech_test_db',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
        'port' => 3306
    ];
    
    /**
     * Obtener configuración según el entorno
     */
    public static function getConfig(): array {
        $environment = $_ENV['PRISMATECH_ENV'] ?? 'development';
        
        switch ($environment) {
            case 'production':
                return self::PRODUCTION_CONFIG;
            case 'testing':
                return self::TESTING_CONFIG;
            case 'development':
            default:
                return self::DEVELOPMENT_CONFIG;
        }
    }
    
    /**
     * Obtener string de conexión DSN
     */
    public static function getDSN(): string {
        $config = self::getConfig();
        return sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['dbname'],
            $config['charset']
        );
    }
}

/**
 * Clase principal de base de datos
 */
class Database {
    
    private static ?PDO $connection = null;
    private static array $config = [];
    
    /**
     * Obtener instancia de conexión (Singleton)
     */
    public static function getConnection(): PDO {
        if (self::$connection === null) {
            self::connect();
        }
        return self::$connection;
    }
    
    /**
     * Establecer conexión a la base de datos
     */
    private static function connect(): void {
        try {
            self::$config = DatabaseConfig::getConfig();
            $dsn = DatabaseConfig::getDSN();
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                PDO::ATTR_PERSISTENT => false,
                PDO::ATTR_TIMEOUT => 30
            ];
            
            self::$connection = new PDO(
                $dsn,
                self::$config['username'],
                self::$config['password'],
                $options
            );
            
            // Configurar zona horaria
            self::$connection->exec("SET time_zone = '-06:00'"); // Zona horaria de México
            
            // Log de conexión exitosa (solo en desarrollo)
            if (($_ENV['PRISMATECH_ENV'] ?? 'development') === 'development') {
                error_log('[PrismaTech] Conexión a base de datos establecida correctamente');
            }
            
        } catch (PDOException $e) {
            self::handleConnectionError($e);
        }
    }
    
    /**
     * Manejar errores de conexión
     */
    private static function handleConnectionError(PDOException $e): void {
        $error_message = '[PrismaTech] Error de conexión a base de datos: ' . $e->getMessage();
        error_log($error_message);
        
        // En producción, no mostrar detalles del error
        if (($_ENV['PRISMATECH_ENV'] ?? 'development') === 'production') {
            throw new Exception('Error de conexión a la base de datos. Contacte al administrador.');
        } else {
            throw new Exception($error_message);
        }
    }
    
    /**
     * Cerrar conexión
     */
    public static function closeConnection(): void {
        self::$connection = null;
    }
    
    /**
     * Iniciar transacción
     */
    public static function beginTransaction(): bool {
        return self::getConnection()->beginTransaction();
    }
    
    /**
     * Confirmar transacción
     */
    public static function commit(): bool {
        return self::getConnection()->commit();
    }
    
    /**
     * Revertir transacción
     */
    public static function rollback(): bool {
        return self::getConnection()->rollBack();
    }
    
    /**
     * Ejecutar query preparado
     */
    public static function execute(string $query, array $params = []): PDOStatement {
        try {
            $connection = self::getConnection();
            $statement = $connection->prepare($query);
            $statement->execute($params);
            return $statement;
        } catch (PDOException $e) {
            error_log('[PrismaTech] Error en query: ' . $e->getMessage() . ' | Query: ' . $query);
            throw $e;
        }
    }
    
    /**
     * Obtener un solo registro
     */
    public static function fetchOne(string $query, array $params = []): ?array {
        $statement = self::execute($query, $params);
        $result = $statement->fetch();
        return $result === false ? null : $result;
    }
    
    /**
     * Obtener múltiples registros
     */
    public static function fetchAll(string $query, array $params = []): array {
        $statement = self::execute($query, $params);
        return $statement->fetchAll();
    }
    
    /**
     * Obtener el último ID insertado
     */
    public static function getLastInsertId(): string {
        return self::getConnection()->lastInsertId();
    }
    
    /**
     * Obtener número de filas afectadas
     */
    public static function getRowCount(PDOStatement $statement): int {
        return $statement->rowCount();
    }
    
    /**
     * Escapar string para queries
     */
    public static function quote(string $string): string {
        return self::getConnection()->quote($string);
    }
    
    /**
     * Verificar si una tabla existe
     */
    public static function tableExists(string $tableName): bool {
        try {
            $query = "SELECT 1 FROM `$tableName` LIMIT 1";
            self::execute($query);
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
}

/**
 * Clase base para modelos
 */
abstract class BaseModel {
    
    protected static string $table;
    protected static string $primaryKey = 'id';
    
    /**
     * Buscar por ID
     */
    public static function find(int $id): ?array {
        $query = "SELECT * FROM " . static::$table . " WHERE " . static::$primaryKey . " = :id LIMIT 1";
        return Database::fetchOne($query, ['id' => $id]);
    }
    
    /**
     * Obtener todos los registros
     */
    public static function all(array $conditions = []): array {
        $query = "SELECT * FROM " . static::$table;
        $params = [];
        
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $field => $value) {
                $whereClause[] = "$field = :$field";
                $params[$field] = $value;
            }
            $query .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        return Database::fetchAll($query, $params);
    }
}