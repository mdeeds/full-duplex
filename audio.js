class AudioManager extends EventTarget {
    constructor() {
	super();
	this.audioCtx = null;
	this.localOutputNode = null;
	this.localInputNode = null;

	this.isRecording = false;
	this.recordingBuffer = null;
	this.samplesRecorded = 0;
    }
    
    ctx() {
	return this.audioCtx;
    }

    async initialize() {
	this.audioCtx = new AudioContext();
	this.localOutputNode = this.audioCtx.createGain();
	this.localInputNode = this.audioCtx.createGain();

	new VUMeter(this.localInputNode, document.body, 'mic');
	this.localOutputVU = new VUMeter(
	    this.localOutputNode, document.body, 'speakers');
	this.localOutputNode.connect(this.audioCtx.destination);

	const recordButton = document.getElementById('recordButton');
	recordButton.addEventListener(
	    'click', (event) => { this._toggleRecording(event); });

	// Create a worklet recorder and add it to the graph.
	await this.audioCtx.audioWorklet.addModule('worklet-recorder.js');
	this.workletRecorderNode = new AudioWorkletNode(
	    this.audioCtx, 'worklet-recorder');
	this.localInputNode.connect(this.workletRecorderNode);
	this.workletRecorderNode.port.onmessage = (event) => {
	    this._processRecordingData(event.data);
	}
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
		parentDiv) {
        this.inputNode = inputNode;
        this.outputNode = outputNode;
        this.inputPeerNode = inputPeerNode;
        this.outputPeerNode = outputPeerNode;
        this.parentDiv = parentDiv;
        this.audioContext = inputNode.context;

	this.parentDiv.innerHTML = "<H1>Monitoring</H1>";

        this.inputToOutputGain = this.audioContext.createGain();
        this.inputToPeerOutputGain = this.audioContext.createGain();
        this.peerInputToOutputGain = this.audioContext.createGain();
        this.peerInputToPeerOutputGain = this.audioContext.createGain();

        this.inputNode.connect(this.inputToOutputGain);
        this.inputToOutputGain.connect(this.outputNode);

        this.inputNode.connect(this.inputToPeerOutputGain);
        this.inputToPeerOutputGain.connect(this.outputPeerNode);

        this.inputPeerNode.connect(this.peerInputToOutputGain);
        this.peerInputToOutputGain.connect(this.outputNode);

        this.inputPeerNode.connect(this.peerInputToPeerOutputGain);
        this.peerInputToPeerOutputGain.connect(this.outputPeerNode);

        this._createSlider("Input to Output Gain",
			   this.inputToOutputGain, -30);
        this._createSlider("Input to Peer Output Gain",
			   this.inputToPeerOutputGain, 0);
        this._createSlider("Peer Input to Output Gain",
			   this.peerInputToOutputGain, 0);
        this._createSlider("Peer Input to Peer Output Gain",
			   this.peerInputToPeerOutputGain, -30);

	new VUMeter(this.outputPeerNode, document.body, 'send');
	new VUMeter(this.inputPeerNode, document.body, 'recieve');
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
