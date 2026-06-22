# Node.js backend for UMPSAHLLM.
# Build context is THIS folder (UMPSAHLLM/backend) so the context stays tiny and the
# build can't accidentally tar the repo's ollama_data model / desktop build / .exe files.
# Node 20+ required: the newer undici pulled in via the ollama client references the
# global File class, which does not exist on Node 18 (ReferenceError: File is not defined).
FROM node:20-alpine
WORKDIR /app

# Build deps for native modules (sqlite3) on alpine/musl
RUN apk add --no-cache python3 make g++

# Install backend dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend source (context = UMPSAHLLM/backend; see .dockerignore)
COPY . .

ENV OLLAMA_HOST=http://ollama:11434
EXPOSE 3001
CMD ["node", "server.js"]
