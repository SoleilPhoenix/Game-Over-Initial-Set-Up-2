-- Game-Over App Row Level Security Policies
-- Enables RLS and creates security policies for all tables

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PROFILES POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of event co-participants"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT ep.user_id FROM event_participants ep
      WHERE ep.event_id IN (
        SELECT event_id FROM event_participants WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- CITIES POLICIES (Public read for all authenticated users)
-- =============================================================================
CREATE POLICY "Authenticated users can view active cities"
  ON cities FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =============================================================================
-- EVENTS POLICIES
-- =============================================================================
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view events they participate in"
  ON events FOR SELECT
  USING (
    auth.uid() = created_by OR
    id IN (SELECT event_id FROM event_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Event creators can update their events"
  ON events FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Event creators can soft delete their events"
  ON events FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by AND deleted_at IS NOT NULL);

-- =============================================================================
-- EVENT PREFERENCES POLICIES
-- =============================================================================
CREATE POLICY "Event participants can view preferences"
  ON event_preferences FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE created_by = auth.uid()
      UNION
      SELECT event_id FROM event_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Event creators can insert preferences"
  ON event_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
  );

CREATE POLICY "Event creators can update preferences"
  ON event_preferences FOR UPDATE
  USING (
    event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
  );

-- =============================================================================
-- EVENT PARTICIPANTS POLICIES
-- =============================================================================
CREATE POLICY "Event creators can manage participants"
  ON event_participants FOR ALL
  USING (
    event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can view participants of their events"
  ON event_participants FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM event_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participation"
  ON event_participants FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================================================
-- PACKAGES POLICIES (Public read for authenticated users)
-- =============================================================================
CREATE POLICY "Authenticated users can view active packages"
  ON packages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =============================================================================
-- BOOKINGS POLICIES
-- =============================================================================
CREATE POLICY "Event participants can view bookings"
  ON bookings FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM event_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Event creators can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
  );

CREATE POLICY "Event creators can update bookings"
  ON bookings FOR UPDATE
  USING (
    event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
  );

-- =============================================================================
-- CHAT CHANNELS POLICIES
-- =============================================================================
CREATE POLICY "Event participants can view channels"
  ON chat_channels FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM event_participants WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- MESSAGES POLICIES
-- =============================================================================
CREATE POLICY "Event participants can view messages"
  ON messages FOR SELECT
  USING (
    channel_id IN (
      SELECT cc.id FROM chat_channels cc
      JOIN event_participants ep ON cc.event_id = ep.event_id
      WHERE ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Event participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    channel_id IN (
      SELECT cc.id FROM chat_channels cc
      JOIN event_participants ep ON cc.event_id = ep.event_id
      WHERE ep.user_id = auth.uid()
    )
  );

-- =============================================================================
-- POLLS POLICIES
-- =============================================================================
CREATE POLICY "Event participants can view polls"
  ON polls FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM event_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can create polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    event_id IN (
      SELECT event_id FROM event_participants
      WHERE user_id = auth.uid() AND role = 'organizer'
    )
  );

CREATE POLICY "Poll creators can update their polls"
  ON polls FOR UPDATE
  USING (created_by = auth.uid());

-- =============================================================================
-- POLL OPTIONS POLICIES
-- =============================================================================
CREATE POLICY "Event participants can view poll options"
  ON poll_options FOR SELECT
  USING (
    poll_id IN (
      SELECT p.id FROM polls p
      JOIN event_participants ep ON p.event_id = ep.event_id
      WHERE ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Poll creators can manage options"
  ON poll_options FOR ALL
  USING (
    poll_id IN (SELECT id FROM polls WHERE created_by = auth.uid())
  );

-- =============================================================================
-- POLL VOTES POLICIES
-- =============================================================================
CREATE POLICY "Event participants can view votes"
  ON poll_votes FOR SELECT
  USING (
    poll_id IN (
      SELECT p.id FROM polls p
      JOIN event_participants ep ON p.event_id = ep.event_id
      WHERE ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Event participants can vote"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    poll_id IN (
      SELECT p.id FROM polls p
      JOIN event_participants ep ON p.event_id = ep.event_id
      WHERE ep.user_id = auth.uid() AND p.status = 'active'
    )
  );

-- =============================================================================
-- NOTIFICATIONS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
