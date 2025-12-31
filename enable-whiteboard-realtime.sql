-- Enable real-time updates for whiteboard_drawings table and couples table
-- This allows widgets to sync instantly across devices

-- Enable realtime for whiteboard drawings (for drawing changes)
ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_drawings;

-- Enable realtime for couples table (for widget selection changes)
-- Note: This may already be enabled if you've run other setup scripts
-- If you get an error saying it's already a member, you can ignore it
ALTER PUBLICATION supabase_realtime ADD TABLE couples;
