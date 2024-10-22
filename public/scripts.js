const socket = io();
let localConnection;
let dataChannel;
const peers = {}; // Keep track of connected peers
let myPeerId = null;

// Adjectives and animals for peer names
const adjectives = ['tiny', 'large', 'green', 'brave', 'swift'];
const animals = ['elk', 'seal', 'cat', 'owl', 'spider', 'horse'];

// Generate a random peer name
function generatePeerName() {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    return `${randomAdjective} ${randomAnimal}`;
}

// Detect device based on the user-agent string
function detectDevice() {
    const userAgent = navigator.userAgent;
    if (/iPhone|Android/i.test(userAgent)) {
        return '📱';
    } else if (/CrOS/.test(userAgent)) {
        return '💻';
    } else if (/Win|Mac|Linux/.test(userAgent)) {
        return '🖥️';
    } else {
        return '🖥️';
    }
}

// Handle peer connection
socket.on('connect', () => {
    myPeerId = socket.id;
    const peerName = generatePeerName();
    socket.emit('register-peer', { peerId: myPeerId, peerName, device: detectDevice() });
});

// Handle peer offer
socket.on('offer', async (offer, from) => {
    localConnection = new RTCPeerConnection();
    createDataChannel(localConnection);
    await localConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    socket.emit('answer', answer, from);
});

// Handle ICE candidates
socket.on('candidate', async (candidate) => {
    await localConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Add peers to the grid
socket.on('peers', (peers) => {
    for (const peerId in peers) {
        addPeer(peers[peerId]);
    }
});

socket.on('new-peer', (peer) => {
    addPeer(peer);
});

// Add a peer to the UI
function addPeer(peer) {
    const peerElement = document.createElement('div');
    peerElement.classList.add('peer');
    peerElement.innerText = `${peer.device} ${peer.peerName}`;
    peerElement.addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('peer-grid').appendChild(peerElement);
}

// Create data channel for file sharing
function createDataChannel(connection) {
    dataChannel = connection.createDataChannel("fileTransfer");
    dataChannel.onopen = () => console.log('Data channel open');
    dataChannel.onmessage = (event) => console.log('Received:', event.data);
}

// File handling
document.getElementById('choose-file').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', () => {
    const file = document.getElementById('file-input').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            dataChannel.send(reader.result);
            console.log('File sent');
        };
        reader.readAsArrayBuffer(file);
    }
});
