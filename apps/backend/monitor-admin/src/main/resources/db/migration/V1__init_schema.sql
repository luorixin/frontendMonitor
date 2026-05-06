CREATE TABLE IF NOT EXISTS sys_user (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  username    VARCHAR(64)  NOT NULL UNIQUE,
  email       VARCHAR(128) NOT NULL UNIQUE,
  password    VARCHAR(256) NOT NULL,
  nickname    VARCHAR(64),
  avatar      VARCHAR(256),
  status      TINYINT DEFAULT 1,
  del_flag    TINYINT DEFAULT 0,
  login_ip    VARCHAR(128),
  login_date  DATETIME,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitor_project (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_name    VARCHAR(128) NOT NULL,
  project_key     VARCHAR(64) NOT NULL UNIQUE,
  app_name        VARCHAR(128) NOT NULL,
  app_version     VARCHAR(64),
  status          TINYINT DEFAULT 1,
  description     VARCHAR(512),
  allowed_origins TEXT,
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitor_issue (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id       BIGINT NOT NULL,
  issue_type       VARCHAR(64) NOT NULL,
  fingerprint      VARCHAR(512) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  first_seen_at    DATETIME NOT NULL,
  last_seen_at     DATETIME NOT NULL,
  occurrence_count BIGINT DEFAULT 1,
  latest_event_id  VARCHAR(64),
  status           VARCHAR(32) DEFAULT 'OPEN',
  assignee         VARCHAR(128),
  priority         VARCHAR(32) DEFAULT 'MEDIUM',
  comment_count    BIGINT DEFAULT 0,
  create_time      DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_monitor_issue_project_fingerprint (project_id, fingerprint),
  KEY idx_monitor_issue_project_type (project_id, issue_type),
  KEY idx_monitor_issue_last_seen (last_seen_at)
);

CREATE TABLE IF NOT EXISTS monitor_event (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id       BIGINT NOT NULL,
  issue_id         BIGINT,
  event_id         VARCHAR(64) NOT NULL UNIQUE,
  issue_type       VARCHAR(64),
  fingerprint      VARCHAR(512),
  event_type       VARCHAR(64) NOT NULL,
  occurred_at      DATETIME NOT NULL,
  app_name         VARCHAR(128) NOT NULL,
  app_version      VARCHAR(64),
  environment      VARCHAR(64),
  `release`        VARCHAR(128),
  user_id          VARCHAR(128),
  device_id        VARCHAR(128),
  session_id       VARCHAR(128),
  page_id          VARCHAR(128),
  url              VARCHAR(512),
  title            VARCHAR(255),
  request_method   VARCHAR(16),
  request_status   INT,
  duration         BIGINT,
  message          VARCHAR(1000),
  selector         VARCHAR(512),
  resource_type    VARCHAR(64),
  transport        VARCHAR(32),
  event_name       VARCHAR(128),
  tags_json        LONGTEXT,
  contexts_json    LONGTEXT,
  breadcrumbs_json LONGTEXT,
  trace_id         VARCHAR(128),
  span_id          VARCHAR(128),
  payload_json     LONGTEXT,
  base_json        LONGTEXT,
  create_time      DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_monitor_event_project_time (project_id, occurred_at),
  KEY idx_monitor_event_project_type (project_id, event_type),
  KEY idx_monitor_event_project_release_env (project_id, `release`, environment),
  KEY idx_monitor_event_issue_id (issue_id),
  KEY idx_monitor_event_session_id (session_id),
  KEY idx_monitor_event_user_id (user_id),
  KEY idx_monitor_event_device_id (device_id),
  KEY idx_monitor_event_url (url)
);

CREATE TABLE IF NOT EXISTS monitor_event_agg_hour (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id      BIGINT NOT NULL,
  bucket_start    DATETIME NOT NULL,
  event_type      VARCHAR(64) NOT NULL,
  total_count     BIGINT DEFAULT 0,
  error_count     BIGINT DEFAULT 0,
  page_view_count BIGINT DEFAULT 0,
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_monitor_event_agg_hour (project_id, bucket_start, event_type),
  KEY idx_monitor_event_agg_hour_bucket (bucket_start)
);

CREATE TABLE IF NOT EXISTS monitor_event_agg_day (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id      BIGINT NOT NULL,
  event_date      DATE NOT NULL,
  event_type      VARCHAR(64) NOT NULL,
  total_count     BIGINT DEFAULT 0,
  error_count     BIGINT DEFAULT 0,
  page_view_count BIGINT DEFAULT 0,
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_monitor_event_agg_day (project_id, event_date, event_type),
  KEY idx_monitor_event_agg_day_date (event_date)
);

CREATE TABLE IF NOT EXISTS monitor_alert_rule (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id      BIGINT NOT NULL,
  name            VARCHAR(128) NOT NULL,
  event_type      VARCHAR(64),
  threshold_count BIGINT NOT NULL,
  window_minutes  INT NOT NULL,
  enabled         TINYINT DEFAULT 1,
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_monitor_alert_rule_project (project_id),
  KEY idx_monitor_alert_rule_enabled (enabled)
);

CREATE TABLE IF NOT EXISTS monitor_alert_record (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_id         BIGINT NOT NULL,
  project_id      BIGINT NOT NULL,
  event_type      VARCHAR(64),
  window_start    DATETIME NOT NULL,
  window_end      DATETIME NOT NULL,
  actual_count    BIGINT NOT NULL,
  threshold_count BIGINT NOT NULL,
  message         VARCHAR(512),
  triggered_at    DATETIME NOT NULL,
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_monitor_alert_record_project_time (project_id, triggered_at),
  KEY idx_monitor_alert_record_rule_time (rule_id, triggered_at)
);
