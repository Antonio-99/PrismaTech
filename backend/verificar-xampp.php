<?php
/**
 * Verificación rápida para XAMPP
 * Guarda como: backend/verificar-xampp.php
 * Accede a: http://localhost/prismatech/backend/verificar-xampp.php
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación XAMPP - PrismaTech</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .test { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .success { border-left: 4px solid #28a745; background: #d4edda; }
        .error { border-left: 4px solid #dc3545; background: #f8d7da; }
        .warning { border-left: 4px solid #ffc107; background: #fff3cd; }
        .info { border-left: 4px solid #17a2b8; background: #d1ecf1; }
        .code { background: #2d2d2d; color: #f8f8f2; padding: 10px; border-radius: 5px; font-family: monospace; overflow-x: auto; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .status { font-weight: bold; padding: 5px 10px; border-radius: 5px; }
        .status.ok { background: #28a745; color: white; }
        .status.error { background: #dc3545; color: white; }
        .status.warning { background: #ffc107; color: black; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Verificación XAMPP - PrismaTech</h1>
            <p>Diagnóstico automático de configuración</p>
        </div>

        <?php
        $tests = [];
        $overall_status = true;

        // Test 1: Verificar PHP
        $tests['php'] = [
            'name' => 'PHP Funcionando',
            'status' => 'ok',
            'message' => 'PHP ' . phpversion() . ' está funcionando correctamente',
            'details' => 'Servidor: ' . $_SERVER['SERVER_SOFTWARE']
        ];

        // Test 2: Verificar extensión MySQL
        if (extension_loaded('mysqli')) {
            $tests['mysqli'] = [
                'name' => 'Extensión MySQL',
                'status' => 'ok',
                'message' => 'Extensión MySQLi está cargada',
                'details' => 'Versión cliente: ' . mysqli_get_client_info()
            ];
        } else {
            $tests['mysqli'] = [
                'name' => 'Extensión MySQL',
                'status' => 'error',
                'message' => 'Extensión MySQLi NO está cargada',
                'details' => 'Verifica la instalación de XAMPP'
            ];
            $overall_status = false;
        }

        // Test 3: Verificar conexión MySQL
        $mysql_status = @fsockopen('localhost', 3306, $errno, $errstr, 3);
        if ($mysql_status) {
            fclose($mysql_status);
            $tests['mysql_connection'] = [
                'name' => 'MySQL Corriendo',
                'status' => 'ok',
                'message' => 'MySQL está corriendo en puerto 3306',
                'details' => 'Conexión exitosa al servidor MySQL'
            ];
        } else {
            $tests['mysql_connection'] = [
                'name' => 'MySQL Corriendo',
                'status' => 'error',
                'message' => 'MySQL NO está corriendo',
                'details' => 'Error: ' . $errstr . ' (Código: ' . $errno . ')',
                'solution' => 'Inicia MySQL en el panel de XAMPP'
            ];
            $overall_status = false;
        }

        // Test 4: Verificar base de datos
        if ($mysql_status && extension_loaded('mysqli')) {
            try {
                $conn = new mysqli('localhost', 'root', '', 'prismatech');
                if ($conn->connect_error) {
                    // Intentar sin especificar BD
                    $conn_test = new mysqli('localhost', 'root', '');
                    if (!$conn_test->connect_error) {
                        $tests['database'] = [
                            'name' => 'Base de Datos',
                            'status' => 'warning',
                            'message' => 'Conexión MySQL OK, pero BD "prismatech" no existe',
                            'details' => 'Credenciales correctas, falta crear BD',
                            'solution' => 'Crear base de datos "prismatech" en phpMyAdmin'
                        ];
                        
                        // Intentar crear BD automáticamente
                        if ($conn_test->query("CREATE DATABASE IF NOT EXISTS prismatech CHARACTER SET utf8 COLLATE utf8_general_ci")) {
                            $tests['database']['status'] = 'ok';
                            $tests['database']['message'] = 'Base de datos "prismatech" creada automáticamente';
                            $tests['database']['details'] = 'BD creada con charset UTF-8';
                        }
                        $conn_test->close();
                    } else {
                        $tests['database'] = [
                            'name' => 'Base de Datos',
                            'status' => 'error',
                            'message' => 'Error de credenciales MySQL',
                            'details' => $conn_test->connect_error,
                            'solution' => 'Verificar usuario/contraseña en config.php'
                        ];
                        $overall_status = false;
                    }
                } else {
                    $tests['database'] = [
                        'name' => 'Base de Datos',
                        'status' => 'ok',
                        'message' => 'Conexión a BD "prismatech" exitosa',
                        'details' => 'Charset: ' . $conn->character_set_name()
                    ];
                    $conn->close();
                }
            } catch (Exception $e) {
                $tests['database'] = [
                    'name' => 'Base de Datos',
                    'status' => 'error',
                    'message' => 'Error conectando a base de datos',
                    'details' => $e->getMessage(),
                    'solution' => 'Verificar que MySQL esté corriendo'
                ];
                $overall_status = false;
            }
        }

        // Test 5: Verificar tablas
        if (isset($tests['database']) && $tests['database']['status'] === 'ok') {
            try {
                $conn = new mysqli('localhost', 'root', '', 'prismatech');
                $tables = ['categorias', 'productos', 'clientes', 'ventas'];
                $existing_tables = [];
                $missing_tables = [];
                
                foreach ($tables as $table) {
                    $result = $conn->query("SHOW TABLES LIKE '$table'");
                    if ($result && $result->num_rows > 0) {
                        $existing_tables[] = $table;
                    } else {
                        $missing_tables[] = $table;
                    }
                }
                
                if (empty($missing_tables)) {
                    $tests['tables'] = [
                        'name' => 'Tablas de BD',
                        'status' => 'ok',
                        'message' => 'Todas las tablas existen',
                        'details' => 'Tablas: ' . implode(', ', $existing_tables)
                    ];
                } else {
                    $tests['tables'] = [
                        'name' => 'Tablas de BD',
                        'status' => 'warning',
                        'message' => 'Faltan algunas tablas',
                        'details' => 'Faltantes: ' . implode(', ', $missing_tables),
                        'solution' => 'Importar archivo sql/prismatech.sql en phpMyAdmin'
                    ];
                }
                $conn->close();
            } catch (Exception $e) {
                $tests['tables'] = [
                    'name' => 'Tablas de BD',
                    'status' => 'error',
                    'message' => 'Error verificando tablas',
                    'details' => $e->getMessage()
                ];
            }
        }

        // Test 6: Verificar archivos del proyecto
        $required_files = [
            'config.php' => 'Configuración de BD',
            'productos.php' => 'API de productos',
            'categorias.php' => 'API de categorías',
            '../public/index.html' => 'Frontend público',
            '../admin/index.html' => 'Panel administrativo'
        ];

        $existing_files = [];
        $missing_files = [];

        foreach ($required_files as $file => $description) {
            if (file_exists($file)) {
                $existing_files[] = "$description ($file)";
            } else {
                $missing_files[] = "$description ($file)";
            }
        }

        if (empty($missing_files)) {
            $tests['files'] = [
                'name' => 'Archivos del Proyecto',
                'status' => 'ok',
                'message' => 'Todos los archivos están presentes',
                'details' => count($existing_files) . ' archivos encontrados'
            ];
        } else {
            $tests['files'] = [
                'name' => 'Archivos del Proyecto',
                'status' => 'warning',
                'message' => 'Faltan algunos archivos',
                'details' => 'Faltantes: ' . implode(', ', $missing_files),
                'solution' => 'Verificar estructura de carpetas en htdocs'
            ];
        }

        // Mostrar resultados
        foreach ($tests as $test) {
            $class = $test['status'] === 'ok' ? 'success' : ($test['status'] === 'warning' ? 'warning' : 'error');
            echo "<div class='test $class'>";
            echo "<h3><span class='status {$test['status']}'>" . ($test['status'] === 'ok' ? '✅' : ($test['status'] === 'warning' ? '⚠️' : '❌')) . "</span> {$test['name']}</h3>";
            echo "<p><strong>{$test['message']}</strong></p>";
            if (isset($test['details'])) {
                echo "<p><em>{$test['details']}</em></p>";
            }
            if (isset($test['solution'])) {
                echo "<p><strong>Solución:</strong> {$test['solution']}</p>";
            }
            echo "</div>";
        }

        // Resumen general
        if ($overall_status) {
            echo "<div class='test success'>";
            echo "<h2>🎉 ¡Todo funciona correctamente!</h2>";
            echo "<p>XAMPP está configurado correctamente para PrismaTech.</p>";
            echo "<p><strong>URLs de prueba:</strong></p>";
            echo "<ul>";
            echo "<li><a href='http://localhost/prismatech/public/index.html' target='_blank'>Frontend Público</a></li>";
            echo "<li><a href='http://localhost/prismatech/admin/index.html' target='_blank'>Panel Admin</a></li>";
            echo "<li><a href='http://localhost/prismatech/backend/productos.php' target='_blank'>API Productos</a></li>";
            echo "<li><a href='http://localhost/phpmyadmin' target='_blank'>phpMyAdmin</a></li>";
            echo "</ul>";
            echo "</div>";
        } else {
            echo "<div class='test error'>";
            echo "<h2>❌ Se encontraron problemas</h2>";
            echo "<p>Sigue las soluciones indicadas arriba para corregir los errores.</p>";
            echo "</div>";
        }
        ?>

        <div class="test info">
            <h3>📋 Acciones Rápidas</h3>
            <button class="btn" onclick="window.open('http://localhost:8080/phpmyadmin', '_blank')">Abrir phpMyAdmin</button>
            <button class="btn" onclick="window.open('http://localhost:8080/prismatech/backend/productos.php', '_blank')">Probar API</button>
            <button class="btn" onclick="location.reload()">Verificar de Nuevo</button>
            <button class="btn" onclick="window.open('http://localhost:8080/prismatech/diagnostico.html', '_blank')">Diagnóstico Completo</button>
        </div>

        <?php if (!$overall_status): ?>
        <div class="test warning">
            <h3>🔧 Soluciones Rápidas</h3>
            <h4>1. Panel de XAMPP:</h4>
            <ul>
                <li>Abrir panel de control de XAMPP</li>
                <li>Iniciar Apache (botón Start - debe estar verde)</li>
                <li>Iniciar MySQL (botón Start - debe estar verde)</li>
            </ul>
            
            <h4>2. Crear Base de Datos:</h4>
            <div class="code">
1. Ir a http://localhost:8080/phpmyadmin
2. Clic en "Nueva"
3. Nombre: prismatech
4. Cotejamiento: utf8_general_ci
5. Clic en "Crear"
            </div>
            
            <h4>3. Importar Datos:</h4>
            <div class="code">
1. Seleccionar BD "prismatech"
2. Pestaña "Importar"
3. Seleccionar archivo sql/prismatech.sql
4. Clic en "Continuar"
            </div>
            
            <h4>4. Verificar Estructura:</h4>
            <div class="code">
C:\xampp\htdocs\prismatech\
├── backend\config.php
├── backend\productos.php
├── public\index.html
└── admin\index.html
            </div>
        </div>
        <?php endif; ?>

        <div class="test info">
            <h3>ℹ️ Información del Sistema</h3>
            <p><strong>PHP:</strong> <?php echo phpversion(); ?></p>
            <p><strong>Servidor:</strong> <?php echo $_SERVER['SERVER_SOFTWARE']; ?></p>
            <p><strong>Ruta actual:</strong> <?php echo __DIR__; ?></p>
            <p><strong>URL actual:</strong> <?php echo "http://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}"; ?></p>
            <p><strong>Fecha:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
        </div>
    </div>

    <script>
        // Auto-refrescar cada 30 segundos si hay errores
        <?php if (!$overall_status): ?>
        setTimeout(() => {
            if (confirm('¿Quieres verificar de nuevo automáticamente?')) {
                location.reload();
            }
        }, 30000);
        <?php endif; ?>
    </script>
</body>
</html>