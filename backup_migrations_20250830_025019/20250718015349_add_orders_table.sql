-- Update event dates to future dates so they appear in the tickets page
UPDATE events 
SET 
  date = '2025-08-15 20:00:00+00'::timestamptz,
  updated_at = now()
WHERE name = 'Show de Rock Nacional';

UPDATE events 
SET 
  date = '2025-08-20 22:00:00+00'::timestamptz,
  updated_at = now()
WHERE name = 'Festival de Música Eletrônica';

UPDATE events 
SET 
  date = '2025-08-25 19:00:00+00'::timestamptz,
  updated_at = now()
WHERE name = 'Encontro de Pagode';