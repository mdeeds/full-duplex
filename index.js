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

function audioBufferToWav(float32Buffer, audioCtx) {
    const numberOfChannels = 1
    const sampleRate = audioCtx.sampleRate;
    const length = float32Buffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk size
    view.setUint32(4, 36 + length, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // Format chunk identifier
    writeString(view, 12, 'fmt ');
    // Format chunk size
    view.setUint32(16, 16, true);
    // Format code
    view.setUint16(20, 1, true);
    // Number of channels
    view.setUint16(22, numberOfChannels, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2 * numberOfChannels, true);
    // Block align (channels * bytes per sample)
    view.setUint16(32, numberOfChannels * 2, true);
    // Bits per sample
    view.setUint16(34, 16, true);
    // Data chunk identifier
    writeString(view, 36, 'data');
    // Data chunk size
    view.setUint32(40, length, true);

    floatTo16BitPCM(view, 44, float32Buffer);
    
    return buffer;
}


function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function start() {
    document.getElementById('startButton').addEventListener(
	'click', async () => {
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
	    const numSamples = event.detail.numSamples;
	    const audioCtx = audioManager.localOutputNode.context;
	    const snippetDiv = document.createElement('div');
	    snippetDiv.textContent =
		`${Math.round(1000 * event.detail.seconds)/1000}s`;
	    const snippetButton = document.createElement('button');
	    snippetButton.innerHTML = "&#9658;";
	    snippetDiv.appendChild(snippetButton);
	    const downloadButton = document.createElement('button');
	    downloadButton.innerHTML = '\u2B73';
	    snippetDiv.appendChild(downloadButton);
	    audioSnippetsDiv.appendChild(snippetDiv);
	    snippetButton.addEventListener(
		'click',
		() => {
		    // Play the buffer.
		    const source = audioCtx.createBufferSource();
		    const audioBuffer = audioCtx.createBuffer(
			1, buffer.length, audioCtx.sampleRate);
		    audioBuffer.copyToChannel(buffer, 0);
		    source.buffer = audioBuffer;
		    source.connect(audioManager.localOutputNode);
		    source.start();		    
		});
	    downloadButton.addEventListener(
		'click',
		() => {
		    const wavData = audioBufferToWav(buffer, audioCtx);
		    const blob = new Blob([wavData], { type: 'audio/wav' });
		    const url = URL.createObjectURL(blob);
		    const a = document.createElement('a');
		    a.href = url;
		    a.download = 'recording.wav';
		    a.click();
		    URL.revokeObjectURL(url);
		});

	});
    });
}
