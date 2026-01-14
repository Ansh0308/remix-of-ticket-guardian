-- Enable pg_cron and pg_net extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to run process-auto-books every minute
SELECT cron.schedule(
  'process-auto-books-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yteqzzzmrbqlnjdvdjtt.supabase.co/functions/v1/process-auto-books',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZXF6enptcmJxbG5qZHZkanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjc4MDMsImV4cCI6MjA4MzkwMzgwM30.hPzg7wobsQ-eIjAn4iF_Asak9eNq3gAtNXkZBS8Ixn0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);