import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileSpreadsheet } from "lucide-react";
import { listarMovimientos, listarProductos } from "@/lib/inventario";
import { exportarExcel } from "@/lib/excel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/movimientos")({
  head: () => ({
    meta: [
      { title: "Movimientos – Inventario QR Planta Piloto" },
      { name: "description", content: "Historial inmutable de entradas, salidas y ajustes." },
      { property: "og:title", content: "Movimientos – Inventario QR Planta Piloto" },
      { property: "og:description", content: "Historial inmutable de entradas, salidas y ajustes." },
    ],
  }),
  component: Movimientos,
});

const TIPOS = ["TODOS", "ENTRADA", "SALIDA", "AJUSTE"] as const;

function Movimientos() {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("TODOS");

  const movimientos = useQuery({ queryKey: ["movimientos"], queryFn: () => listarMovimientos(1000) });
  const productos = useQuery({ queryKey: ["productos"], queryFn: listarProductos });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (movimientos.data ?? []).filter((m) => {
      if (tipo !== "TODOS" && m.tipo !== tipo) return false;
      if (!q) return true;
      return [m.productos?.codigo, m.productos?.producto, m.usuario, m.observacion]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [busqueda, tipo, movimientos.data]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Movimientos</h2>
        <Button
          variant="outline"
          onClick={() => exportarExcel(productos.data ?? [], movimientos.data ?? [])}
        >
          <FileSpreadsheet className="size-4" />
          <span className="hidden sm:inline">Exportar a Excel</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por código, producto, usuario u observación…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-semibold",
                tipo === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {movimientos.isLoading && <Skeleton className="h-64 w-full" />}
      {movimientos.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar: {(movimientos.error as Error).message}
        </p>
      )}

      {!movimientos.isLoading && filtrados.length === 0 && (
        <p className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay movimientos que coincidan.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-secondary-foreground">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2 text-right">Cantidad</th>
              <th className="px-3 py-2 text-right">Anterior</th>
              <th className="px-3 py-2 text-right">Posterior</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Observación</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {new Date(m.fecha_hora).toLocaleString("es-CL")}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{m.productos?.codigo}</td>
                <td className="px-3 py-2">{m.productos?.producto}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-semibold",
                      m.tipo === "ENTRADA" && "bg-success/10 text-success",
                      m.tipo === "SALIDA" && "bg-destructive/10 text-destructive",
                      m.tipo === "AJUSTE" && "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {m.tipo}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {Number(m.cantidad_firmada) > 0 ? "+" : ""}
                  {Number(m.cantidad_firmada)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {Number(m.stock_anterior)}
                </td>
                <td className="px-3 py-2 text-right">{Number(m.stock_posterior)}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.usuario}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.observacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
