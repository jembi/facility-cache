FROM node:carbon

WORKDIR /opt/facility-cache

# Copy source
COPY . ./

# Install dependencies
COPY package.json ./
RUN npm i

# Run server
CMD ["npm", "start"]
