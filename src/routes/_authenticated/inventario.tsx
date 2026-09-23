import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, QrCode, Pencil, FileSpreadsheet, Power } from "lucide-react";
import { toast } from "sonner";
import {
  actualizarProducto,
  listarMovimientos,
  listarProductos,
  type Producto,
} from "@/lib/inventario";
import { exportarExcel } from "@/lib/excel";
import { EstadoBadge } from "@/components/EstadoBadge";
import { QrEtiqueta } from "@/components/QrEtiqueta";
import { ProductoDialog } from "@/components/ProductoDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario – Planta Piloto" },
      { name: "description", content: "Listado de productos, stock, estados y etiquetas QR." },
      { property: "og:title", content: "Inventario – Planta Piloto" },
      { property: "og:description", content: "Listado de productos, stock, estados y etiquetas QR." },
    ],
  }),
  component: Inventario,
});

function Inventario() {
  const [busqueda, setBusqueda] = useState("");
  const [qr, setQr] = useState<Producto | null>(null);
  const [editar, setEditar] = useState<Producto | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const queryClient = useQueryClient();

  const productos = useQuery({ queryKey: ["productos"], queryFn: listarProductos });
  const movimientos = useQuery({ queryKey: ["movimientos"], queryFn: () => listarMovimientos(1000) });

  const toggleActivo = useMutation({
    mutationFn: (p: Producto) => actualizarProducto(p.id, { activo: !p.activo }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      toast.success(p.activo ? "Producto activado" : "Producto desactivado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = productos.data ?? [];
    if (!q) return lista;
    return lista.filter((p) =>
      [p.codigo, p.producto, p.categoria, p.ubicacion].join(" ").toLowerCase().includes(q),
    );
  }, [busqueda, productos.data]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Inventario</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportarExcel(productos.data ?? [], movimientos.data ?? [])}
          >
            <FileSpreadsheet className="size-4" />
            <span className="hidden sm:inline">Exportar a Excel</span>
          </Button>
          <Button onClick={() => setNuevo(true)}>
            <Plus className="size-4" /> Nuevo producto
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por código, producto, categoría o ubicación…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {productos.isLoading && <Skeleton className="h-64 w-full" />}
      {productos.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar: {(productos.error as Error).message}
        </p>
      )}

      {!productos.isLoading && filtrados.length === 0 && (
        <p className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No se encontraron productos.
        </p>
      )}

      <div className="grid gap-3">
        {filtrados.map((p) => (
          <Card key={p.id} className={p.activo ? "" : "opacity-60"}>
            <CardContent className="flex flex-wrap items-center gap-3 pt-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-secondary-foreground">
                    {p.codigo}
                  </span>
                  <EstadoBadge producto={p} />
                  {!p.activo && (
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Inactivo
                    </span>
                  )}
                </div>
                <Link
                  to="/producto/$codigo"
                  params={{ codigo: p.codigo }}
                  className="mt-1 block truncate font-semibold hover:underline"
                >
                  {p.producto}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {p.categoria} · {p.ubicacion}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold">
                  {Number(p.stock_actual)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{p.unidad}</span>
                </p>
                <p className="text-xs text-muted-foreground">mín. {Number(p.stock_minimo)}</p>
              </div>

              <div className="flex gap-1">
                <Button variant="outline" size="icon" title="Ver QR" onClick={() => setQr(p)}>
                  <QrCode className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Editar"
                  onClick={() => setEditar(p)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title={p.activo ? "Desactivar" : "Activar"}
                  onClick={() => toggleActivo.mutate(p)}
                >
                  <Power className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Los productos no se eliminan: se desactivan para conservar su historial.
      </p>

      {qr && <QrEtiqueta producto={qr} abierto={!!qr} onOpenChange={(v) => !v && setQr(null)} />}
      <ProductoDialog
        producto={editar}
        abierto={!!editar}
        onOpenChange={(v) => !v && setEditar(null)}
      />
      <ProductoDialog abierto={nuevo} onOpenChange={setNuevo} />
    </div>
  );
}
