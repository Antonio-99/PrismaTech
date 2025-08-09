<?php
include 'config.php';

// Obtener configuración
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT * FROM configuracion WHERE id=1";
    $result = $conn->query($sql);
    $config = $result->fetch_assoc();
    echo json_encode($config);
}

// Actualizar configuración
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $sql = "UPDATE configuracion SET
                nombre_empresa='{$data['nombre_empresa']}',
                rfc='{$data['rfc']}',
                telefono='{$data['telefono']}',
                whatsapp='{$data['whatsapp']}',
                email='{$data['email']}',
                sitio_web='{$data['sitio_web']}',
                direccion='{$data['direccion']}',
                moneda='{$data['moneda']}'
            WHERE id=1";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}
?>
