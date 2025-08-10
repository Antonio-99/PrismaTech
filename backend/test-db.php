<?php
// backend/test-db.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    include 'config.php';
    
    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }
    
    // Probar consulta simple
    $result = $conn->query("SELECT 1 as test");
    if (!$result) {
        throw new Exception("Error en consulta de prueba: " . $conn->error);
    }
    
    // Verificar tablas principales
    $tables = ['categorias', 'productos', 'clientes', 'ventas'];
    $existing_tables = [];
    $missing_tables = [];
    $table_counts = [];
    
    foreach ($tables as $table) {
        $checkTable = $conn->query("SHOW TABLES LIKE '$table'");
        if ($checkTable && $checkTable->num_rows > 0) {
            $existing_tables[] = $table;
            
            // Contar registros
            $countResult = $conn->query("SELECT COUNT(*) as count FROM $table");
            if ($countResult) {
                $count = $countResult->fetch_assoc()['count'];
                $table_counts[$table] = (int)$count;
            }
        } else {
            $missing_tables[] = $table;
        }
    }
    
    // Información del servidor
    $serverInfo = $conn->server_info;
    $hostInfo = $conn->host_info;
    
    echo json_encode([
        'success' => true,
        'status' => 'connected',
        'host' => $hostInfo,
        'server_version' => $serverInfo,
        'database' => 'prismatech',
        'existing_tables' => $existing_tables,
        'missing_tables' => $missing_tables,
        'table_counts' => $table_counts,
        'message' => 'Conexión exitosa a la base de datos'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'error' => $e->getMessage(),
        'suggestions' => [
            'Verificar que MySQL esté ejecutándose',
            'Comprobar credenciales en config.php',
            'Crear base de datos usando sql/prismatech.sql',
            'Verificar permisos de usuario de BD'
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

if (isset($conn)) {
    $conn->close();
}
?>