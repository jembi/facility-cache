FROM node:carbon

WORKDIR /opt/facility-cache
ADD . /opt/facility-cache

# Install dependencies
RUN npm i

# Run server
CMD ["npm", "start"]
