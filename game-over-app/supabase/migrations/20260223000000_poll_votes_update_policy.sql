-- Allow users to UPDATE their own poll votes (needed for vote changing)
CREATE POLICY "Users can update own poll votes"
  ON poll_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
