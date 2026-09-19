# Etapa 1: Construcción (Build)
FROM node:20-alpine AS build

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de definición de dependencias
COPY package.json package-lock.json* ./

# Instalar las dependencias del proyecto
RUN npm ci

# Copiar el resto de los archivos del código fuente
COPY . .

# Construir la aplicación (Vite genera los archivos estáticos en la carpeta "dist")
RUN npm run build

# Etapa 2: Servidor (Production / Serve)
FROM nginx:alpine

# Copiar los archivos estáticos generados en la etapa anterior a la carpeta pública de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configurar Nginx para aplicaciones de una sola página (SPA)
# Esto asegura que todas las rutas se redirijan a "index.html" para que el router de React se encargue de ellas.
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Iniciar el servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
