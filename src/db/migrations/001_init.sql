-- 001_init.sql
-- Initial schema for the Slack task assistant.

CREATE TYPE task_status AS ENUM (
  'proposed', 'open', 'in_progress', 'waiting_on_approval', 'completed'
);

-- Team members who have interacted with the bot. is_authorized gates whether
-- they can actually use commands; is_admin gates admin-only commands like
-- /brief-time and /brief-channel. Both are toggled directly in the Supabase
-- table editor by the administrator, see README for why.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  slack_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE task_number_seq START 1;

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  task_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  related_link TEXT,
  status task_status NOT NULL DEFAULT 'open',
  due_date DATE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Auto-assigns human-friendly task numbers like TASK-001, safe under
-- concurrent inserts because it draws from a dedicated sequence.
CREATE OR REPLACE FUNCTION set_task_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.task_number := 'TASK-' || LPAD(nextval('task_number_seq')::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_task_number
BEFORE INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION set_task_number();

-- Keeps updated_at current on every edit.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_touch_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Many-to-many: a task can have multiple assignees, and each shows up under
-- every assignee in the morning brief.
CREATE TABLE task_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- Single-row, team-wide configuration. Editable via /brief-time and
-- /brief-channel, never hardcoded.
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brief_channel_id TEXT,
  brief_time TIME NOT NULL DEFAULT '08:00',
  brief_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Single-row bookkeeping: how many tasks have ever been completed (used for
-- the every-fifth-completion celebration) and which calendar day the brief
-- was last sent (used so the interval-based scheduler never double-posts).
CREATE TABLE bot_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  completed_count INTEGER NOT NULL DEFAULT 0,
  last_celebrated_count INTEGER NOT NULL DEFAULT 0,
  last_brief_sent_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO bot_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
