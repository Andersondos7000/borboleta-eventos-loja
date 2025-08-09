-- Add INSERT and UPDATE policies for events table (for testing purposes)
-- Only creates policies if the events table exists and policies don't already exist

DO $$
BEGIN
    -- Check if events table exists before creating policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        
        -- Add INSERT policy for events table (for testing purposes)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Allow insert events for testing') THEN
            CREATE POLICY "Allow insert events for testing" 
            ON public.events 
            FOR INSERT 
            WITH CHECK (true);
        END IF;
        
        -- Add UPDATE policy for events table (for testing purposes)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Allow update events for testing') THEN
            CREATE POLICY "Allow update events for testing" 
            ON public.events 
            FOR UPDATE 
            USING (true) 
            WITH CHECK (true);
        END IF;
        
    END IF;
END $$;