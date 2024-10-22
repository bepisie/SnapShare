import { Server } from "socket.io";

let peers = {};

export default function handler(req, res) {
    if (!res.socket.server.io) {
        console.log("Setting up Socket.io...");
        const io = new Server(res.socket.server);
        res.socket.server.io = io;

        io.on("connection", (socket) => {
            console.log("Peer connected:", socket.id);

            socket.on('register-peer', ({ peerId, peerName, device }) => {
                peers[peerId] = { peerId, peerName, device };
                socket.emit('peers', peers);
                socket.broadcast.emit('new-peer', peers[peerId]);
            });

            socket.on("offer", (offer, targetPeerId) => {
                io.to(targetPeerId).emit("offer", offer, socket.id);
            });

            socket.on("answer", (answer, targetPeerId) => {
                io.to(targetPeerId).emit("answer", answer, socket.id);
            });

            socket.on("candidate", (candidate, targetPeerId) => {
                io.to(targetPeerId).emit("candidate", candidate, socket.id);
            });

            socket.on("disconnect", () => {
                delete peers[socket.id];
                socket.broadcast.emit('peer-disconnect', socket.id);
                console.log("Peer disconnected:", socket.id);
            });
        });
    }

    res.end();
}
