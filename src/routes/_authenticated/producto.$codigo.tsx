import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QrCode, Pencil, ArrowLeft } from "lucide-react";
import {
  listarMovimientosDeProducto,
  obtenerProductoPorCodigo,
  type Producto,
} from "@/lib/inventario";
import { EstadoBadge } from "@/components/EstadoBadge";
import { QrEtiqueta } from "@/components/QrEtiqueta";
import { MovimientoForm } from "@/components/MovimientoForm";
import { ProductoDialog } from "@/components/ProductoDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/producto/$codigo")({
  head: ({ params }) => ({
    meta: [
      { title: `Producto ${params.codigo} – Inventario Planta Piloto` },
      {
        name: "description",
        content: `Ficha del producto ${params.codigo}: stock actual, ubicación y registro de entradas y salidas.`,
      },
      { property: "og:title", content: `Producto ${params.codigo} – Inventario Planta Piloto` },
      {
        property: "og:description",
        content: `Ficha del producto ${params.codigo}: stock, ubicación y movimientos.`,
      },
    ],
  }),
  component: FichaProducto,
});

function FichaProducto() {
  const { codigo } = Route.useParams();
  const { esAdmin } = useAuth();
  const [qr, setQr] = useState(false);
  const [editar, setEditar] = useState(false);

  const producto = useQuery({
    queryKey: ["producto", codigo],
    queryFn: () => obtenerProductoPorCodigo(codigo),
  });

  const movimientos = useQuery({
    queryKey: ["movimientos-producto", producto.data?.id],
    queryFn: () => listarMovimientosDeProducto(producto.data!.id),
    enabled: !!producto.data?.id,
  });

  if (producto.isLoading) return <Skeleton className="h-72 w-full" />;

  if (producto.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar el producto: {(producto.error as Error).message}
      </p>
    );
  }

  if (!producto.data) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="font-semibold">No existe un producto con el código {codigo}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifica la etiqueta o busca el producto en el inventario.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/inventario">Ir al inventario</Link>
        </Button>
      </div>
    );
  }

  const p: Producto = producto.data;

  return (
    <div className="grid gap-5">
      <Link
        to="/inventario"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Inventario
      </Link>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
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
              <h2 className="mt-2 text-xl font-semibold">{p.producto}</h2>
              <p className="text-sm text-muted-foreground">{p.descripcion}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setQr(true)}>
                <QrCode className="size-4" /> Ver QR
              </Button>
              {esAdmin && (
                <Button variant="outline" onClick={() => setEditar(true)}>
                  <Pencil className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { t: "Stock actual", v: `${Number(p.stock_actual)} ${p.unidad}` },
              { t: "Stock mínimo", v: `${Number(p.stock_minimo)} ${p.unidad}` },
              { t: "Categoría", v: p.categoria || "—" },
              { t: "Ubicación", v: p.ubicacion || "—" },
            ].map((d) => (
              <div key={d.t} className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.t}</p>
                <p className="mt-1 font-semibold">{d.v}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <MovimientoForm producto={p} permitirAjuste={esAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial del producto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {movimientos.isLoading && <Skeleton className="h-20 w-full" />}
          {!movimientos.isLoading && (movimientos.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
          )}
          {(movimientos.data ?? []).map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {m.tipo} · {Number(m.cantidad_firmada) > 0 ? "+" : ""}
                  {Number(m.cantidad_firmada)} {p.unidad}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.fecha_hora).toLocaleString("es-CL")} · {m.usuario}
                  {m.observacion ? ` · ${m.observacion}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {Number(m.stock_anterior)} → {Number(m.stock_posterior)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <QrEtiqueta producto={p} abierto={qr} onOpenChange={setQr} />
      <ProductoDialog producto={p} abierto={editar} onOpenChange={setEditar} />
    </div>
  );
}
