FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

COPY apps/backend/pom.xml apps/backend/pom.xml
COPY apps/backend/monitor-common/pom.xml apps/backend/monitor-common/pom.xml
COPY apps/backend/monitor-system/pom.xml apps/backend/monitor-system/pom.xml
COPY apps/backend/monitor-framework/pom.xml apps/backend/monitor-framework/pom.xml
COPY apps/backend/monitor-admin/pom.xml apps/backend/monitor-admin/pom.xml

RUN mvn -f apps/backend/pom.xml -pl monitor-admin -am dependency:go-offline

COPY apps/backend apps/backend

RUN mvn -f apps/backend/pom.xml -pl monitor-admin -am -DskipTests package

FROM eclipse-temurin:21-jre-jammy AS runner

WORKDIR /app

ENV TZ=Asia/Shanghai
ENV JAVA_OPTS=""

COPY --from=builder /workspace/apps/backend/monitor-admin/target/monitor-admin-*.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
