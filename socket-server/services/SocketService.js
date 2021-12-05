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

          const { roomID, userID, name } = userData;

          socket.join(roomID);

          socket.to(roomID).broadcast.emit('new-user-connect', userData);

          console.log("=== REGISTRANDO NUEVO USUARIO ===", userData);
          socket.roomID = roomID;
          this.onRegister(socket, userData)

          this.onUsersChange(socket);

          socket.on('disconnect', () => {
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

          socket.on("call", (user) => this.onCall(socket, user));

      });

      socket.on("register", (userData) => this.onRegister(socket, userData));
      socket.on("set-peer-id", (userId) => this.onSetPeerId(socket, userId));
      //socket.on("call", (name) => this.onCall(socket, name));
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

  onCall = (socket, user) => {
    if (this.io.users[user.name]) {
      this.io
        .to(this.io.users[user.name].socketId)
        .emit("call", this.io.users[socket.name]);
    } else {
      socket.emit("not-available", name);
    }
  };

  onRegister = (socket, userData) => {
    console.log("Registered", userData);
    const { name, roomID, userID } = userData 
    socket.name = name;
    socket.userID = userID;
    socket.name = name;
    if(this.io.users[roomID]){
            this.io.users[roomID][userID] = userData;
    }else{
      this.io.users[roomID] = {}
      this.io.users[roomID][userID] = userData;
    }

    this.onUsersChange(socket);
  };



  getUsers = (socket) => {
    const users = [];
    Object.keys(this.io.users[socket.roomID]).forEach((key) => {
      users.push(this.io.users[socket.roomID][key]);
    });
    return users;
  };

  onUsersChange = (socket) => {
    this.io.emit("users-change", this.getUsers(socket));
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
