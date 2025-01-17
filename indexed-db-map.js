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

    makeVersion() {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    async set(key, value, version = undefined) {
	if (!!version) {
	    version = makeVersion();
	} else {
	    const currentValue = await this.get(key);
	    if (currentValue.version === version) {
		// Nothing to do - we already have the latest version.
		return;
	    }
	}
	await this.map.set(key, value, version);
	this.dispatchEvent(new CustomEvent('dataChanged', {
	    detail: { key, value, version } }));
    }

    async contains(key) {
	return this.map.contains(key);
    }
}

class SyncedDBMap {
    constructor(databaseName, peerConnection) {
	this.localMap = new ObservableIndexedDBMap(databaseName);
	this.peerConnection = peerConnection;

	this.localMap.addEventListener('dataChanged', (event) => {
	    this._sendUpdate(
		event.detail.key, event.detail.value, event.detail.version);
	});

	this.peerConnection.conn.on('data', (data) => {
	    if (data && data.type === 'db-sync') {
		this._applyRemoteUpdate(data.key, data.value, data.version);
	    }
	});
    }

    async get(key) {
	return this.localMap.get(key);
    }

    async set(key, value, version = undefined) {
	await this.localMap.set(key, value, version);
    }

    async contains(key) {
	return this.localMap.contains(key);
    }

    _sendUpdate(key, value, version) {
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

    async _applyRemoteUpdate(key, value, version) {
	await this.localMap.set(key, value, version);
    }
}
