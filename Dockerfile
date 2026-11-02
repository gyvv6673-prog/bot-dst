FROM node:20
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 10000
CMD ["npm", "start"]
