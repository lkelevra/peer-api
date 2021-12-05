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

      socket.on("register", (username) => this.onRegister(socket, username));
      socket.on("set-peer-id", (peerId) => this.onSetPeerId(socket, peerId));
      socket.on("call", (username) => this.onCall(socket, username));
      socket.on("reject-call", (username) =>
        this.onRejectCall(socket, username)
      );
      socket.on("accept-call", (username) =>
        this.onAcceptCall(socket, username)
      );
      console.log(`${Date(Date.now()).toLocaleString()}: new user connected`);
      socket.on("disconnect", () => this.onDisconnect(socket));
    });
  };

  onAcceptCall = (socket, username) => {
    if (this.io.users[username])
      this.io
        .to(this.io.users[username].socketId)
        .emit("accepted-call", this.io.users[socket.username]);
  };

  onRejectCall = (socket, username) => {
    if (this.io.users[username]) {
      this.io
        .to(this.io.users[username].socketId)
        .emit("rejected-call", this.io.users[socket.username]);
    }
  };

  onCall = (socket, username) => {
    if (this.io.users[username]) {
      this.io
        .to(this.io.users[username].socketId)
        .emit("call", this.io.users[socket.username]);
    } else {
      socket.emit("not-available", username);
    }
  };

  onRegister = (socket, username) => {
    console.log("Registered", username);
    socket.username = username;
    this.io.users[username] = {
      username,
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
    console.log("Set Peer Id user:", socket.username, " peerId: ", peerId);
    this.io.users[socket.username] = {
      peerId,
      socketId: socket.id,
      username: socket.username,
    };
    this.onUsersChange();
  };

  onDisconnect = (socket) => {
    delete this.io.users[socket.username];
    console.log(
      `${Date(Date.now()).toLocaleString()} ID:${
        socket.username
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
