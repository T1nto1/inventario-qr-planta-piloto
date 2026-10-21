-- Migración documental (idempotente): campos de proveedor y reactivos químicos.
-- NOTA: este cambio YA fue aplicado directamente en la base de datos con
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS. Este archivo solo documenta el
-- cambio para reconstruir el esquema desde cero. No modifica ningún registro.

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS proveedor text;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tipo_reactivo text;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS origen text;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS porcentaje_cu numeric;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS porcentaje_fe numeric;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS porcentaje_sio2 numeric;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS porcentaje_s numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productos_tipo_reactivo_check'
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_tipo_reactivo_check
      CHECK (tipo_reactivo IS NULL OR tipo_reactivo IN ('Sintético', 'Real'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productos_porcentaje_cu_check'
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_porcentaje_cu_check
      CHECK (porcentaje_cu IS NULL OR (porcentaje_cu >= 0 AND porcentaje_cu <= 100));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productos_porcentaje_fe_check'
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_porcentaje_fe_check
      CHECK (porcentaje_fe IS NULL OR (porcentaje_fe >= 0 AND porcentaje_fe <= 100));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productos_porcentaje_sio2_check'
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_porcentaje_sio2_check
      CHECK (porcentaje_sio2 IS NULL OR (porcentaje_sio2 >= 0 AND porcentaje_sio2 <= 100));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productos_porcentaje_s_check'
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_porcentaje_s_check
      CHECK (porcentaje_s IS NULL OR (porcentaje_s >= 0 AND porcentaje_s <= 100));
  END IF;
END $$;
