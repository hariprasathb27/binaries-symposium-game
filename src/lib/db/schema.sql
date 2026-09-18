-- ===================================================
-- BINARIES Symposium Quiz Platform - SQLite Schema
-- ===================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS scientists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  field TEXT NOT NULL,
  country TEXT NOT NULL,
  year TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  scientist_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_e TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D', 'E')),
  round_number INTEGER NOT NULL DEFAULT 1,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  question_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scientist_id) REFERENCES scientists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS winners (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  completion_time TEXT NOT NULL DEFAULT '00:00',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_settings (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL DEFAULT 'BINARIES',
  timer_duration INTEGER NOT NULL DEFAULT 20,
  current_round INTEGER NOT NULL DEFAULT 1,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 3,
  questions_per_round INTEGER NOT NULL DEFAULT 5,
  auto_next INTEGER NOT NULL DEFAULT 0,
  answer_reveal INTEGER NOT NULL DEFAULT 1,
  game_status TEXT NOT NULL DEFAULT 'waiting',
  instructions TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  submitted_at TEXT NOT NULL,
  submission_token TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_sessions (
  id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 1,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_round_order ON questions(round_number, question_order, active);
CREATE INDEX IF NOT EXISTS idx_questions_scientist ON questions(scientist_id);
CREATE INDEX IF NOT EXISTS idx_winners_position ON winners(position);
CREATE INDEX IF NOT EXISTS idx_submissions_token ON submissions(submission_token);
CREATE INDEX IF NOT EXISTS idx_team_sessions_id ON team_sessions(id);

