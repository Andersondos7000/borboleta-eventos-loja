-- seed/staging/customers.sql
INSERT INTO public.customers (name, email, phone, status)
SELECT name, email, phone, 'active'
FROM local_backup.customers
WHERE email NOT IN (SELECT email FROM public.customers)
ON CONFLICT (email) DO NOTHING;