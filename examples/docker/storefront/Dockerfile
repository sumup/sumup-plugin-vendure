FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /app

COPY public ./public
COPY server.js ./server.js

EXPOSE 8080
CMD ["node", "server.js"]
