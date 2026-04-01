const DB = {
    dbName: 'vivalld_repertorio_db',
    dbVersion: 1,
    db: null,

    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('songs')) {
                    const songsStore = db.createObjectStore('songs', { keyPath: 'song_id' });
                    songsStore.createIndex('section', 'section', { unique: false });
                }

                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('sync_queue')) {
                    db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = () => reject(request.error);
        });
    },

    async put(storeName, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(value);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll(storeName) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async clear(storeName) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async saveSongs(songs) {
        await this.clear('songs');
        for (const song of songs) {
            await this.put('songs', song);
        }
    },

    async getSongsBySection(section) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('songs', 'readonly');
            const store = tx.objectStore('songs');
            const index = store.index('section');
            const request = index.getAll(section);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async setMeta(key, value) {
        return this.put('meta', { key, value });
    },

    async getMeta(key, defaultValue = null) {
        const result = await this.get('meta', key);
        return result ? result.value : defaultValue;
    },

    async enqueueSync(operation) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sync_queue', 'readwrite');
            const store = tx.objectStore('sync_queue');
            const request = store.add({
                ...operation,
                createdAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
};

window.DB = DB;