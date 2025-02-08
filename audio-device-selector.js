// Handles audio input and output selection
class AudioDeviceSelector {
    constructor(containerDiv, inputLabel, outputLabel, audioCtx) {
	this._audioCtx = audioCtx;
	this.containerDiv = containerDiv;
	this.inputLabel = inputLabel;
	this.outputLabel = outputLabel;
	this.inputDevices = [];
	this.outputDevices = [];

	this.currentOutputDeviceId = '';
	
	this.inputNode = audioCtx.createGain();
	this.outputNode = audioCtx.createGain();

	new VUMeter(this.inputNode, document.body, inputLabel);
	new VUMeter(this.outputNode, document.body, outputLabel);
	
	this._rawInputSourceNode;
    }

    async initialize() {
	await this.enumerateDevices();
	this.inputSelector(this.containerDiv);
	this.outputSelector(this.containerDiv);

	this.outputStream = this._audioCtx.createMediaStreamDestination();
	this.outputNode.connect(this.outputStream);

	this._outputContext = new AudioContext();
	this.outputSink = this._outputContext.createMediaStreamSource(
	    this.outputStream.stream);
	this.outputSink.connect(this._outputContext.destination);
    }
    
    async setAudioInput(deviceId) {
	const stream = await navigator.mediaDevices.getUserMedia({
	    audio: {
		deviceId: deviceId,
		echoCancellation: false,
		noiseSuppression: false,
		autoGainControl: false,
		latencyHint: 'low',
	    },
	});
	if (!!this._rawInputSourceNode) {
	    this._rawInputSourceNode.disconnect();
	}
	this._rawInputSourceNode =
	      this._audioCtx.createMediaStreamSource(stream);

	// new VUMeter(this.rawInputSource, document.body);
	
	this._rawInputSourceNode.connect(this.inputNode);
	console.log(`Input device added: ${deviceId}`);
	return;  // Explicit return so that `await` works.
    }

    async setAudioOutput(deviceId) {
	if (!this._outputContext) {
	    console.error("AudioContext or localOutputNode not initialized.");
	    return;
	}
	await this._outputContext.setSinkId(deviceId);
	return;  // Explicit return so that `await` works.
    }

    async enumerateDevices() {
	console.log('Scanning...');
	const devices = await navigator.mediaDevices.enumerateDevices();
	console.log('Enumerating...');
	const inputDevices = devices.filter(
	    device => device.kind === 'audioinput');
	const outputDevices = devices.filter(
	    device => device.kind === 'audiooutput');
	this.inputDevices = inputDevices;
	this.outputDevices = outputDevices;

	console.log(`Inputs: ${inputDevices.length};`);
	console.log(`Outputs: ${outputDevices.length}`);
    }

    inputSelector(div) {
	console.log('Adding input device selector');
	const inputList = document.createElement('span');
	inputList.innerHTML = this.inputLabel;
	div.appendChild(inputList);

	const select = document.createElement('select');
	select.name = 'inputDevice';
	select.id = 'inputDeviceSelect';
	inputList.appendChild(select);

	for (const device of this.inputDevices) {
	    const option = document.createElement('option');
	    option.value = device.deviceId;
	    option.text = device.label || device.deviceId;
	    select.appendChild(option);
	}

	select.addEventListener('change', async() => {
	    console.log(`Value: ${select.value}`);
	    await this.setAudioInput(select.value);
	});
    }

    outputSelector(div) {
	console.log('Adding output device selector');
	const outputList = document.createElement('span');
	outputList.innerHTML = this.outputLabel
	div.appendChild(outputList);

	const select = document.createElement('select');
	select.name = 'outputDevice';
	select.id = 'outputDeviceSelect';
	outputList.appendChild(select);

	for (const device of this.outputDevices) {
	    const option = document.createElement('option');
	    option.value = device.deviceId;
	    option.text = device.label || device.deviceId;
	    select.appendChild(option);
	}

	select.addEventListener('change', async() => {
	    console.log(`Value: ${select.value}`);
	    await this.setAudioOutput(select.value);
	});
    }
}
