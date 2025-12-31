-- Fix replica identity for games table to enable realtime
-- This fixes the "mismatch between server and client bindings" error

-- Set replica identity to FULL (required for realtime to work)
ALTER TABLE games REPLICA IDENTITY FULL;

-- Verify it was set (optional - just for checking)
-- SELECT relname, relreplident
-- FROM pg_class
-- WHERE relname = 'games';
-- Should show 'f' for FULL

-- Also verify realtime is enabled
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' AND tablename = 'games';
