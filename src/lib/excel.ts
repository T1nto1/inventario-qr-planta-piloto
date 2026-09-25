import * as XLSX from "xlsx";
import { estadoDe, etiquetaEstado, type Movimiento, type Producto } from "./inventario";

type MovConProducto = Movimiento & { productos: Pick<Producto, "codigo" | "producto"> | null };

export function exportarExcel(productos: Producto[], movimientos: MovConProducto[]) {
  const inventario = productos.map((p) => ({
    Código: p.codigo,
    Producto: p.producto,
    Categoría: p.categoria,
    Descripción: p.descripcion,
    Unidad: p.unidad,
    Ubicación: p.ubicacion,
    "Stock Actual": Number(p.stock_actual),
    "Stock Mínimo": Number(p.stock_minimo),
    Estado: etiquetaEstado[estadoDe(p)],
    Activo: p.activo ? "Sí" : "No",
    "Diámetro interno": p.diametro_interno ?? "",
    "Diámetro externo": p.diametro_externo ?? "",
    Largo: p.largo ?? "",
    Espesor: p.espesor ?? "",
    "Unidad dimensional": p.unidad_dimensional ?? "",
    "N° fotos": p.producto_fotos?.length ?? 0,
  }));

  const movs = movimientos.map((m) => ({
    Fecha: new Date(m.fecha_hora).toLocaleString("es-CL"),
    Código: m.productos?.codigo ?? "",
    Producto: m.productos?.producto ?? "",
    Tipo: m.tipo,
    Cantidad: Number(m.cantidad),
    "Stock Anterior": Number(m.stock_anterior),
    "Stock Posterior": Number(m.stock_posterior),
    Usuario: m.usuario,
    Observación: m.observacion,
  }));

  const wb = XLSX.utils.book_new();
  const hoja1 = XLSX.utils.json_to_sheet(inventario);
  const hoja2 = XLSX.utils.json_to_sheet(movs);
  hoja1["!cols"] = [12, 30, 22, 34, 8, 26, 12, 12, 14, 8, 14, 14, 10, 10, 12, 9].map((w) => ({ wch: w }));
  hoja2["!cols"] = [20, 12, 30, 10, 10, 14, 14, 26, 34].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, hoja1, "Inventario");
  XLSX.utils.book_append_sheet(wb, hoja2, "Movimientos");

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `inventario-planta-piloto-${fecha}.xlsx`);
}
