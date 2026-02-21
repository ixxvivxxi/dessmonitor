# --- app (Vite + nginx) ---
FROM node:24-alpine AS app-builder

# node-sqlite3 (server dep) needs native build during npm ci
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY server/package.json ./server/

RUN npm ci

COPY app ./app
COPY server ./server

ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build:app

FROM nginx:alpine AS app
COPY --from=app-builder /app/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


# --- server (NestJS) ---
FROM node:24-alpine AS server

# node-sqlite3 needs native build
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY server/package.json ./server/

RUN npm ci

COPY server ./server

RUN npm run build:server

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/dist/main.js"]
