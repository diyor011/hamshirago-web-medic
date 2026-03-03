FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
ARG CACHEBUST=20260303
COPY . .
RUN npm run build
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", ".next/standalone/server.js"]
