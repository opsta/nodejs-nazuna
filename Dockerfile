FROM node:9.5.0-alpine

COPY . /nodejs/.

WORKDIR /nodejs
RUN npm install

EXPOSE 8081
CMD ["node", "/nodejs/main.js"]
