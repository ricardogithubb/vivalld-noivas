const DB = {
    DB_NAME: 'VivalldDB2',
    DB_VERSION: 1, // Incrementado para forçar upgrade
    db: null,
    isInitialized: false,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = async (event) => {
                this.db = event.target.result;
                console.log('Database opened successfully');
                
                // Aguardar um momento para garantir que as stores estão prontas
                setTimeout(async () => {
                    try {
                        await this.seedData();
                        this.isInitialized = true;
                        resolve();
                    } catch (error) {
                        console.error('Error seeding data:', error);
                        // Mesmo com erro no seed, resolvemos para não travar a app
                        this.isInitialized = true;
                        resolve();
                    }
                }, 100);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Database upgrade needed - version:', event.oldVersion, '->', event.newVersion);

                // Store for user session
                if (!db.objectStoreNames.contains('session')) {
                    db.createObjectStore('session');
                    console.log('Created session store');
                }

                // Store for terms acceptance
                if (!db.objectStoreNames.contains('terms')) {
                    db.createObjectStore('terms');
                    console.log('Created terms store');
                }

                // Store for wizard progress
                if (!db.objectStoreNames.contains('wizardProgress')) {
                    db.createObjectStore('wizardProgress');
                    console.log('Created wizardProgress store');
                }

                // Store for music selections
                if (!db.objectStoreNames.contains('selections')) {
                    db.createObjectStore('selections');
                    console.log('Created selections store');
                }

                // Store for songs catalog
                if (!db.objectStoreNames.contains('songs')) {
                    const songStore = db.createObjectStore('songs', { keyPath: 'id' });
                    songStore.createIndex('section', 'section', { unique: false });
                    console.log('Created songs store');
                }

                // Store for bills
                if (!db.objectStoreNames.contains('bills')) {
                    const billStore = db.createObjectStore('bills', { keyPath: 'id' });
                    billStore.createIndex('status', 'status', { unique: false });
                    console.log('Created bills store');
                }
            };
        });
    },

    async ensureInitialized() {
        if (!this.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    },

    async seedData() {
        try {
            console.log('Starting seed data..........');
            
            // Verificar se as stores existem
            if (!this.db.objectStoreNames.contains('songs')) {
                console.log('Songs store not ready yet');
                return;
            }

            // Check if songs already exist
            const songs = await this.getAll('songs');
            if (songs.length === 0) {
                console.log('Seeding songs.............');
                await this.seedSongs();
            }

            // Check if bills already exist
            if (this.db.objectStoreNames.contains('bills')) {
                const bills = await this.getAll('bills');
                if (bills.length === 0) {
                    console.log('Seeding bills...');
                    await this.seedBills();
                }
            }
            
            console.log('Seed data completed');
        } catch (error) {
            console.error('Error in seedData:', error);
            throw error;
        }
    },

    async seedSongs() {
        console.log('Seeding songs from catalog............');
        
        // Mapeamento das seções em português para as chaves do objeto
        const sectionMapping = {
            'Entrada do Noivo': 'entradaNoivo',
            'Entrada das Damas': 'entradaDamas',
            'Entrada da Noiva': 'entradaNoiva',
            'Salmo': 'salmo',
            'Aclamação': 'aclamacao',
            'Comunhão': 'comunhao',
            'Assinatura': 'assinatura',
            'Fotos': 'entradaDamas', // Usando músicas da entrada das damas para fotos
            'Saída do Casal': 'saida'
        };

        const songs = [];

        let cont = 1;

        // Para cada seção, pegar as músicas correspondentes do catálogo
        for (const [sectionName, sectionKey] of Object.entries(sectionMapping)) {
            const catalogSongs = musicasDB[sectionKey] || [];
            
            // Limitar a 10 músicas por seção (ou usar todas se tiver menos)
            const songsToAdd = catalogSongs;            

            songsToAdd.forEach(song => {
                // Calcular duração aproximada (3 minutos como padrão já que não temos no catálogo)
                const duration = 180; // 3 minutos em segundos
                
                songs.push({
                    id: `song_${cont}`,
                    title: song.nome,
                    artist: song.artista || 'Artista não informado',
                    section: sectionName,
                    duration: duration,
                    audioUrl: song.url ? `/${song.url}` : null // Ajuste o caminho conforme necessário
                });
                cont++;
            });

            // Se não houver músicas no catálogo para esta seção, usar músicas padrão
            if (songsToAdd.length === 0) {
                console.log(`No songs found for section ${sectionName}, using defaults`);
                for (let i = 1; i <= 5; i++) {
                    songs.push({
                        id: `song_default_${sectionName}_${i}`,
                        title: `Música ${i} - ${sectionName}`,
                        artist: 'Artista Vivalld',
                        section: sectionName,
                        duration: 180,
                        audioUrl: null
                    });
                }
            }
        }

        // Usar transaction para inserir todas as músicas
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('songs', 'readwrite');
            const store = transaction.objectStore('songs');
            
            transaction.oncomplete = () => {
                console.log(`Songs seeded successfully: ${songs.length} songs added`);
                resolve();
            };
            
            transaction.onerror = (event) => {
                console.error('Error seeding songs:', event.target.error);
                reject(event.target.error);
            };

            songs.forEach(song => {
                store.put(song);
            });
        });
    },

    async seedBills() {
        const bills = [
            {
                id: 'bill_1',
                description: 'Entrada (30%)',
                dueDate: '2024-04-15',
                amount: 'R$ 1.500,00',
                status: 'pago',
                barCode: '12345678901234567890123456789012345678901234'
            },
            {
                id: 'bill_2',
                description: 'Segunda Parcela (30%)',
                dueDate: '2024-05-15',
                amount: 'R$ 1.500,00',
                status: 'pendente',
                barCode: '23456789012345678901234567890123456789012345'
            },
            {
                id: 'bill_3',
                description: 'Saldo Final (40%)',
                dueDate: '2024-06-01',
                amount: 'R$ 2.000,00',
                status: 'pendente',
                barCode: '34567890123456789012345678901234567890123456'
            }
        ];

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction('bills', 'readwrite');
                const store = transaction.objectStore('bills');
                
                transaction.oncomplete = () => {
                    console.log('Bills seeded successfully');
                    resolve();
                };
                
                transaction.onerror = (event) => {
                    console.error('Error seeding bills:', event.target.error);
                    reject(event.target.error);
                };

                bills.forEach(bill => {
                    store.put(bill);
                });
            } catch (error) {
                console.error('Error in seedBills transaction:', error);
                reject(error);
            }
        });
    },

    async get(storeName, key) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`Store ${storeName} does not exist`);
                    resolve(null);
                    return;
                }

                const transaction = this.db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);

                request.onerror = () => {
                    console.error(`Error getting ${key} from ${storeName}:`, request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
            } catch (error) {
                console.error(`Error in get ${storeName}:`, error);
                reject(error);
            }
        });
    },

    async set(storeName, key, value) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`Store ${storeName} does not exist`);
                    resolve();
                    return;
                }

                const transaction = this.db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                
                let request;
                // Verificar se o object store tem keyPath
                if (store.keyPath) {
                    // Se tem keyPath, o objeto já deve conter a chave
                    request = store.put(value);
                } else {
                    // Se não tem keyPath, usar a chave fornecida
                    request = store.put(value, key);
                }

                request.onerror = () => {
                    console.error(`Error setting ${key} in ${storeName}:`, request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    resolve();
                };
            } catch (error) {
                console.error(`Error in set ${storeName}:`, error);
                reject(error);
            }
        });
    },

    async getAll(storeName, indexName = null, value = null) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`Store ${storeName} does not exist`);
                    resolve([]);
                    return;
                }

                const transaction = this.db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                let request;

                if (indexName && value !== null) {
                    const index = store.index(indexName);
                    request = index.getAll(value);
                } else {
                    request = store.getAll();
                }

                request.onerror = () => {
                    console.error(`Error getting all from ${storeName}:`, request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
            } catch (error) {
                console.error(`Error in getAll ${storeName}:`, error);
                reject(error);
            }
        });
    },

    async delete(storeName, key) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`Store ${storeName} does not exist`);
                    resolve();
                    return;
                }

                const transaction = this.db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);

                request.onerror = () => {
                    console.error(`Error deleting ${key} from ${storeName}:`, request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    resolve();
                };
            } catch (error) {
                console.error(`Error in delete ${storeName}:`, error);
                reject(error);
            }
        });
    },

    async clear(storeName) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`Store ${storeName} does not exist`);
                    resolve();
                    return;
                }

                const transaction = this.db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onerror = () => {
                    console.error(`Error clearing ${storeName}:`, request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    resolve();
                };
            } catch (error) {
                console.error(`Error in clear ${storeName}:`, error);
                reject(error);
            }
        });
    }
};

// Initialize DB when script loads
window.DB = DB;
