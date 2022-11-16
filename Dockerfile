FROM node:8-alpine

ENV WORK /opt/mapsite
ENV NODE_ENV production

# Create app directory
RUN mkdir -p ${WORK}
WORKDIR ${WORK}

# Install app dependencies
COPY package.json yarn.lock ${WORK}/

RUN yarn && yarn cache clean

# Bundle app source
COPY . ${WORK}

EXPOSE 4000

CMD yarn start
