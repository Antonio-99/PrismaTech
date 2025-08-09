<?php
include 'config.php';

// Obtener todas las categorías
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT * FROM categorias";
    $result = $conn->query($sql);
    $categorias = [];

    while ($row = $result->fetch_assoc()) {
        $categorias[] = $row;
    }
    echo json_encode($categorias);
}

// Agregar nueva categoría
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $sql = "INSERT INTO categorias (nombre, descripcion)
            VALUES ('{$data['nombre']}', '{$data['descripcion']}')";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}
?>
