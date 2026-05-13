FROM node:20-alpine AS builder

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/report/package.json apps/report/package.json

RUN pnpm install --frozen-lockfile --filter frontend-monitor-report...

COPY apps/report apps/report

RUN pnpm --filter frontend-monitor-report build

FROM nginx:1.27-alpine AS runner

ENV BACKEND_UPSTREAM=http://backend:8080
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d
ENV NGINX_ENVSUBST_FILTER=BACKEND_UPSTREAM

COPY apps/report/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /workspace/apps/report/dist /usr/share/nginx/html

EXPOSE 80
