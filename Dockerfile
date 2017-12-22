FROM node:8-alpine

ENV WORK /opt/mapsite

# Create app directory
RUN mkdir -p ${WORK}
WORKDIR ${WORK}

# Install app dependencies
COPY package.json ${WORK}
COPY yarn.lock ${WORK}
RUN yarn

# Bundle app source
COPY . ${WORK}

RUN yarn lint

EXPOSE 4000

CMD yarn start
