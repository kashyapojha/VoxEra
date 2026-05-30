# Backend Node.js Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]