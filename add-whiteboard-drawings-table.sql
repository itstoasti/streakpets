-- Create whiteboard_drawings table
CREATE TABLE IF NOT EXISTS whiteboard_drawings (
  id TEXT PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  background_color TEXT NOT NULL DEFAULT 'white',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE whiteboard_drawings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view drawings from their couple
CREATE POLICY "Users can view their couple's drawings"
  ON whiteboard_drawings
  FOR SELECT
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE auth_user1_id = auth.uid() OR auth_user2_id = auth.uid()
    )
  );

-- Policy: Users can insert drawings for their couple
CREATE POLICY "Users can create drawings for their couple"
  ON whiteboard_drawings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE auth_user1_id = auth.uid() OR auth_user2_id = auth.uid()
    )
  );

-- Policy: Users can delete their couple's drawings
CREATE POLICY "Users can delete their couple's drawings"
  ON whiteboard_drawings
  FOR DELETE
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE auth_user1_id = auth.uid() OR auth_user2_id = auth.uid()
    )
  );

-- Add widget_drawing_id to couples table to track which drawing is set as widget
ALTER TABLE couples ADD COLUMN IF NOT EXISTS widget_drawing_id TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_whiteboard_drawings_couple_id ON whiteboard_drawings(couple_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_drawings_created_at ON whiteboard_drawings(created_at DESC);
