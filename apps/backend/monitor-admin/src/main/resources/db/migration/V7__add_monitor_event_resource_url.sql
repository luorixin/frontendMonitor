ALTER TABLE monitor_event
  ADD COLUMN resource_url VARCHAR(512) NULL AFTER resource_type;

CREATE INDEX idx_monitor_event_resource_url ON monitor_event (resource_url);
