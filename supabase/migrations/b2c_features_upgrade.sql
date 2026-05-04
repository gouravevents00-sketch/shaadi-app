-- B2C Features Upgrade
ALTER TABLE celebration_guests
  ADD COLUMN IF NOT EXISTS attending_function_ids TEXT[] DEFAULT '{}';
ALTER TABLE celebration_rooms
  ADD COLUMN IF NOT EXISTS map_url TEXT;
