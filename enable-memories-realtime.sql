-- Enable real-time updates for memories table
-- This allows photos to sync instantly across devices

-- Enable realtime for memories (for photo album sync)
ALTER PUBLICATION supabase_realtime ADD TABLE memories;

-- Enable realtime for notes table (for shared notes sync)
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
