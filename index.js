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

class AudioSnippet {
    constructor(key, buffer, numSamples, seconds, audioManager, containerDiv) {
	this.key = key;
	this.buffer = buffer;
	this.numSamples = numSamples;
	this.seconds = seconds;
	this.audioManager = audioManager;
	this.containerDiv = containerDiv;
	this.snippetDiv = document.createElement('div');
	this.snippetDiv.textContent =
	    `${Math.round(1000 * this.seconds)/1000}s`;
	this.snippetButton = document.createElement('button');
	this.snippetButton.innerHTML = "&#9654;";
	this.snippetDiv.appendChild(this.snippetButton);
	this.downloadButton = document.createElement('button');
	this.downloadButton.innerHTML = '\u2B73';
	this.snippetDiv.appendChild(this.downloadButton);
	this.containerDiv.appendChild(this.snippetDiv);

	this.snippetButton.addEventListener(
	    'click',
	    () => {
		this._play();
	    });
	this.downloadButton.addEventListener(
	    'click',
	    () => {
		this._download();
	    });
    }

    _play() {
	// Play the buffer.
	const audioCtx = this.audioManager.ctx();
	const source = audioCtx.createBufferSource();
	const audioBuffer = audioCtx.createBuffer(
	    1, this.buffer.length, audioCtx.sampleRate);
	audioBuffer.copyToChannel(this.buffer, 0);
	source.buffer = audioBuffer;
	source.connect(this.audioManager.localSelector.outputNode);
	source.start();
    }
    
    _download() {
	const audioCtx = this.audioManager.ctx();
	const wavData = audioBufferToWav(this.buffer, audioCtx);
	const blob = new Blob([wavData], { type: 'audio/wav' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'recording.wav';
	a.click();
	URL.revokeObjectURL(url);
    }
}

function _encodeFloat32Array(float32Array) {
    const buffer = float32Array.buffer;
    return new Uint8Array(buffer);
}

function _decodeFloat32Array(uint8Array) {
    const buffer = uint8Array.buffer;
    return new Float32Array(buffer);
}

function start() {
    console.log('Setting up start logic.');
    document.getElementById('startButton').addEventListener(
	'click', async (event) => {
	    console.log('Start clicked');
	    const audioDiv = document.getElementById('audioConfig');
	    event.target.remove();

	    const audioManager = new AudioManager();
	    await audioManager.initialize();
	    	    
	    // Create a couple of nodes we will use to manage the
	    // transient connections with our peer.
	    const peerInputNode = audioManager.ctx().createGain();
	    const peerOutputNode = audioManager.ctx().createGain();

	    createTestToneButton(audioManager.localSelector.outputNode);

	    // Attempt to establish the peer connection.
	    const peerStatus = document.getElementById('peerStatus');
	    const peerConnection = new PeerConnection(
		"HelloTwinZ2", peerInputNode, peerOutputNode);
	    
	    peerConnection.addEventListener(
		'peerStreamEstablished',
		(event) => {
		    console.log('Peer stream established in index.js');
		});

	    const syncedDBMap =
		  new SyncedDBMap('audioSnippets', peerConnection);

	    const audioSnippetsDiv = document.getElementById('audioSnippets');
	    
	    syncedDBMap.localMap.addEventListener(
		'dataChanged',
		(event) => {
		    console.log('dataChanged event from DB');
		    const float32Buffer =
			  _decodeFloat32Array(event.detail.value.buffer);
		    new AudioSnippet(
			event.detail.key,
			float32Buffer,
			event.detail.value.numSamples,
			event.detail.value.seconds,
			audioManager,
			audioSnippetsDiv);
		});
	    
	    audioManager.addEventListener(
		'recordingAvailable',
		async (event) => {
		    console.log(`Recording available ${event.detail.seconds}s`);

		    const dbDetail = event.detail;
		    dbDetail.buffer = _encodeFloat32Array(dbDetail.buffer);
		    await syncedDBMap.set(
			Date.now(), {
			    ...dbDetail,
			});
		});
	});
}
