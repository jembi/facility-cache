FROM node:erbium-slim

WORKDIR /opt/facility-cache

COPY package.json package-lock.json ./

RUN npm i

# copy app
COPY . .

# Run server
CMD ["npm", "start"]
