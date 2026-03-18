CREATE TABLE IF NOT EXISTS users (
  user_id       SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100),
  role          VARCHAR(20) NOT NULL DEFAULT 'techniker'
                CHECK (role IN ('admin', 'techniker')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);

INSERT INTO users (username, password_hash, display_name, role)
VALUES (
  'admin',
  '$2b$12$/501jdgk85VxYMipMcvAmuw5TkY8sIaOYb7WeaAbLh8vKhOW4NVpC',
  'Administrator',
  'admin'
) ON CONFLICT (username) DO NOTHING;
