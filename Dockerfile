FROM node:carbon
#FROM node:dubnium

# Update apt-repo list and install prerequisites
RUN apt-get update

WORKDIR /opt/facility-cache
ADD . /opt/facility-cache

ENV "openhim:api:apiURL" https://localhost:9000

# Install dependencies
RUN npm i

# Run server
CMD ["npm", "start"]
