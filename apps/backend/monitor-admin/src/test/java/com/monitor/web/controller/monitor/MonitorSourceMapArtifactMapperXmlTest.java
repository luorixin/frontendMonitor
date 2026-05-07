package com.monitor.web.controller.monitor;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class MonitorSourceMapArtifactMapperXmlTest {

  @Test
  void shouldNotUseUnescapedReleaseAliasInSelectClause() throws IOException {
    assertMapperDoesNotContainUnescapedReleaseAlias(
        "mapper/monitor/MonitorSourceMapArtifactMapper.xml"
    );
    assertMapperDoesNotContainUnescapedReleaseAlias(
        "mapper/monitor/MonitorReplayMapper.xml"
    );
  }

  private void assertMapperDoesNotContainUnescapedReleaseAlias(String resourcePath)
      throws IOException {
    try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
      assertNotNull(stream, "mapper xml should be available on the test classpath: " + resourcePath);
      String xml = new String(stream.readAllBytes(), StandardCharsets.UTF_8);

      assertFalse(
          xml.contains("`release` AS release"),
          "MySQL treats release as a reserved identifier here; the alias must be escaped or removed: "
              + resourcePath
      );
    }
  }
}
