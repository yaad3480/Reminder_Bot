# Use Node 20
FROM node:20

# Install tzdata for Timezone Support
RUN apt-get update && apt-get install -y tzdata

# Set Timezone to Asia/Kolkata
ENV TZ=Asia/Kolkata

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port 7860
ENV PORT=7860
EXPOSE 7860

# Init command
CMD [ "npm", "start" ]
