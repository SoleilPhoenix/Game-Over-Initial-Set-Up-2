-- Game-Over App Initial Schema Migration
-- Creates all tables, functions, triggers, and RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  push_notifications_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profile trigger to auto-create on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- CITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  is_active BOOLEAN DEFAULT true,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- EVENTS TABLE
-- =============================================================================
CREATE TYPE party_type AS ENUM ('bachelor', 'bachelorette');
CREATE TYPE event_status AS ENUM ('draft', 'planning', 'booked', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  party_type party_type NOT NULL,
  honoree_name TEXT NOT NULL,
  city_id UUID NOT NULL REFERENCES cities(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  vibe TEXT,
  status event_status DEFAULT 'draft',
  hero_image_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_city_id ON events(city_id);
CREATE INDEX idx_events_status ON events(status);

-- =============================================================================
-- EVENT PREFERENCES TABLE
-- =============================================================================
CREATE TYPE gathering_size AS ENUM ('intimate', 'small_group', 'party');
CREATE TYPE social_approach AS ENUM ('wallflower', 'butterfly', 'observer', 'mingler');
CREATE TYPE energy_level AS ENUM ('low_key', 'moderate', 'high_energy');
CREATE TYPE age_range AS ENUM ('21-25', '26-30', '31-35', '35+');
CREATE TYPE group_cohesion AS ENUM ('close_friends', 'mixed_group', 'strangers');

CREATE TABLE IF NOT EXISTS event_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  gathering_size gathering_size,
  social_approach social_approach,
  energy_level energy_level,
  average_age age_range,
  group_cohesion group_cohesion,
  vibe_preferences TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_preferences_event_id ON event_preferences(event_id);

-- =============================================================================
-- EVENT PARTICIPANTS TABLE
-- =============================================================================
CREATE TYPE participant_role AS ENUM ('organizer', 'guest', 'honoree');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role participant_role NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  contribution_amount_cents INTEGER DEFAULT 0,
  invited_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);

-- =============================================================================
-- PACKAGES TABLE
-- =============================================================================
CREATE TYPE package_tier AS ENUM ('essential', 'classic', 'grand');

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tier package_tier NOT NULL,
  city_id UUID NOT NULL REFERENCES cities(id),
  base_price_cents INTEGER NOT NULL,
  price_per_person_cents INTEGER NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  premium_highlights JSONB DEFAULT '[]'::jsonb,
  hero_image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  ideal_gathering_size TEXT[],
  ideal_energy_level TEXT[],
  ideal_vibe TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_packages_city_id ON packages(city_id);
CREATE INDEX idx_packages_tier ON packages(tier);
CREATE INDEX idx_packages_is_active ON packages(is_active);

-- =============================================================================
-- BOOKINGS TABLE
-- =============================================================================
CREATE TYPE booking_payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  package_id UUID NOT NULL REFERENCES packages(id),
  package_base_cents INTEGER NOT NULL,
  service_fee_cents INTEGER NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  exclude_honoree BOOLEAN DEFAULT false,
  paying_participants INTEGER NOT NULL,
  per_person_cents INTEGER NOT NULL,
  payment_status booking_payment_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  audit_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_package_id ON bookings(package_id);

-- =============================================================================
-- CHAT CHANNELS TABLE
-- =============================================================================
CREATE TYPE channel_category AS ENUM ('general', 'accommodation', 'activities', 'budget');

CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category channel_category NOT NULL,
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_channels_event_id ON chat_channels(event_id);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- =============================================================================
-- POLLS TABLE
-- =============================================================================
CREATE TYPE poll_category AS ENUM ('accommodation', 'activities', 'budget', 'general');
CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closing_soon', 'closed');

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE SET NULL,
  category poll_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status poll_status DEFAULT 'draft',
  ends_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_polls_event_id ON polls(event_id);
CREATE INDEX idx_polls_status ON polls(status);

-- =============================================================================
-- POLL OPTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);

-- =============================================================================
-- POLL VOTES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_preferences_updated_at
  BEFORE UPDATE ON event_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
