# ── Base image ─────────────────────────────────────────
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# ── Install dependencies first (better caching) ────────
COPY package*.json ./
RUN npm install

# ── Copy source code ───────────────────────────────────
COPY . .

# ── Expose port ────────────────────────────────────────
EXPOSE 5000

# ── Start the app ──────────────────────────────────────
CMD ["node", "index.js"]
