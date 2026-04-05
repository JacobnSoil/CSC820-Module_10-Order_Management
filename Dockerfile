# Choose a suitable Node.js base image
FROM node:22-alpine
# Set the working directory inside the container
WORKDIR /app
# Copy package.json and package-lock.json
COPY package*.json ./ 
# Install dependencies
RUN npm ci
# Copy the rest of the application code
COPY . .
# Expose the port your app listens on
EXPOSE 3000
  # Command to start the application
CMD ["node", "server.js"]