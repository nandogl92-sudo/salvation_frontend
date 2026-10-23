# Este proyecto es Vite + React (no Next.js).
# Imagen oficial de Node con la misma versión que usas en local.
FROM node:22.18.0

WORKDIR /app

# Primero las dependencias: Docker reutiliza esta capa si package.json no cambia.
COPY package.json package-lock.json ./
RUN npm ci

# Después el código de la app.
COPY . .

# Vite escucha en 4000 (ver script "dev" en package.json).
# En Docker, localhost es este contenedor: el backend es el servicio "backend".
ENV API_PROXY=http://backend:4444
EXPOSE 4000

CMD ["npm", "run", "dev"]
