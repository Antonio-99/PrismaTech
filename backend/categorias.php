<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todas las categorías
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT * FROM categorias ORDER BY nombre";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error en consulta: " . $conn->error);
        }
        
        $categorias = [];
        while ($row = $result->fetch_assoc()) {
            $categorias[] = [
                'id' => (int)$row['id'],
                'nombre' => $row['nombre'],
                'descripcion' => $row['descripcion'],
                'fecha_creacion' => $row['fecha_creacion']
            ];
        }
        
        echo json_encode($categorias, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Agregar nueva categoría
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            throw new Exception("Datos inválidos");
        }
        
        // Validar campos requeridos
        if (!isset($data['nombre']) || empty(trim($data['nombre']))) {
            throw new Exception("El nombre de la categoría es requerido");
        }
        
        // Verificar que el nombre no exista
        $check_name = $conn->prepare("SELECT id FROM categorias WHERE nombre = ?");
        $nombre = trim($data['nombre']);
        $check_name->bind_param("s", $nombre);
        $check_name->execute();
        if ($check_name->get_result()->num_rows > 0) {
            throw new Exception("Ya existe una categoría con ese nombre");
        }
        
        // Insertar nueva categoría
        $stmt = $conn->prepare("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)");
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
        
        $stmt->bind_param("ss", $nombre, $descripcion);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Categoría creada exitosamente',
                'id' => $conn->insert_id
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al crear categoría: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Actualizar categoría
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de categoría requerido");
        }
        
        // Validar campos requeridos
        if (!isset($data['nombre']) || empty(trim($data['nombre']))) {
            throw new Exception("El nombre de la categoría es requerido");
        }
        
        $id = (int)$data['id'];
        $nombre = trim($data['nombre']);
        
        // Verificar que la categoría existe
        $check_category = $conn->prepare("SELECT id FROM categorias WHERE id = ?");
        $check_category->bind_param("i", $id);
        $check_category->execute();
        if ($check_category->get_result()->num_rows === 0) {
            throw new Exception("Categoría no encontrada");
        }
        
        // Verificar que el nombre no esté duplicado (excepto para la misma categoría)
        $check_name = $conn->prepare("SELECT id FROM categorias WHERE nombre = ? AND id != ?");
        $check_name->bind_param("si", $nombre, $id);
        $check_name->execute();
        if ($check_name->get_result()->num_rows > 0) {
            throw new Exception("Ya existe otra categoría con ese nombre");
        }
        
        // Actualizar categoría
        $stmt = $conn->prepare("UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?");
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
        
        $stmt->bind_param("ssi", $nombre, $descripcion, $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Categoría actualizada exitosamente'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al actualizar categoría: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
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
        
        // Verificar que la categoría existe
        $check_category = $conn->prepare("SELECT id FROM categorias WHERE id = ?");
        $check_category->bind_param("i", $id);
        $check_category->execute();
        if ($check_category->get_result()->num_rows === 0) {
            throw new Exception("Categoría no encontrada");
        }
        
        // Verificar si la categoría tiene productos asociados
        $check_products = $conn->prepare("SELECT COUNT(*) as count FROM productos WHERE categoria_id = ?");
        $check_products->bind_param("i", $id);
        $check_products->execute();
        $products_result = $check_products->get_result()->fetch_assoc();
        
        if ($products_result['count'] > 0) {
            throw new Exception("No se puede eliminar la categoría porque tiene productos asociados");
        }
        
        // Eliminar categoría
        $stmt = $conn->prepare("DELETE FROM categorias WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Categoría eliminada exitosamente'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al eliminar categoría: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

$conn->close();
?>