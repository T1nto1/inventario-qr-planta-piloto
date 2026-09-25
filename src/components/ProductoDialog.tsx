import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, X, ImagePlus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUrlsFotos } from "@/components/Fotos";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actualizarProducto,
  crearProducto,
  UNIDADES,
  UNIDADES_DIM,
  CATEGORIAS,
  MAX_FOTOS,
  listarFotos,
  subirFoto,
  eliminarFoto,
  eliminarProducto,
  validarArchivoFoto,
  type Foto,
  type Producto,
  type ProductoInput,
} from "@/lib/inventario";

const VACIO: ProductoInput = {
  codigo: "",
  producto: "",
  categoria: "",
  descripcion: "",
  unidad: "un",
  ubicacion: "",
  stock_actual: 0,
  stock_minimo: 0,
  activo: true,
  diametro_interno: null,
  diametro_externo: null,
  largo: null,
  espesor: null,
  unidad_dimensional: "mm",
};

const DIMS = [
  ["diametro_interno", "Diámetro interno"],
  ["diametro_externo", "Diámetro externo"],
  ["largo", "Largo"],
  ["espesor", "Espesor"],
] as const;

export function ProductoDialog({
  producto,
  abierto,
  onOpenChange,
}: {
  producto?: Producto | null;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<ProductoInput>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [catOtra, setCatOtra] = useState(false);
  const [nuevasFotos, setNuevasFotos] = useState<File[]>([]);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const fotos = useQuery({
    queryKey: ["fotos", producto?.id],
    queryFn: () => listarFotos(producto!.id),
    enabled: abierto && !!producto?.id,
  });
  const existentes = fotos.data ?? [];
  const urls = useUrlsFotos(existentes.map((f) => f.storage_path));
  const previews = useMemo(() => nuevasFotos.map((f) => URL.createObjectURL(f)), [nuevasFotos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const cupo = MAX_FOTOS - existentes.length - nuevasFotos.length;

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setNuevasFotos([]);
    setConfirmarBorrar(false);
    setCatOtra(!!producto?.categoria && !CATEGORIAS.includes(producto.categoria));
    setForm(
      producto
        ? {
            codigo: producto.codigo,
            producto: producto.producto,
            categoria: producto.categoria,
            descripcion: producto.descripcion,
            unidad: producto.unidad,
            ubicacion: producto.ubicacion,
            stock_actual: Number(producto.stock_actual),
            stock_minimo: Number(producto.stock_minimo),
            activo: producto.activo,
            diametro_interno: producto.diametro_interno,
            diametro_externo: producto.diametro_externo,
            largo: producto.largo,
            espesor: producto.espesor,
            unidad_dimensional: producto.unidad_dimensional || "mm",
          }
        : VACIO,
    );
  }, [abierto, producto]);

  const mutacion = useMutation({
    mutationFn: async () => {
      let p: Producto;
      if (producto) {
        const { codigo: _c, stock_actual: _s, ...resto } = form;
        p = await actualizarProducto(producto.id, resto);
      } else {
        p = await crearProducto(form);
      }
      const fallos: string[] = [];
      let orden = existentes.length;
      for (const f of nuevasFotos) {
        try {
          await subirFoto(p.id, f, orden++);
        } catch (e) {
          fallos.push(`${f.name}: ${(e as Error).message}`);
        }
      }
      return fallos;
    },
    onSuccess: (fallos) => {
      queryClient.invalidateQueries();
      toast.success(producto ? "Producto actualizado" : "Producto creado");
      if (fallos.length) toast.error(`Algunas fotos no se subieron: ${fallos.join("; ")}`);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrarFoto = useMutation({
    mutationFn: (f: Foto) => eliminarFoto(f),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Foto eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: () => eliminarProducto(producto!.id),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Producto eliminado");
      onOpenChange(false);
      navigate({ to: "/inventario" });
    },
    onError: (e: Error) => {
      setConfirmarBorrar(false);
      toast.error(
        e.message.includes("movimientos")
          ? "Este producto tiene movimientos registrados y no puede eliminarse. Desactívalo para conservar su historial."
          : e.message,
        { duration: 7000 },
      );
    },
  });

  function agregarArchivos(lista: FileList | null) {
    if (!lista) return;
    const validos: File[] = [];
    for (const f of Array.from(lista)) {
      const err = validarArchivoFoto(f);
      if (err) toast.error(err);
      else validos.push(f);
    }
    if (validos.length > cupo) toast.error(`Máximo ${MAX_FOTOS} fotos por producto`);
    setNuevasFotos((prev) => [...prev, ...validos.slice(0, Math.max(0, cupo))]);
  }

  function setDim(k: (typeof DIMS)[number][0], v: string) {
    setForm({ ...form, [k]: v === "" ? null : Number(v) });
  }

  function validar() {
    const e: Record<string, string> = {};
    if (!form.codigo.trim()) e["codigo"] = "El código es obligatorio";
    if (!form.producto.trim()) e["producto"] = "El nombre es obligatorio";
    if (Number(form.stock_actual) < 0) e["stock_actual"] = "No puede ser negativo";
    if (Number(form.stock_minimo) < 0) e["stock_minimo"] = "No puede ser negativo";
    for (const [k, t] of DIMS) {
      const v = form[k];
      if (v !== null && (Number.isNaN(v) || v < 0)) e[k] = `${t}: debe ser un número no negativo`;
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {producto
              ? "El código y el stock no se editan aquí: el stock cambia solo con movimientos."
              : "Completa los datos del producto."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (validar()) mutacion.mutate();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={form.codigo}
                disabled={!!producto}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="PER-001"
              />
              {errores["codigo"] && <p className="text-xs text-destructive">{errores["codigo"]}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="unidad">Unidad</Label>
              <Select value={form.unidad} onValueChange={(v) => setForm({ ...form, unidad: v })}>
                <SelectTrigger id="unidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="producto">Producto *</Label>
            <Input
              id="producto"
              value={form.producto}
              onChange={(e) => setForm({ ...form, producto: e.target.value })}
            />
            {errores["producto"] && <p className="text-xs text-destructive">{errores["producto"]}</p>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              <Select
                value={catOtra ? "__otra" : form.categoria}
                onValueChange={(v) => {
                  if (v === "__otra") {
                    setCatOtra(true);
                    setForm({ ...form, categoria: "" });
                  } else {
                    setCatOtra(false);
                    setForm({ ...form, categoria: v });
                  }
                }}
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value="__otra">Otra</SelectItem>
                </SelectContent>
              </Select>
              {catOtra && (
                <Input
                  aria-label="Categoría personalizada"
                  placeholder="Escribe la categoría"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Input
                id="ubicacion"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="stock_actual">Stock inicial</Label>
              <Input
                id="stock_actual"
                type="number"
                min={0}
                step="any"
                disabled={!!producto}
                value={form.stock_actual}
                onChange={(e) => setForm({ ...form, stock_actual: Number(e.target.value) })}
              />
              {errores["stock_actual"] && (
                <p className="text-xs text-destructive">{errores["stock_actual"]}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stock_minimo">Stock mínimo</Label>
              <Input
                id="stock_minimo"
                type="number"
                min={0}
                step="any"
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: Number(e.target.value) })}
              />
              {errores["stock_minimo"] && (
                <p className="text-xs text-destructive">{errores["stock_minimo"]}</p>
              )}
            </div>
          </div>

          <fieldset className="grid gap-3 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium">Dimensiones (opcionales)</legend>
            <div className="grid grid-cols-2 gap-3">
              {DIMS.map(([k, t]) => (
                <div key={k} className="grid gap-1.5">
                  <Label htmlFor={k} className="text-xs">
                    {t}
                  </Label>
                  <Input
                    id={k}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form[k] ?? ""}
                    onChange={(e) => setDim(k, e.target.value)}
                  />
                  {errores[k] && <p className="text-xs text-destructive">{errores[k]}</p>}
                </div>
              ))}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="unidad_dimensional" className="text-xs">
                Unidad dimensional
              </Label>
              <Select
                value={form.unidad_dimensional}
                onValueChange={(v) => setForm({ ...form, unidad_dimensional: v })}
              >
                <SelectTrigger id="unidad_dimensional">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_DIM.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium">Fotos (opcionales, máx. 3)</legend>
            <div className="flex flex-wrap gap-2">
              {existentes.map((f) => (
                <div key={f.id} className="relative size-20 overflow-hidden rounded-md border border-border bg-muted">
                  {urls.data?.[f.storage_path] && (
                    <img src={urls.data[f.storage_path]} alt="Foto" className="size-full object-cover" />
                  )}
                  <button
                    type="button"
                    title="Eliminar foto"
                    disabled={borrarFoto.isPending}
                    onClick={() => borrarFoto.mutate(f)}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-destructive shadow"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              {nuevasFotos.map((f, i) => (
                <div key={i} className="relative size-20 overflow-hidden rounded-md border border-dashed border-primary bg-muted">
                  <img src={previews[i]} alt={f.name} className="size-full object-cover" />
                  <button
                    type="button"
                    title="Quitar"
                    onClick={() => setNuevasFotos(nuevasFotos.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-destructive shadow"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              {cupo > 0 && (
                <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
                  <ImagePlus className="size-5" />
                  Agregar
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      agregarArchivos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG o WEBP · máximo 5 MB cada una.</p>
          </fieldset>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <Label htmlFor="activo">Producto activo</Label>
              <p className="text-xs text-muted-foreground">
                Los productos inactivos no admiten movimientos.
              </p>
            </div>
            <Switch
              id="activo"
              checked={form.activo}
              onCheckedChange={(v) => setForm({ ...form, activo: v })}
            />
          </div>

          {producto && confirmarBorrar && (
            <div className="grid gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p>
                ¿Eliminar definitivamente <strong>{producto.codigo}</strong>? Solo es posible si no tiene
                movimientos; si los tiene, deberás desactivarlo.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmarBorrar(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={borrar.isPending}
                  onClick={() => borrar.mutate()}
                >
                  {borrar.isPending && <Loader2 className="size-4 animate-spin" />}
                  {borrar.isPending ? "Eliminando…" : "Sí, eliminar"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {producto ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                disabled={borrar.isPending || confirmarBorrar}
                onClick={() => setConfirmarBorrar(true)}
              >
                <Trash2 className="size-4" /> Eliminar producto
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutacion.isPending}>
                {mutacion.isPending && <Loader2 className="size-4 animate-spin" />}
                {mutacion.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
