# syntax=docker/dockerfile:1

FROM node:current-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY ["script.js", "./"]
CMD ["node", "script.js"]