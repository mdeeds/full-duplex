// peer-connection.js
class PeerConnection extends EventTarget {
    constructor(channelId, peerInputNode, peerOutputNode, statusDiv) {
	super();
	this.channelId = channelId;
	// Audio coming from the other peer to us
	this.peerInputNode = peerInputNode;

	// Audio we are sending to the other peer
	this.peerOutputNode = peerOutputNode;
	
	this.peerId = null; // Initialize peerId as null
	this.peer = null;
	this.conn = null;
	this.otherId = undefined;
	this.onDataReceived = null;
	this.onConnectionError = null;
	this.onConnectionClose = null;
	this.statusDiv = statusDiv;

	this._initialize(this.channelId);

	this.connectionResolution = null;
    }

    // Resolves when peer.conn is no longer null.
    async waitForConnection() {
        return new Promise(resolve => {
            if (this.conn) {
                resolve();
                return;
            } else {
		this.connectionResolution = resolve;
	    }
        });
    }

    connect(otherPeerId) {
	this._updateStatus("Connecting...");
	console.log('Connecting to peer...');
	if (this.conn) {
	    this.conn.close();
	}
	this.conn = this.peer.connect(otherPeerId);
	this._addConnHandlers();
    }
    
    sendMessage(message) {
	console.log(`Sending to ${this.conn.peer}`);
	this.conn.send(message);
    }
    
    async call(audioCtx, outgoingStreamDestination) {
	return new Promise((resolve, reject) => {
   	    const call = this.peer.call(
		this.otherId, outgoingStreamDestination.stream);
	    call.on('error', (err) => { 
		console.log(`Call error: ${err.message}`);
		this._updateStatus(`Call error: ${err.message}`);
	    });
	    call.on('stream', (incomingStream) => {
		console.log('Hack is here.');
		// Ungodly hack to actually get the audio to flow
		const a = new Audio();
		a.muted = true;
		a.srcObject = incomingStream;
		a.addEventListener('canplaythrough', () => {
		    console.log('ready to flow'); });
		// End ungodly hack.
		console.log('Call stream');
		this._updateStatus("Call established.");
		resolve(audioCtx.createMediaStreamSource(incomingStream));
	    });
	});
    }

    _addConnHandlers() {
	this.conn.on('data', (data) => {
	    console.log('Connection data');
	    console.log(data);
	    this.dispatchEvent(new CustomEvent('remoteDataReceived',
					       {detail: data}));
	});

	this.conn.on('close', () => {
	    console.log('Connection closed');
	    this._updateStatus("Connection closed.");
	    // this._reset();
	});
	this.conn.on('error', (err) => {
	    console.log('Connection error: ', err);
	    this._updateStatus(`Connection error: ${err}`);
	});
    }

    async _reset() {
	console.log('Resetting peer connection.');
	this._updateStatus("Resetting connection...");
	if (this.conn) {
	    this.conn.close();
	    this.conn = null;
	}
	this.otherId = undefined;
	// Re-initialize the peer, which will create a new peer ID.
	this._initialize(this.channelId);
    }

    _updateStatus(status) {
	this.statusDiv.textContent = `Status: ${status}`;
    }
    
    
    _initialize(channelId) {
	this._updateStatus("Initializing...");
	// Ensure that peerId is set properly
	this._updateStatus("Initializing peer...");
	this.peer = new Peer(channelId);
	this.peer.on('open', this._onPeerOpen.bind(this));
	this.peer.on('connection', this._onPeerConnection.bind(this));
	this.peer.on('disconnected', this._onPeerDisconnected.bind(this));
	this.peer.on('close', this._onPeerClose.bind(this));
	this.peer.on('error', this._onPeerError.bind(this));
	this.peer.on('call', this._onPeerCall.bind(this));
	console.log('Initialization complete.');
    }

