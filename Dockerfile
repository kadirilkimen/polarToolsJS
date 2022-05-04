FROM bitnami/git:latest as builder
WORKDIR /tmp/
RUN git clone "https://github.com/kadirilkimen/polarToolsJS.git"

FROM webdevops/php-nginx:7.4
COPY --from=builder /tmp/polarToolsJS /app
