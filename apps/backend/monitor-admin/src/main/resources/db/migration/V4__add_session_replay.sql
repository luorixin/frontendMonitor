ALTER TABLE monitor_event
  ADD COLUMN replay_id VARCHAR(64) NULL;

CREATE INDEX idx_monitor_event_replay_id ON monitor_event (replay_id);

CREATE TABLE IF NOT EXISTS monitor_replay_session (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id      BIGINT NOT NULL,
  replay_id       VARCHAR(64) NOT NULL,
  session_id      VARCHAR(128) NOT NULL,
  page_id         VARCHAR(128),
  app_name        VARCHAR(128) NOT NULL,
  app_version     VARCHAR(64),
  `release`       VARCHAR(128),
  environment     VARCHAR(64),
  user_id         VARCHAR(128),
  device_id       VARCHAR(128),
  initial_url     VARCHAR(512),
  title           VARCHAR(255),
  started_at      DATETIME NOT NULL,
  last_seen_at    DATETIME NOT NULL,
  chunk_count     BIGINT DEFAULT 0,
  event_count     BIGINT DEFAULT 0,
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_monitor_replay_session_replay (replay_id),
  KEY idx_monitor_replay_session_project_session (project_id, session_id),
  KEY idx_monitor_replay_session_project_release (project_id, `release`)
);

CREATE TABLE IF NOT EXISTS monitor_replay_chunk (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  replay_session_id BIGINT NOT NULL,
  sequence_no       INT NOT NULL,
  started_at        DATETIME NOT NULL,
  ended_at          DATETIME NOT NULL,
  event_count       BIGINT NOT NULL,
  payload_json      LONGTEXT NOT NULL,
  create_time       DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_monitor_replay_chunk_sequence (replay_session_id, sequence_no),
  KEY idx_monitor_replay_chunk_session (replay_session_id)
);
