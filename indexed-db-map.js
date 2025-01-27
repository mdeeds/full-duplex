class IndexedDBMap {
    constructor(databaseName) {
	this.databaseName = databaseName;
	this.dbPromise = this.openDatabase();
    }

    async openDatabase() {
	return new Promise((resolve, reject) => {
	    const request = indexedDB.open(this.databaseName, 1);

	    request.onupgradeneeded = (event) => {
		const db = event.target.result;
		if (!db.objectStoreNames.contains('map')) {
		    db.createObjectStore('map', { keyPath: 'key' });
		}
	    };

	    request.onsuccess = (event) => {
		resolve(event.target.result);
	    };

	    request.onerror = (event) => {
		reject(event.target.error);
	    };
	});
    }

    async get(key) {
	console.assert(!!key);
	const db = await this.dbPromise;
	const tx = db.transaction('map', 'readonly');
	const store = tx.objectStore('map');
	const request = store.get(key);

	return new Promise((resolve, reject) => {
	    request.onsuccess = (event) => {
		resolve(event.target.result?.value); 
	    };
	    request.onerror = (event) => {
		reject(event.target.error);
	    };
	});
    }
    
    async set(key, value, version) {
	// console.log(`IndexedDBMap set ${value}`);
        const db = await this.dbPromise;
	const tx = db.transaction('map', 'readwrite');
	const store = tx.objectStore('map');
	const request = store.put({ key, value, version });

	return new Promise((resolve, reject) => {
	    request.onsuccess = () => resolve();
	    request.onerror = (event) => reject(event.target.error);
	    tx.oncomplete = () => resolve(); 
	});
    }

    async contains(key) {
	const db = await this.dbPromise;
	const tx = db.transaction('map', 'readonly');
	const store = tx.objectStore('map');
	const request = store.get(key);

	return new Promise((resolve, reject) => {
	    request.onsuccess = (event) => {
		resolve(event.target.result !== undefined); 
	    };
	    request.onerror = (event) => {
		reject(event.target.error);
	    };
	});
    }
}

class ObservableIndexedDBMap extends EventTarget {
    constructor(databaseName) {
	super(); 
	this.map = new IndexedDBMap(databaseName); 
    }

    async get(key) {
	console.assert(!!key);
	return this.map.get(key);
    }

    _makeVersion() {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    async set(key, value, version = undefined) {
	// console.log(`ObservableIndexedDBMap set ${value}`);
	if (!version) {
	    version = this._makeVersion();
	} else {
	    const currentValue = await this.get(key);
	    if (currentValue && currentValue.version === version) {
		// Nothing to do - we already have the latest version.
		return false;
	    }
	}
	await this.map.set(key, value, version);
	this.dispatchEvent(new CustomEvent('dataChanged', {
	    detail: { key, value, version } }));
	return true;
    }

    async contains(key) {
	return this.map.contains(key);
    }
}

class SyncedDBMap {
    constructor(databaseName, peerConnection) {
	this.localMap = new ObservableIndexedDBMap(databaseName);
	this.peerConnection = peerConnection;
	this._attachHandlers();
    }

    async _attachHandlers() {
	await this.peerConnection.waitForConnection();

	console.log('Peer connection established.');
	this.peerConnection.addEventListener('remoteDataReceived', (event) => {
	    // console.log('Data reached DB');
	    // console.log(event.detail);
	    
	    this._setInternal(
		event.detail.key, event.detail.value, event.detail.version);
	});
	console.log('Synchronization handlers attached.');
    }

    async get(key) {
	return this.localMap.get(key);
    }

    async set(key, value, version = undefined) {
	// console.log(`SyncedDBMap set ${value}`);
	await this._setInternal(key, value, version);
	this._sendUpdate(key, value, version);
    }

    async _setInternal(key, value, version = undefined) {
	this.localMap.set(key, value, version);
    }

    async contains(key) {
	return this.localMap.contains(key);
    }

    _sendUpdate(key, value, version) {
	// console.log(`send update ${value}`);
	if (this.peerConnection.conn && this.peerConnection.conn.open) {
	    this.peerConnection.sendMessage({
		type: 'db-sync',
		key: key,
		value: value,
		version: version,
		source: 'local',
	    });
	}
    }
}
