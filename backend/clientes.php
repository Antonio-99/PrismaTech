<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todos los clientes
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT * FROM clientes ORDER BY nombre";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error en consulta: " . $conn->error);
        }
        
        $clientes = [];
        while ($row = $result->fetch_assoc()) {
            $clientes[] = [
                'id' => (int)$row['id'],
                'nombre' => $row['nombre'],
                'email' => $row['email'],
                'telefono' => $row['telefono'],
                'fecha_registro' => $row['fecha_registro']
            ];
        }
        
        echo json_encode($clientes, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Agregar cliente
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            throw new Exception("Datos inválidos");
        }
        
        // Validar campos requeridos
        if (!isset($data['nombre']) || empty(trim($data['nombre']))) {
            throw new Exception("El nombre del cliente es requerido");
        }
        
        $nombre = trim($data['nombre']);
        $email = isset($data['email']) ? trim($data['email']) : null;
        $telefono = isset($data['telefono']) ? trim($data['telefono']) : null;
        
        // Validar email si se proporciona
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("El formato del email no es válido");
        }
        
        // Verificar que el email no exista (si se proporciona)
        if ($email) {
            $check_email = $conn->prepare("SELECT id FROM clientes WHERE email = ?");
            $check_email->bind_param("s", $email);
            $check_email->execute();
            if ($check_email->get_result()->num_rows > 0) {
                throw new Exception("Ya existe un cliente con ese email");
            }
        }
        
        // Insertar nuevo cliente
        $stmt = $conn->prepare("INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $nombre, $email, $telefono);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Cliente creado exitosamente',
                'id' => $conn->insert_id
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al crear cliente: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Actualizar cliente
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de cliente requerido");
        }
        
        // Validar campos requeridos
        if (!isset($data['nombre']) || empty(trim($data['nombre']))) {
            throw new Exception("El nombre del cliente es requerido");
        }
        
        $id = (int)$data['id'];
        $nombre = trim($data['nombre']);
        $email = isset($data['email']) ? trim($data['email']) : null;
        $telefono = isset($data['telefono']) ? trim($data['telefono']) : null;
        
        // Verificar que el cliente existe
        $check_client = $conn->prepare("SELECT id FROM clientes WHERE id = ?");
        $check_client->bind_param("i", $id);
        $check_client->execute();
        if ($check_client->get_result()->num_rows === 0) {
            throw new Exception("Cliente no encontrado");
        }
        
        // Validar email si se proporciona
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("El formato del email no es válido");
        }
        
        // Verificar que el email no esté duplicado (excepto para el mismo cliente)
        if ($email) {
            $check_email = $conn->prepare("SELECT id FROM clientes WHERE email = ? AND id != ?");
            $check_email->bind_param("si", $email, $id);
            $check_email->execute();
            if ($check_email->get_result()->num_rows > 0) {
                throw new Exception("Ya existe otro cliente con ese email");
            }
        }
        
        // Actualizar cliente
        $stmt = $conn->prepare("UPDATE clientes SET nombre = ?, email = ?, telefono = ? WHERE id = ?");
        $stmt->bind_param("sssi", $nombre, $email, $telefono, $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Cliente actualizado exitosamente'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al actualizar cliente: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Eliminar cliente
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de cliente requerido");
        }
        
        $id = (int)$data['id'];
        
        // Verificar que el cliente existe
        $check_client = $conn->prepare("SELECT id FROM clientes WHERE id = ?");
        $check_client->bind_param("i", $id);
        $check_client->execute();
        if ($check_client->get_result()->num_rows === 0) {
            throw new Exception("Cliente no encontrado");
        }
        
        // Verificar si el cliente tiene ventas asociadas
        $check_sales = $conn->prepare("SELECT COUNT(*) as count FROM ventas WHERE cliente_id = ?");
        $check_sales->bind_param("i", $id);
        $check_sales->execute();
        $sales_result = $check_sales->get_result()->fetch_assoc();
        
        if ($sales_result['count'] > 0) {
            throw new Exception("No se puede eliminar el cliente porque tiene ventas asociadas");
        }
        
        // Eliminar cliente
        $stmt = $conn->prepare("DELETE FROM clientes WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Cliente eliminado exitosamente'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al eliminar cliente: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

$conn->close();
?>