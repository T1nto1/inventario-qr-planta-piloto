# QR Stock Manager

Crea una aplicación web full-stack profesional llamada "Inventario QR – Planta Piloto" en español, optimizada para celular y escritorio.

Objetivo: gestionar inventario compartido en la nube para varias personas. Cada producto debe tener un código único y un QR que, al escanearse con la cámara del celular, abra directamente la ficha del producto. Desde esa ficha se debe poder registrar ENTRADA o SALIDA de una cantidad, con observación opcional, y actualizar el stock de forma segura.

Diseño:
- Estética industrial limpia y profesional, fondo claro, azul oscuro/gris, acentos discretos.
- Header: "Inventario QR – Planta Piloto".
- Navegación: Dashboard, Inventario, Movimientos, Escanear QR.
- Responsive mobile-first.
- Estados visibles: OK, REPOSICIÓN, SIN STOCK.
- Búsqueda por código, producto, categoría o ubicación.
- Tarjetas KPI: total productos, stock bajo, sin stock, movimientos recientes.

Productos:
- id UUID
- codigo único obligatorio
- producto/nombre
- categoría
- descripción
- unidad (un, kg, m, L, caja, rollo u otra)
- ubicación
- stock_actual numérico
- stock_minimo numérico
- activo booleano
- created_at / updated_at
- permitir crear, editar y desactivar productos.
- No permitir borrar productos con movimientos; solo desactivar.

Movimientos:
- id UUID
- product_id
- fecha_hora
- tipo: ENTRADA, SALIDA, AJUSTE
- cantidad positiva
- cantidad_firmada (+ entrada, - salida)
- stock_anterior
- stock_posterior
- usuario
- observacion
- Registrar cada movimiento de forma inmutable.

Reglas:
- Nunca permitir stock negativo.
- Para SALIDA, validar cantidad >0 y <= stock actual.
- La actualización de stock y creación del movimiento deben ocurrir de forma transaccional en la base de datos para evitar inconsistencias si dos usuarios operan simultáneamente.
- Usar una función/RPC PostgreSQL con bloqueo de fila FOR UPDATE para mover stock.
- Mostrar confirmación clara y nuevo stock.

QR:
- Cada producto tiene botón "Ver QR" y "Imprimir etiqueta".
- El QR debe codificar una URL profunda del tipo /producto/CODIGO.
- Al abrir esa URL debe cargar la ficha del producto.
- Añadir un escáner QR usando la cámara del dispositivo cuando sea posible; incluir alternativa para escribir/buscar el código manualmente.
- Etiqueta imprimible: QR, código, nombre, ubicación.

Exportación:
- Botón "Exportar a Excel".
- Generar .xlsx con dos hojas: Inventario y Movimientos.
- Inventario: Código, Producto, Categoría, Descripción, Unidad, Ubicación, Stock Actual, Stock Mínimo, Estado, Activo.
- Movimientos: Fecha, Código, Producto, Tipo, Cantidad, Stock Anterior, Stock Posterior, Usuario, Observación.

Usuarios:
- Implementar autenticación por email.
- Registrar el email del usuario en cada movimiento.
- Todos los usuarios autenticados pueden consultar y mover stock.
- Preparar roles admin/usuario: admin puede crear/editar productos; usuario puede consultar y registrar movimientos.
- No expongas claves ni secretos en frontend.

Datos iniciales de demostración:
PER-001 | Perno M10 x 50 mm | Pernos y fijaciones | un | Bodega 3 / Estante A2 | stock 100 | mínimo 30
EMP-001 | Empaquetadura 2 pulg 150# | Empaquetaduras | un | Bodega 3 / Estante C1 | stock 20 | mínimo 8
VAL-001 | Válvula bola 1/2 pulg | Válvulas | un | Bodega 2 / Estante B1 | stock 12 | mínimo 5
INS-001 | Termocupla tipo K | Instrumentación | un | Gabinete Instrumentación | stock 8 | mínimo 3
MAN-001 | Manguera aire 8 mm | Mangueras y conexiones | m | Bodega 2 / Estante D2 | stock 30 | mínimo 10

Quiero una app real, no un mockup. Deja toda la interfaz terminada, con validaciones, estados de carga/error y páginas funcionales. Si la base de datos aún no está disponible, prepara el esquema y el código para conectarlo en el siguiente paso.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inventario-qr-planta-piloto.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f581aff-f373-4527-b852-c4dfc50beb0d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
