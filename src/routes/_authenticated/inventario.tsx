import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, QrCode, Pencil, FileSpreadsheet, Power, ExternalLink, ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { Miniatura } from "@/components/Fotos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  actualizarProducto,
  listarMovimientos,
  listarProductos,
  CATEGORIAS,
  TIPOS_REACTIVO,
  PORCENTAJES_REACTIVO,
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
  const [categoria, setCategoria] = useState("__todas");
  const [proveedor, setProveedor] = useState("__todos");
  const [campana, setCampana] = useState("__todas");
  const [tipoReactivo, setTipoReactivo] = useState("__todos");
  const [origen, setOrigen] = useState("__todos");
  const [avanzados, setAvanzados] = useState(false);
  const [rangos, setRangos] = useState<
    Record<(typeof PORCENTAJES_REACTIVO)[number][0], { min: string; max: string }>
  >({
    porcentaje_cu: { min: "", max: "" },
    porcentaje_fe: { min: "", max: "" },
    porcentaje_sio2: { min: "", max: "" },
    porcentaje_s: { min: "", max: "" },
  });
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
    return (productos.data ?? []).filter((p) => {
      if (categoria !== "__todas" && p.categoria !== categoria) return false;
      if (
        q &&
        ![p.codigo, p.producto, p.categoria, p.ubicacion, p.proveedor ?? "", p.origen ?? "", p.campana ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (proveedor !== "__todos" && p.proveedor !== proveedor) return false;
      if (campana !== "__todas" && p.campana !== campana) return false;
      if (tipoReactivo === "__sin_especificar" ? p.tipo_reactivo !== null : tipoReactivo !== "__todos" && p.tipo_reactivo !== tipoReactivo)
        return false;
      if (origen !== "__todos" && p.origen !== origen) return false;
      for (const [k] of PORCENTAJES_REACTIVO) {
        const v = p[k];
        const { min, max } = rangos[k];
        const minN = min === "" ? null : Number(min);
        const maxN = max === "" ? null : Number(max);
        if (minN !== null && !Number.isNaN(minN) && (v === null || Number(v) < minN)) return false;
        if (maxN !== null && !Number.isNaN(maxN) && (v === null || Number(v) > maxN)) return false;
      }
      return true;
    });
  }, [busqueda, categoria, proveedor, campana, tipoReactivo, origen, rangos, productos.data]);

  const categorias = useMemo(() => {
    const extra = (productos.data ?? [])
      .map((p) => p.categoria)
      .filter((c) => c && !CATEGORIAS.includes(c));
    return [...CATEGORIAS, ...Array.from(new Set(extra)).sort()];
  }, [productos.data]);

  const proveedores = useMemo(
    () =>
      Array.from(
        new Set((productos.data ?? []).map((p) => p.proveedor).filter((v): v is string => !!v)),
      ).sort(),
    [productos.data],
  );

  const origenes = useMemo(
    () =>
      Array.from(
        new Set((productos.data ?? []).map((p) => p.origen).filter((v): v is string => !!v)),
      ).sort(),
    [productos.data],
  );

  const campanas = useMemo(
    () =>
      Array.from(
        new Set((productos.data ?? []).map((p) => p.campana).filter((v): v is string => !!v)),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [productos.data],
  );

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

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px_200px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por código, producto, categoría, ubicación, proveedor u origen…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger aria-label="Filtrar por categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={proveedor} onValueChange={setProveedor}>
          <SelectTrigger aria-label="Filtrar por proveedor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos">Todos los proveedores</SelectItem>
            {proveedores.map((pr) => (
              <SelectItem key={pr} value={pr}>
                {pr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campana} onValueChange={setCampana}>
          <SelectTrigger aria-label="Filtrar por campaña">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas">Todas las campañas</SelectItem>
            {campanas.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border">
        <button
          type="button"
          onClick={() => setAvanzados((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Filtros avanzados
          <SlidersHorizontal className="size-4" />
        </button>
        {avanzados && (
          <div className="grid gap-3 border-t border-border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={tipoReactivo} onValueChange={setTipoReactivo}>
                <SelectTrigger aria-label="Filtrar por tipo de reactivo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos">Todos los tipos</SelectItem>
                  {TIPOS_REACTIVO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value="__sin_especificar">Sin especificar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={origen} onValueChange={setOrigen}>
                <SelectTrigger aria-label="Filtrar por origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos">Todos los orígenes</SelectItem>
                  {origenes.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PORCENTAJES_REACTIVO.map(([k, t]) => (
                <div key={k} className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{t} (mín–máx)</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      placeholder="mín"
                      aria-label={`${t} mínimo`}
                      value={rangos[k].min}
                      onChange={(e) =>
                        setRangos({ ...rangos, [k]: { ...rangos[k], min: e.target.value } })
                      }
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      placeholder="máx"
                      aria-label={`${t} máximo`}
                      value={rangos[k].max}
                      onChange={(e) =>
                        setRangos({ ...rangos, [k]: { ...rangos[k], max: e.target.value } })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Rangos entre 0 y 100. Los productos sin dato informado no se incluyen al filtrar por rango.
            </p>
          </div>
        )}
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
              <Miniatura
                path={[...(p.producto_fotos ?? [])].sort((a, b) => a.orden - b.orden)[0]?.storage_path}
                alt={p.producto}
              />
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
                  {p.proveedor ? ` · ${p.proveedor}` : ""}
                  {p.campana ? ` · Campaña: ${p.campana}` : ""}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold">
                  {Number(p.stock_actual)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{p.unidad}</span>
                </p>
                <p className="text-xs text-muted-foreground">mín. {Number(p.stock_minimo)}</p>
              </div>

              <div className="flex w-full flex-wrap gap-1 sm:w-auto">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/producto/$codigo" params={{ codigo: p.codigo }}>
                    <ExternalLink className="size-4" /> Abrir
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/producto/$codigo" params={{ codigo: p.codigo }} hash="movimiento">
                    <ArrowLeftRight className="size-4" /> Movimiento
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditar(p)}>
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button variant="outline" size="icon" title="Ver QR" onClick={() => setQr(p)}>
                  <QrCode className="size-4" />
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
        Solo se pueden eliminar productos sin movimientos; los demás se desactivan para conservar su historial.
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
