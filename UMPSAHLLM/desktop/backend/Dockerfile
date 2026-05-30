# Stage 1: Build the Go binary (PicoClaw)
FROM golang:1.25-alpine AS go-builder
RUN apk add --no-cache git
WORKDIR /app
COPY . .
RUN cp -r workspace cmd/picoclaw/internal/onboard/
RUN go mod tidy
RUN CGO_ENABLED=0 go build -ldflags "-s -w" -o picoclaw ./cmd/picoclaw

# Stage 2: Node.js Backend
FROM node:18-alpine
WORKDIR /app

# Copy the built Go binary from the first stage
COPY --from=go-builder /app/picoclaw /picoclaw
RUN chmod +x /picoclaw

# Copy Backend code
COPY UMPSAHLLM/backend/package*.json ./
RUN npm install --production
COPY UMPSAHLLM/backend/ .

# Ensure the binary path is set correctly for the container
ENV PICOCLAW_EXE_PATH=/picoclaw
ENV OLLAMA_HOST=http://ollama:11434

EXPOSE 3001
CMD ["node", "server.js"]
