class AudioManager {
    constructor() {
	this.audioCtx = null;
	this.localOutputNode = null;
	this.localInputNode = null;

	this.rawInputSource = null;
	this.inputDevices = [];
	this.outputDevices = [];
    }

    ctx() {
	return this.audioCtx;
    }

    async initialize() {
	this.audioCtx = new AudioContext();
	this.localOutputNode = this.audioCtx.createGain();
	this.localInputNode = this.audioCtx.createGain();


	new VUMeter(this.localInputNode, document.body, 'mic');
	this.localOutputVU = new VUMeter(this.localOutputNode, document.body, 'speakers');
	this.localOutputNode.connect(this.audioCtx.destination);

	await this.enumerateDevices();
    }

    async changeAudioInput(deviceId) {
	const stream = await navigator.mediaDevices.getUserMedia({
	    audio: {
		deviceId: deviceId,
		echoCancellation: false,
		noiseSuppression: false,
		autoGainControl: false,
		latencyHint: 'low',
	    },
	});
	if (!!this.rawInputSource) {
	    this.rawInputSource.disconnect();
	}
	this.rawInputSource = this.audioCtx.createMediaStreamSource(stream);

	// new VUMeter(this.rawInputSource, document.body);

	
	this.rawInputSource.connect(this.localInputNode);
	console.log(`Input device changed to ${deviceId}`);
	this.selectedInputDevice = deviceId;
	return;  // Explicit return so that `await` works.
    }

    async changeAudioOutput(deviceId) {
	if (!this.audioCtx || !this.localOutputNode) {
	    console.error("AudioContext or localOutputNode not initialized.");
	    return;
	}

	await this.audioCtx.setSinkId(deviceId);
	console.log(`Output device changed to: ${deviceId}`);
	return;  // Explicit return so that `await` works.
    }

    async enumerateDevices() {
	console.log('Scanning...');
	const devices = await navigator.mediaDevices.enumerateDevices();
	console.log('Enumerating...');
	const inputDevices = devices.filter(
	    device => device.kind === 'audioinput');
	const outputDevices = devices.filter(
	    device => device.kind === 'audiooutput' &&
		device.deviceId !== 'default');
	this.inputDevices = inputDevices;
	this.outputDevices = outputDevices;

	console.log(`Inputs: ${inputDevices.length};`);
	console.log(`Outputs: ${outputDevices.length}`);
    }

    inputSelector(div) {
	const inputList = document.createElement('div');
	inputList.innerHTML = "<H1>Inputs</H1>";
	div.appendChild(inputList);
	for (const device of this.inputDevices) {
	    const radio = document.createElement('input');
	    radio.type = 'radio';
	    radio.name = 'inputDevice';
	    radio.value = device.deviceId;
	    radio.id = `inputDevice_${device.deviceId}`;
	    const label = document.createElement('label');
	    label.htmlFor = `inputDevice_${device.deviceId}`;
	    label.textContent = device.label || device.deviceId;
	    inputList.appendChild(radio);
	    inputList.appendChild(label);
	    inputList.appendChild(document.createElement('br'));
	    radio.addEventListener('change', async() => {
		console.log(`Value: ${radio.value}`);
		await this.changeAudioInput(radio.value);
	    });
	}
    }

    outputSelector(div) {
	const outputList = document.createElement('div');
	outputList.innerHTML = "<H2>Outputs</H2>"
	div.appendChild(outputList);
	for (const device of this.outputDevices) {
	    const radio = document.createElement('input');
	    radio.type = 'radio';
	    radio.name = 'outputDevice';
	    radio.value = device.deviceId;
	    radio.id = `outputDevice_${device.deviceId}`;
	    const label = document.createElement('label');
	    label.htmlFor = `outputDevice_${device.deviceId}`;
	    label.textContent = device.label || device.deviceId;
	    outputList.appendChild(radio);
	    outputList.appendChild(label);
	    outputList.appendChild(document.createElement('br'));
	    radio.addEventListener('change', async() => {
		console.log(`Value: ${radio.value}`);
		await this.changeAudioOutput(radio.value);
	    });
	}
    }
}

class GainController {
    constructor(inputNode, outputNode, inputPeerNode, outputPeerNode, parentDiv) {
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
