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
  diametro_interno: number | null;
  diametro_externo: number | null;
  largo: number | null;
  espesor: number | null;
  unidad_dimensional: string;
  producto_fotos?: { storage_path: string; orden: number }[];
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
    .select("*, producto_fotos(storage_path, orden)")
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

export type ProductoInput = Omit<Producto, "id" | "created_at" | "updated_at" | "producto_fotos">;

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

export const CATEGORIAS = [
  "Tubos", "Lanzas", "Reactivos químicos", "Instrumentación", "Insumos básicos", "Crisoles",
  "Resistencias", "Tapas de horno", "Termocuplas", "Sondas", "O-rings",
];
export const UNIDADES_DIM = ["mm", "cm", "m"] as const;
export const BUCKET_FOTOS = "producto-fotos";
export const MAX_FOTOS = 3;
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

export interface Foto {
  id: string;
  product_id: string;
  storage_path: string;
  orden: number;
}

export function validarArchivoFoto(f: File): string | null {
  if (!TIPOS_FOTO.includes(f.type)) return `${f.name}: solo JPG, PNG o WEBP`;
  if (f.size > MAX_BYTES_FOTO) return `${f.name}: supera 5 MB`;
  return null;
}

export async function listarFotos(productId: string): Promise<Foto[]> {
  const { data, error } = await supabase
    .from("producto_fotos")
    .select("*")
    .eq("product_id", productId)
    .order("orden")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Foto[];
}

export async function urlsFirmadas(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(paths, 3600);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

export async function subirFoto(productId: string, file: File, orden: number) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace("jpeg", "jpg");
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET_FOTOS).upload(path, file, { contentType: file.type });
  if (up.error) throw new Error(up.error.message);
  const { error } = await supabase
    .from("producto_fotos")
    .insert({ product_id: productId, storage_path: path, orden });
  if (error) {
    await supabase.storage.from(BUCKET_FOTOS).remove([path]);
    throw new Error(error.message.includes("Máximo") ? "Máximo 3 fotos por producto" : error.message);
  }
}

export async function eliminarFoto(foto: Foto) {
  const { error } = await supabase.from("producto_fotos").delete().eq("id", foto.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET_FOTOS).remove([foto.storage_path]);
}

export async function eliminarProducto(productId: string) {
  const { data, error } = await supabase.rpc("eliminar_producto", { p_product_id: productId });
  if (error) throw new Error(error.message);
  const paths = (data ?? []) as string[];
  if (paths.length) await supabase.storage.from(BUCKET_FOTOS).remove(paths);
}
