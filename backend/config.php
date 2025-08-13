<?php
/**
 * Configuración de base de datos para PrismaTech
 * Archivo: backend/config.php
 */

// Configuración de base de datos
$host = "localhost";        // Servidor de base de datos
$user = "root";            // Usuario de MySQL
$pass = "";                // Contraseña de MySQL (vacía por defecto en XAMPP)
$db   = "prismatech";      // Nombre de la base de datos

// Configuración adicional
$charset = "utf8mb4";      // Charset para soporte completo de UTF-8
$port = 3306;              // Puerto de MySQL

try {
    // Crear conexión con manejo de errores mejorado
    $conn = new mysqli($host, $user, $pass, $db, $port);
    
    // Verificar conexión
    if ($conn->connect_error) {
        throw new Exception("Error de conexión a la base de datos: " . $conn->connect_error);
    }
    
    // Configurar charset
    if (!$conn->set_charset($charset)) {
        throw new Exception("Error configurando charset: " . $conn->error);
    }
    
    // Configurar zona horaria
    $conn->query("SET time_zone = '-06:00'"); // Zona horaria de México Central
    
    // Configurar modo SQL para mayor compatibilidad
    $conn->query("SET sql_mode = ''");
    
} catch (Exception $e) {
    // Log del error (en producción, usar un sistema de logs apropiado)
    error_log("Error de base de datos: " . $e->getMessage());
    
    // Respuesta para AJAX/API
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error de conexión a la base de datos',
            'message' => 'No se pudo conectar al servidor de base de datos. Verifica que MySQL esté ejecutándose.',
            'details' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Respuesta para navegador
    die("
    <!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Error de Conexión - PrismaTech</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .error-container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error-header { color: #dc2626; margin-bottom: 20px; }
            .error-message { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .solution { background: #f0f9ff; border: 1px solid #bae6fd; color: #0c4a6e; padding: 15px; border-radius: 5px; }
            .code { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
            .btn { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px 5px 0 0; }
            .btn:hover { background: #2563eb; }
        </style>
    </head>
    <body>
        <div class='error-container'>
            <h1 class='error-header'>🔧 Error de Conexión a la Base de Datos</h1>
            
            <div class='error-message'>
                <strong>Error:</strong> No se pudo conectar a la base de datos MySQL.
            </div>
            
            <div class='solution'>
                <h3>💡 Soluciones:</h3>
                <ol>
                    <li><strong>Verificar XAMPP:</strong>
                        <ul>
                            <li>Abre el Panel de Control de XAMPP</li>
                            <li>Inicia el servicio <strong>MySQL</strong> (debe estar en verde)</li>
                            <li>Inicia el servicio <strong>Apache</strong> si no está corriendo</li>
                        </ul>
                    </li>
                    
                    <li><strong>Crear la base de datos:</strong>
                        <ul>
                            <li>Ve a <a href='http://localhost/phpmyadmin' target='_blank'>phpMyAdmin</a></li>
                            <li>Crea una nueva base de datos llamada <code>prismatech</code></li>
                            <li>Importa el archivo <code>prismatech.sql</code></li>
                        </ul>
                    </li>
                    
                    <li><strong>Verificar configuración:</strong>
                        <div class='code'>
                            Servidor: $host<br>
                            Usuario: $user<br>
                            Base de datos: $db<br>
                            Puerto: $port
                        </div>
                    </li>
                </ol>
            </div>
            
            <div>
                <a href='verificar-xampp.php' class='btn'>🔍 Diagnóstico Automático</a>
                <a href='http://localhost/phpmyadmin' class='btn' target='_blank'>📊 phpMyAdmin</a>
                <a href='javascript:location.reload()' class='btn'>🔄 Reintentar</a>
            </div>
            
            <details style='margin-top: 20px;'>
                <summary style='cursor: pointer; color: #6b7280;'>Ver detalles técnicos</summary>
                <div class='code' style='margin-top: 10px; font-size: 12px; color: #6b7280;'>
                    " . htmlspecialchars($e->getMessage()) . "
                </div>
            </details>
        </div>
    </body>
    </html>
    ");
}

/**
 * Función para ejecutar consultas con manejo de errores
 */
function executeQuery($conn, $sql, $params = [], $types = '') {
    try {
        if (empty($params)) {
            $result = $conn->query($sql);
            if (!$result) {
                throw new Exception("Error en consulta: " . $conn->error);
            }
            return $result;
        } else {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error preparando consulta: " . $conn->error);
            }
            
            if ($types && !empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            
            if (!$stmt->execute()) {
                throw new Exception("Error ejecutando consulta: " . $stmt->error);
            }
            
            return $stmt;
        }
    } catch (Exception $e) {
        error_log("Error en executeQuery: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Función para limpiar y escapar datos de entrada
 */
function cleanInput($data) {
    if ($data === null) return null;
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Función para validar que una tabla existe
 */
function tableExists($conn, $tableName) {
    $sql = "SHOW TABLES LIKE ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $tableName);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}

/**
 * Función para obtener información de la base de datos
 */
function getDatabaseInfo($conn) {
    return [
        'server_version' => $conn->server_info,
        'client_version' => $conn->client_info,
        'host_info' => $conn->host_info,
        'charset' => $conn->character_set_name(),
        'database' => $conn->query("SELECT DATABASE() as db")->fetch_assoc()['db']
    ];
}

// Verificar que las tablas principales existan (opcional, solo en desarrollo)
if (defined('CHECK_TABLES') && CHECK_TABLES) {
    $required_tables = ['categorias', 'productos', 'clientes', 'ventas', 'venta_detalle'];
    $missing_tables = [];
    
    foreach ($required_tables as $table) {
        if (!tableExists($conn, $table)) {
            $missing_tables[] = $table;
        }
    }
    
    if (!empty($missing_tables)) {
        error_log("Tablas faltantes: " . implode(', ', $missing_tables));
    }
}
?>