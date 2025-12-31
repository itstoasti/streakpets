-- Enable realtime for games table
-- Run this in Supabase SQL Editor

-- Enable realtime on the games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Verify it was added (optional - just for checking)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
