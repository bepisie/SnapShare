const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Store peer names and IDs
let peerNames = {}; // Store peer IDs and their corresponding names

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Register a new peer with a unique name
    socket.on('register', (peerName) => {
        peerNames[socket.id] = peerName; // Store peer name by ID
        // Notify all other peers about the new peer
        socket.broadcast.emit('new-peer', socket.id, peerName);
    });

    // Handle signaling for WebRTC connections
    socket.on('offer', (offer, to) => {
        socket.to(to).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, to) => {
        socket.to(to).emit('answer', answer);
    });

    socket.on('candidate', (candidate, to) => {
        socket.to(to).emit('candidate', candidate);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Notify other peers of the disconnection
        socket.broadcast.emit('peer-disconnect', socket.id);
        delete peerNames[socket.id]; // Remove the disconnected peer's name
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
