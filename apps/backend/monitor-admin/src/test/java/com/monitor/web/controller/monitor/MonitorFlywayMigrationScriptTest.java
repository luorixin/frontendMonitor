package com.monitor.web.controller.monitor;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;

class MonitorFlywayMigrationScriptTest {

  @Test
  void shouldUseJavaMigrationForV6Compatibility() throws ClassNotFoundException {
    Class<?> migrationClass = Class.forName("db.migration.V6__add_source_map_dist_and_event_dist");
    assertNotNull(migrationClass, "V6 should be implemented as a Java migration for DB compatibility");

    assertFalse(
        getClass().getClassLoader().getResource(
            "db/migration/V6__add_source_map_dist_and_event_dist.sql") != null,
        "The old SQL migration should be removed to avoid MySQL/H2 syntax drift"
    );
  }
}
