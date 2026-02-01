# Use Node 20
FROM node:20

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build TypeScript
RUN npm run build

# Copy Admin Dashboard to dist/admin if not automatically handled OR assure src/app.ts serves from root 'admin'
# Since app.ts serves 'admin' from root 'admin' folder relative to CWD, we just need the source files.
# The COPY . . already brings 'admin' folder.

# Expose port 7860 (Standard for Hugging Face Spaces)
EXPOSE 7860

# Init command
CMD [ "npm", "start" ]
