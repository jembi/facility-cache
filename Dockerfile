FROM node:carbon

WORKDIR /opt/facility-cache

# Copy source
COPY . .

# Install dependencies
COPY package.json npm-shrinkwrap.json ./

RUN npm i

# Run server
CMD ["npm", "start"]
