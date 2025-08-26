-- Corrigir search_path nas funções existentes
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.notify_stock_change() SET search_path = public;
ALTER FUNCTION public.notify_cart_change() SET search_path = public;