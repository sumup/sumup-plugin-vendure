FROM node:24-bookworm-slim
WORKDIR /app

COPY public ./public
COPY server.js ./server.js

EXPOSE 8080
CMD ["node", "server.js"]
