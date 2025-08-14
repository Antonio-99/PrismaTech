<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todas las categorías con conteo de productos
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT c.*, 
                COUNT(p.id) as total_productos,
                COUNT(CASE WHEN p.estado = 'active' THEN 1 END) as productos_activos
                FROM categorias c
                LEFT JOIN productos p ON c.id = p.categoria_id AND p.estado != 'deleted'
                GROUP BY c.id, c.nombre, c.descripcion, c.fecha_creacion
                ORDER BY c.nombre";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error en consulta: " . $conn->error);
        }
        
        $categorias = [];
        while ($row = $result->fetch_assoc()) {
            $categorias[] = [
                'id' => (int)$row['id'],
                'nombre' => $row['nombre'],
                'descripcion' => $row['descripcion'] ?? '',
                'fecha_creacion' => $row['fecha_creacion'],
                'total_productos' => (int)$row['total_productos'],
                'productos_activos' => (int)$row['productos_activos']
            ];
        }
        
        echo json_encode($categorias, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'message' => 'Error al obtener categorías'
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Agregar nueva categoría
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            throw new Exception("Datos JSON inválidos o vacíos");
        }
        
        // Validar campos requeridos
        if (!isset($data['nombre']) || empty(trim($data['nombre']))) {
            throw new Exception("El nombre de la categoría es requerido");
        }
        
        $nombre = trim($data['nombre']);
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
        
        // Validaciones adicionales
        if (strlen($nombre) < 2) {
            throw new Exception("El nombre de la categoría debe tener al menos 2 caracteres");
        }
        
        if (strlen($nombre) > 100) {
            throw new Exception("El nombre de la categoría no puede exceder 100 caracteres");
        }
        
        // Verificar que el nombre no exista (case insensitive)
        $check_name = $conn->prepare("SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?)");
        $check_name->bind_param("s", $nombre);
        $check_name->execute();
        if ($check_name->get_result()->num_rows > 0) {
            throw new Exception("Ya existe una categoría con el nombre '$nombre'");
        }
        
        // Insertar nueva categoría
        $stmt = $conn->prepare("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)");
        $stmt->bind_param("ss", $nombre, $descripcion);
        
        if ($stmt->execute()) {
            $new_id = $conn->insert_id;
            
            echo json_encode([
                'success' => true,
                'message' => 'Categoría creada exitosamente',
                'id' => $new_id,
                'categoria' => [
                    'id' => $new_id,
                    'nombre' => $nombre,
                    'descripcion' => $descripcion,
                    'total_productos' => 0,
                    'productos_activos' => 0
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al insertar categoría en la base de datos: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Actualizar categoría
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de categoría requerido");
        }
        
        $id = (int)$data['id'];
        
        if ($id <= 0) {
            throw new Exception("ID de categoría inválido");
        }
        
        // Verificar que la categoría existe
        $check_category = $conn->prepare("SELECT id, nombre FROM categorias WHERE id = ?");
        $check_category->bind_param("i", $id);
        $check_category->execute();
        $existing_category = $check_category->get_result()->fetch_assoc();
        
        if (!$existing_category) {
            throw new Exception("Categoría no encontrada");
        }
        
        // Validar y limpiar datos
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : null;
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : null;
        
        // Validaciones
        if ($nombre !== null) {
            if (empty($nombre)) {
                throw new Exception("El nombre de la categoría es requerido");
            }
            
            if (strlen($nombre) < 2) {
                throw new Exception("El nombre de la categoría debe tener al menos 2 caracteres");
            }
            
            if (strlen($nombre) > 100) {
                throw new Exception("El nombre de la categoría no puede exceder 100 caracteres");
            }
            
            // Verificar que el nombre no esté duplicado (excepto para la misma categoría)
            if (strtolower($nombre) !== strtolower($existing_category['nombre'])) {
                $check_name = $conn->prepare("SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id != ?");
                $check_name->bind_param("si", $nombre, $id);
                $check_name->execute();
                if ($check_name->get_result()->num_rows > 0) {
                    throw new Exception("Ya existe otra categoría con el nombre '$nombre'");
                }
            }
        }
        
        // Construir consulta de actualización dinámicamente
        $updates = [];
        $params = [];
        $types = "";
        
        if ($nombre !== null) {
            $updates[] = "nombre = ?";
            $params[] = $nombre;
            $types .= "s";
        }
        
        if ($descripcion !== null) {
            $updates[] = "descripcion = ?";
            $params[] = $descripcion;
            $types .= "s";
        }
        
        if (empty($updates)) {
            throw new Exception("No hay campos para actualizar");
        }
        
        // Agregar ID al final para WHERE
        $params[] = $id;
        $types .= "i";
        
        // Ejecutar actualización
        $sql = "UPDATE categorias SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            // Obtener la categoría actualizada con conteo de productos
            $get_category = $conn->prepare("
                SELECT c.*, 
                COUNT(p.id) as total_productos,
                COUNT(CASE WHEN p.estado = 'active' THEN 1 END) as productos_activos
                FROM categorias c
                LEFT JOIN productos p ON c.id = p.categoria_id AND p.estado != 'deleted'
                WHERE c.id = ?
                GROUP BY c.id, c.nombre, c.descripcion, c.fecha_creacion
            ");
            $get_category->bind_param("i", $id);
            $get_category->execute();
            $category_result = $get_category->get_result()->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => 'Categoría actualizada exitosamente',
                'categoria' => [
                    'id' => (int)$category_result['id'],
                    'nombre' => $category_result['nombre'],
                    'descripcion' => $category_result['descripcion'],
                    'fecha_creacion' => $category_result['fecha_creacion'],
                    'total_productos' => (int)$category_result['total_productos'],
                    'productos_activos' => (int)$category_result['productos_activos']
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al actualizar categoría: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Eliminar categoría
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de categoría requerido");
        }
        
        $id = (int)$data['id'];
        
        if ($id <= 0) {
            throw new Exception("ID de categoría inválido");
        }
        
        // Verificar que la categoría existe
        $check_category = $conn->prepare("SELECT id, nombre FROM categorias WHERE id = ?");
        $check_category->bind_param("i", $id);
        $check_category->execute();
        $category_result = $check_category->get_result();
        
        if ($category_result->num_rows === 0) {
            throw new Exception("Categoría no encontrada");
        }
        
        $category_data = $category_result->fetch_assoc();
        
        // Verificar si la categoría tiene productos asociados
        $check_products = $conn->prepare("SELECT COUNT(*) as count FROM productos WHERE categoria_id = ? AND estado != 'deleted'");
        $check_products->bind_param("i", $id);
        $check_products->execute();
        $products_result = $check_products->get_result()->fetch_assoc();
        
        if ($products_result['count'] > 0) {
            throw new Exception("No se puede eliminar la categoría '{$category_data['nombre']}' porque tiene {$products_result['count']} producto(s) asociado(s). Elimine o reasigne los productos primero.");
        }
        
        // Verificar si hay productos eliminados con esta categoría
        $check_deleted_products = $conn->prepare("SELECT COUNT(*) as count FROM productos WHERE categoria_id = ? AND estado = 'deleted'");
        $check_deleted_products->bind_param("i", $id);
        $check_deleted_products->execute();
        $deleted_products_result = $check_deleted_products->get_result()->fetch_assoc();
        
        if ($deleted_products_result['count'] > 0) {
            // Si hay productos eliminados, preguntar si se quiere forzar la eliminación
            $force_delete = isset($data['force']) && $data['force'] === true;
            
            if (!$force_delete) {
                throw new Exception("La categoría tiene {$deleted_products_result['count']} producto(s) eliminado(s) asociado(s). Use force=true para eliminar de todas formas.");
            }
            
            // Actualizar productos eliminados para quitar la referencia de categoría
            $update_deleted = $conn->prepare("UPDATE productos SET categoria_id = NULL WHERE categoria_id = ? AND estado = 'deleted'");
            $update_deleted->bind_param("i", $id);
            $update_deleted->execute();
        }
        
        // Eliminar categoría
        $stmt = $conn->prepare("DELETE FROM categorias WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => "Categoría '{$category_data['nombre']}' eliminada exitosamente",
                'categoria_nombre' => $category_data['nombre']
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al eliminar categoría: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Cerrar conexión
if (isset($conn)) {
    $conn->close();
}
?>