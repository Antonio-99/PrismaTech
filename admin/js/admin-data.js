// ======== Cargar Productos ========
function cargarProductos() {
    fetch('../backend/productos.php')
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById('products-table');
            const count = document.getElementById('products-count');
            table.innerHTML = '';
            
            data.forEach(p => {
                table.innerHTML += `
                    <tr>
                        <td>${p.nombre}</td>
                        <td>${p.categoria}</td>
                        <td>${p.sku}</td>
                        <td>${p.stock}</td>
                        <td>${p.estado}</td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="editarProducto(${p.id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${p.id})">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
            count.textContent = `${data.length} productos`;
        })
        .catch(err => console.error('Error cargando productos:', err));
}

// ======== Cargar Clientes ========
function cargarClientes() {
    fetch('../backend/clientes.php')
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById('customers-table');
            table.innerHTML = '';
            
            data.forEach(c => {
                table.innerHTML += `
                    <tr>
                        <td>${c.nombre}</td>
                        <td>${c.email || ''}</td>
                        <td>${c.telefono || ''}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="editarCliente(${c.id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarCliente(${c.id})">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
        })
        .catch(err => console.error('Error cargando clientes:', err));
}

// ======== Cargar Ventas ========
function cargarVentas() {
    fetch('../backend/ventas.php')
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById('sales-table');
            table.innerHTML = '';
            
            data.forEach(v => {
                table.innerHTML += `
                    <tr>
                        <td>${v.fecha}</td>
                        <td>${v.cliente || ''}</td>
                        <td>-</td>
                        <td>$${parseFloat(v.total).toFixed(2)}</td>
                        <td>${v.estado}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="verVenta(${v.id})">Ver</button>
                        </td>
                    </tr>
                `;
            });
        })
        .catch(err => console.error('Error cargando ventas:', err));
}

// ======== Cargar todo al iniciar ========
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarClientes();
    cargarVentas();
});
