import { supabase } from "@/integrations/supabase/client";

export interface Producto {
  id: string;
  codigo: string;
  producto: string;
  categoria: string;
  descripcion: string;
  unidad: string;
  ubicacion: string;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Movimiento {
  id: string;
  product_id: string;
  fecha_hora: string;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  cantidad_firmada: number;
  stock_anterior: number;
  stock_posterior: number;
  usuario: string;
  observacion: string;
}

export type Estado = "OK" | "REPOSICION" | "SIN_STOCK";

export const UNIDADES = ["un", "kg", "m", "L", "caja", "rollo", "otra"];

export function estadoDe(p: Pick<Producto, "stock_actual" | "stock_minimo">): Estado {
  if (Number(p.stock_actual) <= 0) return "SIN_STOCK";
  if (Number(p.stock_actual) <= Number(p.stock_minimo)) return "REPOSICION";
  return "OK";
}

export const etiquetaEstado: Record<Estado, string> = {
  OK: "OK",
  REPOSICION: "REPOSICIÓN",
  SIN_STOCK: "SIN STOCK",
};

export async function listarProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("codigo", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Producto[];
}

export async function obtenerProductoPorCodigo(codigo: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Producto) ?? null;
}

export async function listarMovimientos(limite = 500): Promise<(Movimiento & { productos: Pick<Producto, "codigo" | "producto"> | null })[]> {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, productos(codigo, producto)")
    .order("fecha_hora", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function listarMovimientosDeProducto(productId: string) {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*")
    .eq("product_id", productId)
    .order("fecha_hora", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Movimiento[];
}

export async function moverStock(params: {
  productId: string;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  observacion?: string;
}): Promise<Movimiento> {
  const { data, error } = await supabase.rpc("mover_stock", {
    p_product_id: params.productId,
    p_tipo: params.tipo,
    p_cantidad: params.cantidad,
    p_observacion: params.observacion ?? "",
  });
  if (error) throw new Error(traducirError(error.message));
  return data as unknown as Movimiento;
}

function traducirError(msg: string) {
  if (msg.includes("Stock insuficiente")) return msg;
  if (msg.includes("row-level security") || msg.includes("permission"))
    return "No tienes permisos para realizar esta acción.";
  if (msg.includes("duplicate key")) return "Ya existe un producto con ese código.";
  return msg;
}

export type ProductoInput = Omit<Producto, "id" | "created_at" | "updated_at">;

export async function crearProducto(input: ProductoInput) {
  const { data, error } = await supabase.from("productos").insert(input).select().single();
  if (error) throw new Error(traducirError(error.message));
  return data as Producto;
}

export async function actualizarProducto(id: string, input: Partial<ProductoInput>) {
  const { data, error } = await supabase
    .from("productos")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(traducirError(error.message));
  return data as Producto;
}
