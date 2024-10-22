const socket = io();
const container = document.getElementById('container');
const peersList = document.getElementById('peers');
let localConnection;
let dataChannel;
let peers = {};  // Store active peers

// Adjectives and animals for random peer names
const adjectives = ['tiny', 'large', 'green', 'copper', 'brave', 'swift', 'radioactive', 'teaming'];
const animals = ['elk', 'seal', 'cat', 'owl', 'fox', 'spider', 'horse', 'wolf'];

// Device emoji list for actual peer devices
const devicesWithEmojis = [
    { device: 'iPhone', emoji: '📱', userAgent: /iPhone/i },
    { device: 'Android Phone', emoji: '📱', userAgent: /Android/i },
    { device: 'Chromebook', emoji: '💻', userAgent: /CrOS/i },
    { device: 'Desktop', emoji: '🖥️', userAgent: /Win|Mac|Linux/i },
    { device: 'Tablet', emoji: '📱', userAgent: /iPad|Tablet/i },
    { device: 'TV', emoji: '📺', userAgent: /TV/i }
];

// Function to generate a random unique peer name
function generateUniquePeerName(existingNames) {
    let name;
    do {
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        name = `${randomAdjective} ${randomAnimal}`;
    } while (existingNames.includes(name)); // Ensure name is unique
    return name;
}

// Function to detect device based on user-agent string
function detectDevice() {
    const userAgent = navigator.userAgent;
    for (const device of devicesWithEmojis) {
        if (device.userAgent.test(userAgent)) {
            return device;
        }
    }
    // Default to Desktop if no match
    return { device: 'Desktop', emoji: '🖥️' };
}

// Add a new peer to the UI
function addPeer(peerId, peerName) {
    if (!peers[peerId]) {
        const peerDiv = document.createElement('div');
        peerDiv.classList.add('peer');
        
        const peerDevice = detectDevice(); // Actual device and emoji (e.g., "iPhone 📱")
        
        peerDiv.innerHTML = `
            <div class="peer-emoji">${peerDevice.emoji}</div>
            <div class="peer-name">${peerName}</div>
            <div class="peer-device">${peerDevice.device}</div>
        `;

        peerDiv.addEventListener('click', () => {
            document.getElementById('fileInput').click();
            // Handle peer click, initiate file sharing
            peerClickHandler(peerId);
        });

        peersList.appendChild(peerDiv);
        peers[peerId] = {
            element: peerDiv,
            name: peerName,
            device: peerDevice.device,
            emoji: peerDevice.emoji
        };

        // Log peer info when added
        logPeerInfo(peerId);
    }
}

// Log the peer's name and device when it's added
function logPeerInfo(peerId) {
    const peer = peers[peerId];
    if (peer) {
        console.log(`Peer Added: ${peer.name} (${peer.device}) - ${peer.emoji}`);
    }
}

// Handle offer/answer signaling
socket.on('offer', async (offer, from) => {
    localConnection = new RTCPeerConnection();
    createDataChannel(localConnection);
    await localConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    socket.emit('answer', answer, from);
});

socket.on('answer', async (answer) => {
    await localConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async (candidate) => {
    await localConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Remove peer from UI when they disconnect
socket.on('peer-disconnect', (peerId) => {
    if (peers[peerId]) {
        peersList.removeChild(peers[peerId].element);
        delete peers[peerId];
    }
});

// Handle file selection and sending
const fileInput = document.getElementById('fileInput');
fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        dataChannel.send(reader.result);
        log('File sent');
    };
    reader.readAsArrayBuffer(file);
};

// Helper function to log messages
function log(message) {
    console.log(message);
}

// Set up data channel for P2P file sharing
function createDataChannel(connection) {
    dataChannel = connection.createDataChannel("fileTransfer");
    dataChannel.onopen = () => log('Data channel open');
    dataChannel.onclose = () => log('Data channel closed');
    dataChannel.onmessage = (event) => log(`Received: ${event.data}`);
}

// When a peer is clicked
function peerClickHandler(targetPeerId) {
    // Create connection and offer for file sharing
    createConnection(targetPeerId);
}

// Create new WebRTC connection and offer
function createConnection(targetPeerId) {
    localConnection = new RTCPeerConnection();
    createDataChannel(localConnection);

    localConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate, targetPeerId);
        }
    };

    localConnection.createOffer()
        .then(offer => localConnection.setLocalDescription(offer))
        .then(() => socket.emit('offer', localConnection.localDescription, targetPeerId));
}

// Generate and assign a unique name when connecting
socket.on('connect', () => {
    const existingNames = Object.values(peers).map(peer => peer.name);
    const uniquePeerName = generateUniquePeerName(existingNames);
    socket.emit('register', uniquePeerName); // Send the unique name to the server
});

// Listen for new peer registrations and add them
socket.on('new-peer', (peerId, peerName) => {
    addPeer(peerId, peerName);
});

// Simulate adding peers (replace with dynamic detection in a real-world case)
setTimeout(() => {
    addPeer('peer1', 'Copper Elk'); // Example static peers for demonstration
    addPeer('peer2', 'Radioactive Seal');
}, 1000);

// Button click event to trigger file input
document.getElementById('chooseFileButton').onclick = () => {
    document.getElementById('fileInput').click();
};
