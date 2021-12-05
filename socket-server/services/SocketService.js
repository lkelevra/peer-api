//socketio
const socketio = require("socket.io");

class SocketService {
  io;

  constructor() {
    this.io = null;
  }

  listen = (server) => {
    this.io = socketio(server, {
//transports: ['websocket','polling'],
	  cors: {
    		origin: "*",
	    	methods: ["GET", "POST"],
		credentials: true

  	  }
	});
    this.io.users = {};
    this.io.on("connection", (socket) => {

      socket.on('join-room', (userData) => {

          const { roomID, userID } = userData;

          socket.join(roomID);

          socket.to(roomID).broadcast.emit('new-user-connect', userData);

           console.log("=== REGISTRANDO NUEVO USUARIO ===", userData);
          
          this.io.users[userData.name] = userData;
          this.onUsersChange(socket);

          socket.on('disconnect', () => {
              
              console.log("socket => ", socket)
              console.log("sockets => ", this.io.users)
              this.onDisconnect(socket);
              socket.to(roomID).broadcast.emit('user-disconnected', userID);
          });
          socket.on('broadcast-message', (message) => {
              socket.to(roomID).broadcast.emit('new-broadcast-messsage', {...message, userData});
          });
          // socket.on('reconnect-user', () => {
          //     socket.to(roomID).broadcast.emit('new-user-connect', userData);
          // });
          socket.on('display-media', (value) => {
              socket.to(roomID).broadcast.emit('display-media', {userID, value });
          });
          socket.on('user-video-off', (value) => {
              socket.to(roomID).broadcast.emit('user-video-off', value);
          });

      });

      //socket.on("register", (name) => this.onRegister(socket, name));
      socket.on("set-peer-id", (userId) => this.onSetPeerId(socket, userId));
      socket.on("call", (name) => this.onCall(socket, name));
      socket.on("reject-call", (name) =>
        this.onRejectCall(socket, name)
      );
      socket.on("accept-call", (name) =>
        this.onAcceptCall(socket, name)
      );
      console.log(`${Date(Date.now()).toLocaleString()}: new user connected`);
      //socket.on("disconnect", () => this.onDisconnect(socket));
    });
  };

  onAcceptCall = (socket, name) => {
    if (this.io.users[name])
      this.io
        .to(this.io.users[name].socketId)
        .emit("accepted-call", this.io.users[socket.name]);
  };

  onRejectCall = (socket, name) => {
    if (this.io.users[name]) {
      this.io
        .to(this.io.users[name].socketId)
        .emit("rejected-call", this.io.users[socket.name]);
    }
  };

  onCall = (socket, name) => {
    if (this.io.users[name]) {
      this.io
        .to(this.io.users[name].socketId)
        .emit("call", this.io.users[socket.name]);
    } else {
      socket.emit("not-available", name);
    }
  };

  onRegister = (socket, name) => {
    console.log("Registered", name);
    socket.name = name;
    this.io.users[name] = {
      name,
      peerId: "",
      socketId: socket.id,
    };
    this.onUsersChange(socket);
  };

  getUsers = () => {
    const users = [];
    Object.keys(this.io.users).forEach((key) => {
      users.push(this.io.users[key]);
    });
    return users;
  };

  onUsersChange = (socket) => {
    this.io.emit("users-change", this.getUsers());
  };

  onSetPeerId = (socket, peerId) => {
    console.log("Set Peer Id user:", socket.name, " peerId: ", peerId);
    this.io.users[socket.name] = {
      peerId,
      socketId: socket.id,
      name: socket.name,
    };
    this.onUsersChange();
  };

  onDisconnect = (socket) => {
    delete this.io.users[socket.name];

    console.log(
      `${Date(Date.now()).toLocaleString()} ID:${
        socket.name
      } user disconnected`
    );
    this.onUsersChange();
  };

  emit = (event, userId, data) => {
    if (this.io.users[userId]) {
      this.io.to(this.io.users[userId]).emit(event, data);
    }
  };
}

module.exports = new SocketService();
