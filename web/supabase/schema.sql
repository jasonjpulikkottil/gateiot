-- ============================================================
-- GateIoT Attendance System — Supabase Schema
-- Project: dwvmhksojxkmwcvlxxne.supabase.co
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. EMPLOYEES -----------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  department  TEXT,
  card_uid    TEXT UNIQUE NOT NULL,  -- normalised: uppercase hex, no separators e.g. "6E8A2407"
  shift_start TIME NOT NULL DEFAULT '09:00',
  shift_end   TIME NOT NULL DEFAULT '18:00',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SWIPE LOGS ----------------------------------------------
CREATE TABLE IF NOT EXISTS swipe_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  card_uid    TEXT NOT NULL,
  swipe_type  TEXT CHECK (swipe_type IN ('entry','exit','denied','unknown')),
  temperature FLOAT,
  humidity    FLOAT,
  granted     BOOLEAN DEFAULT false,
  swiped_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast daily-count queries per employee
CREATE INDEX IF NOT EXISTS idx_swipe_logs_emp_date
  ON swipe_logs (employee_id, swiped_at);

-- 3. MODEL WEIGHTS -------------------------------------------
CREATE TABLE IF NOT EXISTS model_weights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version     INTEGER DEFAULT 1,
  weights     JSONB NOT NULL,         -- serialised TF.js LayersModel topology + weight data
  metrics     JSONB,                  -- { loss, accuracy, epochs, sampleCount, ... }
  trained_at  TIMESTAMPTZ DEFAULT NOW(),
  trained_by  TEXT
);

-- 4. APP SETTINGS --------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- Card UIDs from sketch.ino (lines 23-24), normalised
-- blueCard: 0x6E, 0x8A, 0x24, 0x07  → "6E8A2407"
-- redCard:  0x05, 0xB4, 0x0B, 0x07  → "05B40B07"
-- ============================================================
INSERT INTO employees (name, email, department, card_uid, shift_start, shift_end)
VALUES
  ('Alice Johnson',  'alice@example.com',  'Engineering', '6E8A2407', '09:00', '18:00'),
  ('Bob Martinez',   'bob@example.com',    'Operations',  '05B40B07', '08:00', '17:00')
ON CONFLICT (card_uid) DO NOTHING;

INSERT INTO app_settings (key, value)
VALUES
  ('admin_password', 'gateadmin')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (enable after schema is verified)
-- Uncomment when auth is configured in Supabase dashboard
-- ============================================================
-- ALTER TABLE employees   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE swipe_logs  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE model_weights ENABLE ROW LEVEL SECURITY;
