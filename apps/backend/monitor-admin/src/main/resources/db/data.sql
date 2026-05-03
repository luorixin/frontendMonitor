-- ========== sys_user ==========
INSERT INTO sys_user (id, username, email, password, nickname, status)
VALUES (1, 'admin', 'admin@example.com', '$2a$10$dyQXiE5/8ReGrdMDJp3d/O4h9F/BmEy5WK.3W/FdcwTIjVoMYKS4C', '管理员', 1);

-- ========== monitor_project ==========
INSERT INTO monitor_project (
  id,
  project_name,
  project_key,
  app_name,
  app_version,
  status,
  description,
  allowed_origins
)
VALUES (
  1,
  'Demo Project',
  'demo-project-key',
  'frontend-monitor-demo',
  '0.1.0',
  1,
  'Seeded demo project for local frontend-monitor integration.',
  '["http://localhost:8080","http://localhost:4173","http://localhost:4174","http://localhost:4175","http://localhost:3000","http://localhost:3001"]'
);
