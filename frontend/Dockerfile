# Next.js dashboard as a standalone server. Built and run by docker-compose.yml at the repo root.
FROM node:22-slim AS build
WORKDIR /app/frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# rewrites (/api, /health) are fixed at build time, so the backend address is a build argument
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
# standalone output nests the app under frontend/ because outputFileTracingRoot is the repo root
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
