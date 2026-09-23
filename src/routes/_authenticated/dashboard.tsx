import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, AlertTriangle, XCircle, Activity, FileSpreadsheet } from "lucide-react";
import { estadoDe, listarMovimientos, listarProductos } from "@/lib/inventario";
import { exportarExcel } from "@/lib/excel";
import { EstadoBadge } from "@/components/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – Inventario QR Planta Piloto" },
      { name: "description", content: "Resumen de stock, alertas y movimientos recientes." },
      { property: "og:title", content: "Dashboard – Inventario QR Planta Piloto" },
      { property: "og:description", content: "Resumen de stock, alertas y movimientos recientes." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const productos = useQuery({ queryKey: ["productos"], queryFn: listarProductos });
  const movimientos = useQuery({ queryKey: ["movimientos"], queryFn: () => listarMovimientos(200) });

  if (productos.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (productos.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        No se pudo cargar el inventario: {(productos.error as Error).message}
      </p>
    );
  }

  const lista = (productos.data ?? []).filter((p) => p.activo);
  const bajos = lista.filter((p) => estadoDe(p) === "REPOSICION");
  const sinStock = lista.filter((p) => estadoDe(p) === "SIN_STOCK");
  const movs = movimientos.data ?? [];
  const hace24h = movs.filter(
    (m) => Date.now() - new Date(m.fecha_hora).getTime() < 24 * 3600 * 1000,
  );

  const kpis = [
    { t: "Total productos", v: lista.length, icon: Package, color: "text-primary" },
    { t: "Stock bajo", v: bajos.length, icon: AlertTriangle, color: "text-warning" },
    { t: "Sin stock", v: sinStock.length, icon: XCircle, color: "text-destructive" },
    { t: "Movimientos 24 h", v: hace24h.length, icon: Activity, color: "text-success" },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <Button
          variant="outline"
          onClick={() => exportarExcel(productos.data ?? [], movs)}
          disabled={movimientos.isLoading}
        >
          <FileSpreadsheet className="size-4" /> Exportar a Excel
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.t}>
            <CardContent className="flex items-center gap-4 pt-6">
              <k.icon className={`size-8 ${k.color}`} />
              <div>
                <p className="text-2xl font-bold">{k.v}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.t}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requieren atención</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[...sinStock, ...bajos].length === 0 && (
              <p className="text-sm text-muted-foreground">Todo el inventario está en nivel OK.</p>
            )}
            {[...sinStock, ...bajos].slice(0, 8).map((p) => (
              <Link
                key={p.id}
                to="/producto/$codigo"
                params={{ codigo: p.codigo }}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.producto}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.codigo} · {Number(p.stock_actual)} {p.unidad} (mín. {Number(p.stock_minimo)})
                  </p>
                </div>
                <EstadoBadge producto={p} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos recientes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {movimientos.isLoading && <Skeleton className="h-20 w-full" />}
            {!movimientos.isLoading && movs.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay movimientos registrados.</p>
            )}
            {movs.slice(0, 8).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.productos?.producto ?? "Producto"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.fecha_hora).toLocaleString("es-CL")} · {m.usuario}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    Number(m.cantidad_firmada) >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {Number(m.cantidad_firmada) > 0 ? "+" : ""}
                  {Number(m.cantidad_firmada)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
