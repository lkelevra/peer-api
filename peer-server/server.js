require('dotenv').config()
const express = require("express");
const { ExpressPeerServer } = require("peer");

const app = express();

app.get("/", (req, res, next) => res.send("Video Server online"));

const http = require("http");

const server = http.createServer(app);
const peerServer = ExpressPeerServer(server, {
  debug: 3,
  path: "/myapp",
});

app.use("/peerjs", peerServer);

server.listen(process.env.PORT || 9000);
