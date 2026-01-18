-- PHASE 1: Add new columns to events table for normalization
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS platform_source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS event_url text,
ADD COLUMN IF NOT EXISTS last_scraped_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create unique constraint for deduplication (name + city + date + platform)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedupe 
ON public.events (name, city, date, platform_source) 
WHERE is_active = true;

-- PHASE 4: Add failure_reason column to auto_books
ALTER TABLE public.auto_books
ADD COLUMN IF NOT EXISTS failure_reason text;

-- Add sold_out status to event_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'sold_out' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_status')
  ) THEN
    ALTER TYPE event_status ADD VALUE 'sold_out';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'expired' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_status')
  ) THEN
    ALTER TYPE event_status ADD VALUE 'expired';
  END IF;
END $$;

-- PHASE 5: Create scrape_health table for monitoring
CREATE TABLE IF NOT EXISTS public.scrape_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_source text NOT NULL UNIQUE,
  last_successful_scrape timestamp with time zone,
  last_attempt_at timestamp with time zone,
  events_count integer DEFAULT 0,
  status text DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'unhealthy')),
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on scrape_health
ALTER TABLE public.scrape_health ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view scrape health (public info)
CREATE POLICY "Anyone can view scrape health"
ON public.scrape_health
FOR SELECT
USING (true);

-- Only service role can modify (edge functions)
CREATE POLICY "Service role can manage scrape health"
ON public.scrape_health
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);
CREATE INDEX IF NOT EXISTS idx_events_active ON public.events (is_active);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events (date);

-- Add trigger for scrape_health updated_at
CREATE TRIGGER update_scrape_health_updated_at
BEFORE UPDATE ON public.scrape_health
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial platform sources
INSERT INTO public.scrape_health (platform_source, status)
VALUES 
  ('BookMyShow', 'healthy'),
  ('Insider.in', 'healthy'),
  ('manual', 'healthy')
ON CONFLICT (platform_source) DO NOTHING;