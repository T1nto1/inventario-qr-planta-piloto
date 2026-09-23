import { estadoDe, etiquetaEstado, type Producto } from "@/lib/inventario";
import { cn } from "@/lib/utils";

export function EstadoBadge({
  producto,
  className,
}: {
  producto: Pick<Producto, "stock_actual" | "stock_minimo">;
  className?: string;
}) {
  const estado = estadoDe(producto);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        estado === "OK" && "border-success/30 bg-success/10 text-success",
        estado === "REPOSICION" && "border-warning/40 bg-warning/15 text-warning-foreground",
        estado === "SIN_STOCK" && "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {etiquetaEstado[estado]}
    </span>
  );
}
