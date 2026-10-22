-- Migración DOCUMENTAL: ya aplicada en la base de datos. Idempotente, no modifica registros.
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS campana text;
