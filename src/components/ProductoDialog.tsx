import { useEffect, useState } from "react";
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
};

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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
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
          }
        : VACIO,
    );
  }, [abierto, producto]);

  const mutacion = useMutation({
    mutationFn: async () => {
      if (producto) {
        const { codigo: _c, stock_actual: _s, ...resto } = form;
        return actualizarProducto(producto.id, resto);
      }
      return crearProducto(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(producto ? "Producto actualizado" : "Producto creado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function validar() {
    const e: Record<string, string> = {};
    if (!form.codigo.trim()) e.codigo = "El código es obligatorio";
    if (!form.producto.trim()) e.producto = "El nombre es obligatorio";
    if (Number(form.stock_actual) < 0) e.stock_actual = "No puede ser negativo";
    if (Number(form.stock_minimo) < 0) e.stock_minimo = "No puede ser negativo";
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
              {errores.codigo && <p className="text-xs text-destructive">{errores.codigo}</p>}
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
            {errores.producto && <p className="text-xs text-destructive">{errores.producto}</p>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
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
              {errores.stock_actual && (
                <p className="text-xs text-destructive">{errores.stock_actual}</p>
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
              {errores.stock_minimo && (
                <p className="text-xs text-destructive">{errores.stock_minimo}</p>
              )}
            </div>
          </div>

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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutacion.isPending}>
              {mutacion.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
