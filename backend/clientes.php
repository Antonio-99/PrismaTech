<?php
include 'config.php';

// Obtener todos los clientes
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT * FROM clientes";
    $result = $conn->query($sql);
    $clientes = [];

    while ($row = $result->fetch_assoc()) {
        $clientes[] = $row;
    }
    echo json_encode($clientes);
}

// Agregar cliente
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $sql = "INSERT INTO clientes (nombre, email, telefono)
            VALUES ('{$data['nombre']}', '{$data['email']}', '{$data['telefono']}')";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}

// Actualizar cliente
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $sql = "UPDATE clientes 
            SET nombre='{$data['nombre']}', email='{$data['email']}', telefono='{$data['telefono']}'
            WHERE id={$data['id']}";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}

// Eliminar cliente
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(file_get_contents("php://input"), $data);
    $sql = "DELETE FROM clientes WHERE id={$data['id']}";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}
?>
