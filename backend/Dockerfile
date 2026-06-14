FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
