FROM node:carbon
#FROM node:dubnium

WORKDIR /opt

# Update apt-repo list and install prerequisites
RUN apt-get update
RUN apt-get install -y git

# Clone repo
RUN git clone https://github.com/jembi/facility-cache.git

WORKDIR /opt/facility-cache

ENV "openhim:api:apiURL" https://localhost:9000

# Install dependencies
RUN npm i

# Run server
CMD ["npm", "start"]
