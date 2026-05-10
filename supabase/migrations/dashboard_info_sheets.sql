-- Dashboard info sheets migration
-- Adds: relation to guests, decoration_theme to functions,
--       celebration_menu, celebration_vehicles tables

ALTER TABLE celebration_guests
  ADD COLUMN IF NOT EXISTS relation TEXT;

ALTER TABLE celebration_functions
  ADD COLUMN IF NOT EXISTS decoration_theme TEXT;

-- Food menu (per function, per dish)
CREATE TABLE IF NOT EXISTS celebration_menu (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  function_id    UUID REFERENCES celebration_functions ON DELETE SET NULL,
  dish_name      TEXT NOT NULL,
  dish_type      TEXT DEFAULT 'main'
                 CHECK (dish_type IN ('starter','main','dessert','drink','snack','other')),
  plate_count    INTEGER,
  is_veg         BOOLEAN DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_menu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own celebration menu" ON celebration_menu;
CREATE POLICY "users manage own celebration menu" ON celebration_menu
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- Hired vehicles
CREATE TABLE IF NOT EXISTS celebration_vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id  UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  car_number      TEXT NOT NULL,
  car_type        TEXT DEFAULT 'sedan'
                  CHECK (car_type IN ('sedan','suv','bus','tempo','auto','luxury','other')),
  car_model       TEXT,
  capacity        INTEGER NOT NULL DEFAULT 4,
  chauffeur_name  TEXT,
  chauffeur_phone TEXT,
  assigned_to     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own celebration vehicles" ON celebration_vehicles;
CREATE POLICY "users manage own celebration vehicles" ON celebration_vehicles
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );
