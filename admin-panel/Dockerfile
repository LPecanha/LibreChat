FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_EXT_URL
ARG VITE_TENANTS
ARG VITE_LIBRECHAT_URL
ARG VITE_BRAND_NAME=Admin
ARG VITE_BRAND_COLOR=#2469E2

ENV VITE_EXT_URL=$VITE_EXT_URL
ENV VITE_TENANTS=$VITE_TENANTS
ENV VITE_LIBRECHAT_URL=$VITE_LIBRECHAT_URL
ENV VITE_BRAND_NAME=$VITE_BRAND_NAME
ENV VITE_BRAND_COLOR=$VITE_BRAND_COLOR

RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3091

CMD ["nginx", "-g", "daemon off;"]