    async _onPeerOpen(id) {
	console.log(`Peer open: ${id}`);
	this.peerId = id; // Set peerId when the peer is opened
	this._updateStatus(`Peer ID: ${id}`);
	if (this.channelId === this.peerId) {
	    console.log('I am server');
	    this.otherId = id;
	    // The server doesn't try to join.
	} else {
	    console.log('I am client');
	    this.otherId = this.channelId;
	    await this._join();
	}
	if (this.connectionResolution) {
	    console.log('Resolving connection waiter.');
	    this.connectionResolution();
	}
    }

    _onPeerConnection(c) {
	console.log(`Peer connection. Other: ${c.peer}`);
	this._updateStatus(`Peer connected to: ${c.peer}`);
	this.otherId = c.peer;
	this.conn = c;
	this._addConnHandlers();
    }

    _onPeerDisconnected() {
	console.log('Peer disconnected');
	this._updateStatus("Peer disconnected.");
    }

    _onPeerClose() {
	console.log('Peer close');
	this._updateStatus("Peer closed.");
    }

    _onPeerError(err) {
	console.log(`Peer error`);
	console.log(err);
	this._updateStatus(`Peer error: ${err.message}`);
	if (err.message === `ID "${this.channelId}" is taken`) {
	    // We are the client, so reinitialize with 'null'.
	    this._initialize(null);
	}
    }

    _onPeerCall(mediaConnection) {
	console.log(`Peer call from ${mediaConnection.peer}`);
	this._updateStatus(`Peer call from: ${mediaConnection.peer}`);
	if (mediaConnection.peer == this.peer.id) {
	    console.log('Self call.  Ignore.');
	    this._updateStatus("Self call.  Ignored.");
	}
	const audioCtx = this.peerOutputNode.context;
	const outgoingStream =
	      audioCtx.createMediaStreamDestination();
	this.peerOutputNode.connect(outgoingStream);

	mediaConnection.answer(outgoingStream.stream);
	mediaConnection.on(
	    'stream',
	    (incomingStream) => this._handleIncomingStream(incomingStream));
    }

    _handleIncomingStream(incomingStream) {
	console.log('Stream Received');
	this._updateStatus("Stream received.");
	// Ideally, we want to disconnect anything coming into the
	// peerInputNode
	//if (this.peerInputNode) {
	//    this.peerInputNode.disconnect();
	//}
	console.log('Hack is here.');
	// Ungodly hack to actually get the audio to flow
	const a = new Audio();
	a.muted = true;
	a.srcObject = incomingStream;
	a.addEventListener('canplaythrough', () => {
	    console.log('ready to flow'); });
	
	// Properly handle stream and create media source node
	const audioCtx = this.peerInputNode.context;
	const peerInputStream = audioCtx.createMediaStreamSource(
	    incomingStream);
	peerInputStream.connect(this.peerInputNode);
    }

    async _join() {
	console.log('join');
	this._updateStatus("Joining peer...");
	if (this.conn) {
	    this.conn.close();
	}
	this.conn = this.peer.connect(this.otherId);
	this._addConnHandlers();

	const audioCtx = this.peerOutputNode.context;
	const peerOutputStream = audioCtx.createMediaStreamDestination();
	this.peerOutputNode.connect(peerOutputStream);

	console.log(`Calling ${this.otherId}`);
	const mediaConnection = this.peer.call(
	    this.otherId, peerOutputStream.stream);
	mediaConnection.on('stream', (incomingStream) => {
	    console.log('Hack is here.');
	    // Ungodly hack to actually get the audio to flow
	    const a = new Audio();
	    a.muted = true;
	    a.srcObject = incomingStream;
	    a.addEventListener('canplaythrough', () => {
		console.log('ready to flow'); });
	    // End ungodly hack.
	    console.log('Got callee stream.');
	    this._updateStatus("Receiving audio stream from peer.");
	    const peerSourceStream =
		  audioCtx.createMediaStreamSource(incomingStream);
	    peerSourceStream.connect(this.peerInputNode);
	});
    }
    
}
