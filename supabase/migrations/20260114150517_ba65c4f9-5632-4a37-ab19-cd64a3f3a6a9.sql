-- Enable real-time for auto_books table
ALTER TABLE auto_books REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE auto_books;

-- Enable real-time for events table (for status changes)
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE events;