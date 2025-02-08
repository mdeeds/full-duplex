class AudioManager extends EventTarget {
    constructor() {
	super();
	this.audioCtx = null;
	this.localInputNode = null;

	this.isRecording = false;
	this.recordingBuffer = null;
	this.samplesRecorded = 0;

	this.localSelector = undefined;
	this.dawSelector = undefined;
    }
    
    ctx() {
	return this.audioCtx;
    }

    async initialize() {
	this.audioCtx = new AudioContext();
	const recordButton = document.getElementById('recordButton');
	recordButton.addEventListener(
	    'click', (event) => { this._toggleRecording(event); });

	console.log('Creating input selectors.');
	this.localSelector = new AudioDeviceSelector(
	    document.getElementById('localIO'),
	    "Audio Source (mic): ", "Audio destination (headphones):",
	    this.audioCtx);
	await this.localSelector.initialize();

	// Create a worklet recorder and add it to the graph.
	await this.audioCtx.audioWorklet.addModule('worklet-recorder.js');
	this.workletRecorderNode = new AudioWorkletNode(
	    this.audioCtx, 'worklet-recorder');
	this.workletRecorderNode.port.onmessage = (event) => {
	    this._processRecordingData(event.data);
	}
	this.localSelector.inputNode.connect(this.workletRecorderNode);
	
	this.dawSelector = new AudioDeviceSelector(
	    document.getElementById('dawIO'),
	    "DAW send: ", "DAW return:", this.audioCtx);
	await this.dawSelector.initialize();
    }

    _processRecordingData(data) {
	if (!this.isRecording) {
	    return;
	}
	if (this.samplesRecorded + data.samples.length >
	    this.recordingBuffer.length) {
	    // Add a second to the recording buffer.
	    const newBuffer = new Float32Array(this.recordingBuffer.length +
					       this.audioCtx.sampleRate);
	    newBuffer.set(this.recordingBuffer);
	    this.recordingBuffer = newBuffer;
	}
	this.recordingBuffer.set(data.samples, this.samplesRecorded);
	this.samplesRecorded += data.samples.length;
    }
    
    _toggleRecording(event) {
	if (this.isRecording) {
	    event.target.innerHTML = 'Record';
	    this.dispatchEvent(new CustomEvent('recordingAvailable', {
		detail: {
		    buffer: this.recordingBuffer,
		    numSamples: this.samplesRecorded,
		    seconds: (this.samplesRecorded / this.audioCtx.sampleRate)
		}}));
	    this.recordingBuffer = null;
	    this.samplesRecorded = 0;
	} else {
	    event.target.innerHTML = 'Stop';
	    this.recordingBuffer = new Float32Array(this.audioCtx.sampleRate);
	}
	this.isRecording = !this.isRecording;
    }
}

class GainController {
    constructor(inputNode, outputNode, inputPeerNode, outputPeerNode,
		sendDawNode, returnDawNode) {
        this.inputNode = inputNode;
        this.outputNode = outputNode;
        this.inputPeerNode = inputPeerNode;
        this.outputPeerNode = outputPeerNode;
	this.sendDawNode = sendDawNode;
	this.returnDawNode = returnDawNode;
	
        this.audioContext = inputNode.context;

	// First wire up the managed connections
        const inputToOutputGain = this.audioContext.createGain();
	this.inputNode.connect(inputToOutputGain);
	inputToOutputGain.connect(this.outputNode);
	this._wireCheckbox(document.getElementById('localMonitor'),
		     inputToOutputGain);

	const inputToDawSend = this.audioContext.createGain();
	this.inputNode.connect(inputToDawSend);
	inputToDawSend.connect(this.sendDawNode);
	const peerToDawSend = this.audioContext.createGain();
	this.inputPeerNode.connect(peerToDawSend);
	peerToDawSend.connect(this.sendDawNode);
	this._wireToggle(document.getElementById('dawSource'),
			{peer: peerToDawSend,
			 local: inputToDawSend});

	const peerToOutput = this.audioContext.createGain();
	this.inputPeerNode.connect(peerToOutput);
	peerToOutput.connect(this.outputNode);
	this._wireCheckbox(document.getElementById('peerMonitor'),
			  peerToOutput);

	// Wire all static connections
	this.inputNode.connect(this.outputPeerNode);
	this.returnDawNode.connect(this.outputPeerNode);
	this.returnDawNode.connect(this.outputNode);
    }

    dbToGain(x) {
        return x <= -30 ?
	    0 : Math.pow(10, x / 20);
    }
    
    _createSlider(labelText, gainNode, initialValue = 0) {
        const container = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = labelText;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = -30;
        slider.max = 10;
        slider.step = 1;
        slider.value = initialValue;
	gainNode.gain.value = this.dbToGain(initialValue);
	
        slider.addEventListener('input', () => {
            const gainValue = parseFloat(slider.value);
            gainNode.gain.value = this.dbToGain(gainValue);
        });

        container.appendChild(label);
        container.appendChild(slider);
        this.parentDiv.appendChild(container);
    }

    _wireToggle(container, gains) {
	container.addEventListener('change', (event) => {
	    for (const key in gains) {
		gains[key].gain.value = (key === event.target.value) ? 1 : 0;
	    }
	});
    }

    _wireCheckbox(checkbox, gainNode) {
	checkbox.addEventListener('change', (event) => {
	    gainNode.gain.value = event.target.checked ? 1 : 0;
	});
    }
}

class VUMeter {
    constructor(audioNode, parentDiv, labelText) {
        this.audioNode = audioNode;
        this.parentDiv = parentDiv;
        this._analyser = audioNode.context.createAnalyser();
        this.audioNode.connect(this._analyser);
        this._analyser.fftSize = 2048;
        this.dataArray = new Uint8Array(this._analyser.frequencyBinCount);

        this.containerDiv = document.createElement('div');

        this.labelElement = document.createElement('span');
        this.labelElement.textContent = labelText + ': ';
        this.containerDiv.appendChild(this.labelElement);

        this.vuMeterElement = document.createElement('div');
        this.vuMeterElement.style.width = '0%';
        this.vuMeterElement.style.height = '10px';
        this.vuMeterElement.style.backgroundColor = 'green';
        this.containerDiv.appendChild(this.vuMeterElement);

        this.parentDiv.appendChild(this.containerDiv);

        this._tick = this._tick.bind(this);
        this._tick();
    }

    analyser() {
	return this._analyser;
    }

    _tick() {
        this._analyser.getByteFrequencyData(this.dataArray);
        let maxValue = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            maxValue = Math.max(maxValue, this.dataArray[i]);
        }
        this.vuMeterElement.style.width = `${0.1 + maxValue / 2.55}%`; // Scale to 0-100%
        requestAnimationFrame(this._tick);
    }
}
