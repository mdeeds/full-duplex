class PeerConnection extends EventTarget {
    constructor(channelId, peerInputNode, peerOutputNode) {
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

	this._initialize(this.channelId);
    }

    // Resolves when peer.conn is no longer null.
    async waitForConnection() {
        return new Promise(resolve => {
            if (this.conn) {
                resolve();
                return;
            }
            this.peer.on('connection', () => {
                resolve();
            });
        });
    }

    connect(otherPeerId) {
	console.log('Connecting to peer...');
	if (this.conn) {
	    this.conn.close();
	}
	this.conn = this.peer.connect(otherPeerId);
	this._addConnHandlers();
    }
    
    sendMessage(message) {
	this.conn.send(message);
    }
    
    async call(audioCtx, outgoingStreamDestination) {
	return new Promise((resolve, reject) => {
   	    const call = this.peer.call(this.otherId, outgoingStreamDestination.stream);
	    call.on('error', (err) => { 
		console.log(`Call error: ${err.message}`);
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
		resolve(audioCtx.createMediaStreamSource(incomingStream));
	    });
	});
    }

    _addConnHandlers() {
	this.conn.on('data', (data) => {
	    if (data.command === 'message') {
		this.dispatchEvent(new CustomEvent('remoteDataReceived',
						   {detail: data}));
	    }
	});

	this.conn.on('close', () => console.log('Connection closed'));
	this.conn.on('error', (err) => console.log('Connection error: ', err));
    }
    
    
    _initialize(channelId) {
	// Ensure that peerId is set properly
	this.peer = new Peer(channelId);
	this.peer.on('open', this._onPeerOpen.bind(this));
	this.peer.on('connection', this._onPeerConnection.bind(this));
	this.peer.on('disconnected', this._onPeerDisconnected.bind(this));
	this.peer.on('close', this._onPeerClose.bind(this));
	this.peer.on('error', this._onPeerError.bind(this));
	this.peer.on('call', this._onPeerCall.bind(this));
	console.log('Initialization complete.');
    }

    _onPeerOpen(id) {
	console.log(`Peer open: ${id}`);
	this.peerId = id; // Set peerId when the peer is opened
	if (this.channelId === this.peerId) {
	    console.log('I am server');
	    this.otherId = id;
	} else {
	    console.log('I am client');
	    this.otherId = this.channelId;
	    this._join();
	}
    }

    _onPeerConnection(c) {
	console.log(`Peer connection. Other: ${c.peer}`);
	this.otherId = c.peer;
	peerStatus.innerHTML += " connected";
	this.conn = c;
	this._addConnHandlers();
    }

    _onPeerDisconnected() {
	console.log('Peer disconnected');
    }

    _onPeerClose() {
	console.log('Peer close');
    }

    _onPeerError(err) {
	console.log(`Peer error`);
	console.log(err);
	if (err.message === `ID "${this.channelId}" is taken`) {
	    // Handle error logic (e.g., re-initialize or retry connection)
	    this._initialize(null);
	}
    }

    _onPeerCall(mediaConnection) {
	console.log(`Peer call from ${mediaConnection.peer}`);
	if (mediaConnection.peer == this.peer.id) {
	    console.log('Self call.  Ignore.');
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
	    const peerSourceStream =
		  audioCtx.createMediaStreamSource(incomingStream);
	    peerSourceStream.connect(this.peerInputNode);
	});
    }
    
}
