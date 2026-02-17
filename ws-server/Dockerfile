# Build stage
FROM rust:1.85-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src/ src/
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/lepotilnica-ws /usr/local/bin/
EXPOSE 8080
ENV WS_PORT=8080
CMD ["lepotilnica-ws"]
