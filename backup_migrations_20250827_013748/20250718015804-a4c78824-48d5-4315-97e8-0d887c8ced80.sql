-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read events
CREATE POLICY "Todos podem ver eventos" 
ON public.events 
FOR SELECT 
USING (true);