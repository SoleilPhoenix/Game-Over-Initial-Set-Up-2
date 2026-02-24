-- Allow poll creators to delete their own polls (cascades to options + votes via FK)
CREATE POLICY "Users can delete polls they created"
  ON polls FOR DELETE
  USING (auth.uid() = created_by);
