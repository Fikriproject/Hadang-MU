-- ==========================================
-- HADANG SCORING SYSTEM SCHEMA
-- ==========================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'JURY');
CREATE TYPE jury_position AS ENUM ('JURY_1', 'JURY_2');
CREATE TYPE match_status AS ENUM ('DRAFT', 'READY', 'LIVE', 'PAUSED', 'FINISHED');
CREATE TYPE score_event_status AS ENUM ('ACTIVE', 'CANCELLED');

-- 1. PROFILES TABLE (Extending auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'JURY',
  jury_position jury_position,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TEAMS TABLE
-- Note migrasi jika tabel sudah ada:
-- ALTER TABLE teams ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'PUTRA';
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'PUTRA', -- 'PUTRA' atau 'PUTRI'
  logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MATCHES TABLE
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  round TEXT,
  scheduled_at TIMESTAMPTZ,
  team_attack_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_defense_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  jury_1_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  jury_2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status match_status NOT NULL DEFAULT 'DRAFT',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SCORE EVENTS TABLE
CREATE TABLE score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  jury_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  status score_event_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancel_reason TEXT
);

-- ==========================================
-- REALTIME
-- ==========================================
-- Enable replication for Realtime on score_events
ALTER PUBLICATION supabase_realtime ADD TABLE score_events;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;

-- Helper Function: is_admin()
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Teams RLS
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Admins can manage teams" ON teams FOR ALL USING (is_admin());

-- Matches RLS
CREATE POLICY "Matches are viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Admins can manage matches" ON matches FOR ALL USING (is_admin());

-- Score Events RLS
CREATE POLICY "Score events are viewable by everyone" ON score_events FOR SELECT USING (true);

-- Admins can do anything with score events
CREATE POLICY "Admins can manage score events" ON score_events FOR ALL USING (is_admin());

-- Juries can ONLY insert score events for matches they are assigned to
CREATE POLICY "Juries can insert scores for assigned matches" ON score_events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches 
    WHERE id = match_id AND status = 'LIVE' AND (
      (jury_1_id = auth.uid() AND jury_id = auth.uid()) OR 
      (jury_2_id = auth.uid() AND jury_id = auth.uid())
    )
  )
);

-- Juries can update (cancel) their OWN score events
CREATE POLICY "Juries can update own scores" ON score_events
FOR UPDATE USING (
  jury_id = auth.uid()
);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'JURY');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
