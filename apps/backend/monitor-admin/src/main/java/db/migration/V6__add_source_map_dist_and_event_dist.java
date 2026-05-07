package db.migration;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HexFormat;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V6__add_source_map_dist_and_event_dist extends BaseJavaMigration {

  @Override
  public void migrate(Context context) throws Exception {
    Connection connection = context.getConnection();
    boolean mysqlFamily = isMysqlFamily(connection);

    if (!hasColumn(connection, "monitor_event", "dist")) {
      execute(connection, "ALTER TABLE monitor_event ADD COLUMN dist VARCHAR(128) NULL");
    }

    if (!hasColumn(connection, "monitor_source_map_artifact", "dist")) {
      execute(connection, "ALTER TABLE monitor_source_map_artifact ADD COLUMN dist VARCHAR(128) NULL");
    }

    if (!hasColumn(connection, "monitor_source_map_artifact", "artifact_hash")) {
      execute(connection, "ALTER TABLE monitor_source_map_artifact ADD COLUMN artifact_hash CHAR(64) NULL");
    }

    backfillSourceMapFields(connection);

    dropIndexIfExists(connection, "monitor_source_map_artifact", "uk_monitor_source_map_release_artifact", mysqlFamily);
    dropIndexIfExists(connection, "monitor_source_map_artifact", "idx_monitor_source_map_project_release", mysqlFamily);

    if (!hasIndex(connection, "monitor_source_map_artifact", "uk_monitor_source_map_release_dist_artifact_hash")) {
      execute(
          connection,
          "CREATE UNIQUE INDEX uk_monitor_source_map_release_dist_artifact_hash "
              + "ON monitor_source_map_artifact (project_id, `release`, dist, artifact_hash)"
      );
    }

    if (!hasIndex(connection, "monitor_source_map_artifact", "idx_monitor_source_map_project_release_dist")) {
      execute(
          connection,
          "CREATE INDEX idx_monitor_source_map_project_release_dist "
              + "ON monitor_source_map_artifact (project_id, `release`, dist)"
      );
    }
  }

  private void backfillSourceMapFields(Connection connection) throws SQLException {
    try (PreparedStatement select = connection.prepareStatement(
        "SELECT id, artifact, dist, artifact_hash FROM monitor_source_map_artifact"
    );
         ResultSet resultSet = select.executeQuery();
         PreparedStatement update = connection.prepareStatement(
             "UPDATE monitor_source_map_artifact SET dist = ?, artifact_hash = ? WHERE id = ?"
         )) {
      while (resultSet.next()) {
        long id = resultSet.getLong("id");
        String artifact = resultSet.getString("artifact");
        String dist = resultSet.getString("dist");
        String artifactHash = resultSet.getString("artifact_hash");

        String normalizedDist = dist == null ? "" : dist;
        String normalizedArtifactHash = artifactHash == null || artifactHash.isBlank()
            ? hashArtifact(artifact)
            : artifactHash;

        update.setString(1, normalizedDist);
        update.setString(2, normalizedArtifactHash);
        update.setLong(3, id);
        update.addBatch();
      }
      update.executeBatch();
    }
  }

  private boolean hasColumn(Connection connection, String tableName, String columnName) throws SQLException {
    DatabaseMetaData metaData = connection.getMetaData();
    try (ResultSet resultSet = metaData.getColumns(connection.getCatalog(), null, tableName, null)) {
      while (resultSet.next()) {
        if (columnName.equalsIgnoreCase(resultSet.getString("COLUMN_NAME"))) {
          return true;
        }
      }
    }
    return false;
  }

  private boolean hasIndex(Connection connection, String tableName, String indexName) throws SQLException {
    DatabaseMetaData metaData = connection.getMetaData();
    try (ResultSet resultSet = metaData.getIndexInfo(connection.getCatalog(), null, tableName, false, false)) {
      while (resultSet.next()) {
        String current = resultSet.getString("INDEX_NAME");
        if (current != null && indexName.equalsIgnoreCase(current)) {
          return true;
        }
      }
    }
    return false;
  }

  private void dropIndexIfExists(Connection connection, String tableName, String indexName, boolean mysqlFamily)
      throws SQLException {
    DatabaseMetaData metaData = connection.getMetaData();
    try (ResultSet resultSet = metaData.getIndexInfo(connection.getCatalog(), null, tableName, false, false)) {
      while (resultSet.next()) {
        String current = resultSet.getString("INDEX_NAME");
        if (current == null || !matchesIndexName(current, indexName)) {
          continue;
        }
        if (mysqlFamily) {
          execute(connection, "ALTER TABLE " + tableName + " DROP INDEX " + current);
        } else {
          execute(connection, "DROP INDEX " + current);
        }
      }
    }
  }

  private boolean matchesIndexName(String current, String expected) {
    String normalizedCurrent = current.toLowerCase();
    String normalizedExpected = expected.toLowerCase();
    return normalizedCurrent.equals(normalizedExpected) || normalizedCurrent.contains(normalizedExpected);
  }

  private boolean isMysqlFamily(Connection connection) throws SQLException {
    String productName = connection.getMetaData().getDatabaseProductName();
    return productName != null && productName.toLowerCase().contains("mysql");
  }

  private void execute(Connection connection, String sql) throws SQLException {
    try (Statement statement = connection.createStatement()) {
      statement.execute(sql);
    }
  }

  private String hashArtifact(String artifact) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(artifact.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 digest is unavailable", e);
    }
  }
}
