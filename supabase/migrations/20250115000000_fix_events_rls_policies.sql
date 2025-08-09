-- Fix RLS policies for events table to allow INSERT operations
-- This migration adds missing INSERT policy for events table
-- Only creates policies if the events table exists

DO $$
BEGIN
    -- Check if events table exists before creating policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        
        -- Create policy to allow anyone to insert events (for testing purposes)
        -- In production, this should be restricted to admin users only
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Allow insert events for testing') THEN
            CREATE POLICY "Allow insert events for testing" 
            ON public.events 
            FOR INSERT 
            WITH CHECK (true);
        END IF;
        
        -- Optional: Create policy to allow updates (if needed)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Allow update events for testing') THEN
            CREATE POLICY "Allow update events for testing" 
            ON public.events 
            FOR UPDATE 
            USING (true);
        END IF;
        
        -- Optional: Create policy to allow deletes (if needed)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Allow delete events for testing') THEN
            CREATE POLICY "Allow delete events for testing" 
            ON public.events 
            FOR DELETE 
            USING (true);
        END IF;
        
    END IF;
END $$;