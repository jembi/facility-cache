FROM node:carbon-slim

WORKDIR /opt/facility-cache

COPY package.json npm-shrinkwrap.json ./

RUN npm i

# copy app
COPY . .

# Run server
CMD ["npm", "start"]
