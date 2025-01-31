function createTestToneButton(outputNode) {
    const button = document.createElement('button');
    button.textContent = 'Play Test Tone';
    document.body.appendChild(button);
    const audioContext = outputNode.context;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    gainNode.gain.value = 0;
    
    oscillator.connect(gainNode);
    gainNode.connect(outputNode);
    // gainNode.connect(audioContext.destination);
    oscillator.start();
    
    button.addEventListener('click', () => {
        const startTime = audioContext.currentTime;
        const endTime = startTime + 1;
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.2, endTime - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, endTime);
    });
}

function start() {
    document.getElementById('startButton').addEventListener('click', async () => {
	const audioDiv = document.getElementById('audioConfig');
	audioDiv.innerHTML = '';

	const audioManager = new AudioManager();
	await audioManager.initialize();
	audioManager.inputSelector(audioDiv);
	audioManager.outputSelector(audioDiv);

	// Create a couple of nodes we will use to manage the transient connections
	// with our peer.
	const peerInputNode = audioManager.ctx().createGain();
	const peerOutputNode = audioManager.ctx().createGain();

	const gainControllerDiv = document.getElementById('gainController');
	const gainController = new GainController(
	    audioManager.localInputNode, audioManager.localOutputNode,
	    peerInputNode, peerOutputNode,
	    gainControllerDiv);

	createTestToneButton(audioManager.localOutputNode);

	// Attempt to establish the peer connection.
	const peerStatus = document.getElementById('peerStatus');
	const peerConnection = new PeerConnection(
	    "HelloTwinZ2", peerInputNode, peerOutputNode);
	
	peerConnection.addEventListener('peerStreamEstablished', (event) => {
            console.log('Peer stream established in index.js');
	});

	const audioSnippetsDiv = document.getElementById('audioSnippets');
	audioManager.addEventListener('recordingAvailable', (event) => {
	    const buffer = event.detail.buffer;
	    const snippetDiv = document.createElement('div');
	    snippetDiv.textContent = `Samples: ${buffer.length}`;
	    audioSnippetsDiv.appendChild(snippetDiv);
	});
    });
}
