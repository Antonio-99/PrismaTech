<?php
// backend/categorias.php
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
        $sql = "SELECT c.*, COUNT(p.id) as productos_count 
                FROM categorias c 
                LEFT JOIN productos p ON c.id = p.categoria_id 
                GROUP BY c.id 
                ORDER BY c.nombre";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error en consulta: " . $conn->error);
        }
        
        $categorias = [];
        while ($row = $result->fetch_assoc()) {
            $categorias[] = [
                'id' => (int)$row['id'],
                'name' => $row['nombre'],
                'description' => $row['descripcion'],
                'icon' => $row['icono'] ?: 'fas fa-tag',
                'products_count' => (int)$row['productos_count'],
                'created_at' => $row['fecha_creacion']
            ];
        }
        echo json_encode($categorias, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener categorías: ' . $e->getMessage()]);
    }
}

// Agregar nueva categoría
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre de categoría requerido']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO categorias (nombre, descripcion, icono) VALUES (?, ?, ?)");
        
        $icon = isset($data['icon']) ? $data['icon'] : 'fas fa-tag';
        
        $stmt->bind_param("sss",
            $data['name'],
            $data['description'],
            $icon
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear categoría: ' . $e->getMessage()]);
    }
}

// Actualizar categoría
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de categoría requerido']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE categorias SET nombre=?, descripcion=?, icono=? WHERE id=?");
        
        $stmt->bind_param("sssi",
            $data['name'],
            $data['description'],
            $data['icon'],
            $data['id']
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar categoría: ' . $e->getMessage()]);
    }
}

// Eliminar categoría
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de categoría requerido']);
            exit;
        }

        // Verificar si hay productos en esta categoría
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM productos WHERE categoria_id = ?");
        $stmt->bind_param("i", $data['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['count'] > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'No se puede eliminar la categoría porque tiene productos asociados']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM categorias WHERE id = ?");
        $stmt->bind_param("i", $data['id']);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar categoría: ' . $e->getMessage()]);
    }
}

$conn->close();
?>