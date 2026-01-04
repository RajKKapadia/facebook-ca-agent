# Use Node.js 20 LTS
FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm@10.26.2

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose port (Cloud Run uses PORT env variable)
EXPOSE ${PORT}

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the application
CMD ["pnpm", "start"]