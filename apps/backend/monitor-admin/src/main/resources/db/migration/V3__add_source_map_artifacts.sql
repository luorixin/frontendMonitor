CREATE TABLE IF NOT EXISTS monitor_source_map_artifact (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id      BIGINT NOT NULL,
  `release`       VARCHAR(128) NOT NULL,
  artifact        VARCHAR(512) NOT NULL,
  file_name       VARCHAR(255),
  file_size       BIGINT NOT NULL,
  source_map_json LONGTEXT NOT NULL,
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_monitor_source_map_release_artifact (project_id, `release`, artifact),
  KEY idx_monitor_source_map_project_release (project_id, `release`)
);
