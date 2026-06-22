# Node.js backend for UMPSAHLLM.
# The picoclaw Go binary is unused by the Node brain, so we do NOT build it here
# (keeps the image small and the build fast/reliable on NAS hardware).
# Node 20+ required: the newer undici pulled in via the ollama client references the
# global File class, which does not exist on Node 18 (ReferenceError: File is not defined).
FROM node:20-alpine
WORKDIR /app

# Build deps for native modules (sqlite3) on alpine/musl
RUN apk add --no-cache python3 make g++

# Install backend dependencies
COPY UMPSAHLLM/backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY UMPSAHLLM/backend/ .

ENV OLLAMA_HOST=http://ollama:11434
EXPOSE 3001
CMD ["node", "server.js"]
