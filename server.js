const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Create an Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the public directory (e.g., index.html)
app.use(express.static('public'));

// WebRTC signaling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle offer sent by one peer
    socket.on('offer', (offer, targetPeerId) => {
        io.to(targetPeerId).emit('offer', offer, socket.id);
    });

    // Handle answer sent by one peer
    socket.on('answer', (answer, targetPeerId) => {
        io.to(targetPeerId).emit('answer', answer, socket.id);
    });

    // Handle ICE candidate exchange
    socket.on('candidate', (candidate, targetPeerId) => {
        io.to(targetPeerId).emit('candidate', candidate, socket.id);
    });

    // Notify other peers about the new connection
    socket.broadcast.emit('peer-connect', socket.id);

    // Notify other peers when a peer disconnects
    socket.on('disconnect', () => {
        socket.broadcast.emit('peer-disconnect', socket.id);
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
