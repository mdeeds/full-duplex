// Handles audio input and output selection
class AudioDeviceSelector {
    constructor(containerDiv, inputLabel, outputLabel, audioCtx) {
	this._audioCtx = audioCtx;
	this.containerDiv = containerDiv;
	this.inputLabel = inputLabel;
	this.outputLabel = outputLabel;
	this.inputDevices = [];
	this.outputDevices = [];
	// Initial input and output nodes should connect to default input
	// and output sources.
	this.inputNode = audioCtx.createGain();
	this.outputNode = audioCtx.createGain();
	this.outputNode.connect(audioCtx.destination);

	this.rawInputSources = new Map();

	this._initialize();
    }

    async _initialize() {
	await this.enumerateDevices();
	this.inputSelector(this.containerDiv);
	this.outputSelector(this.containerDiv);
    }
    
    async addAudioInput(deviceId) {
	if (!this.rawInputSources.has(deviceId)) {
	    const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
		    deviceId: deviceId,
		    echoCancellation: false,
		    noiseSuppression: false,
		    autoGainControl: false,
		    latencyHint: 'low',
		},
	    });
	    this.rawInputSources.set(
		deviceId, this._audioCtx.createMediaStreamSource(stream));
	}
	// new VUMeter(this.rawInputSource, document.body);
	
	this.rawInputSources.get(deviceId).connect(this.inputNode);
	console.log(`Input device added: ${deviceId}`);
	return;  // Explicit return so that `await` works.
    }

    async removeAudioInput(deviceId) {
	if (this.rawInputSources.has(deviceId)) {
	    this.rawInputSources.get(deviceId).disconnect();
	}
    }

    async changeAudioOutput(deviceId) {
	if (!this._audioCtx || !this.outputNode) {
	    console.error("AudioContext or localOutputNode not initialized.");
	    return;
	}

	await this._audioCtx.setSinkId(deviceId);
	this.outputNode.connect(this._audioCtx.destination);
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
	    // Remove all existing inputs
	    for (const device of this.rawInputSources.keys()) {
		await this.removeAudioInput(device);
	    }
	    await this.addAudioInput(select.value);
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
	    await this.changeAudioOutput(select.value);
	});
    }
}
