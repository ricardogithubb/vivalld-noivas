// database.js - Gerenciamento do IndexedDB

const DB_NAME = 'VivalldDB';
const DB_VERSION = 3;

let db;

// Inicializar banco de dados
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Erro ao abrir IndexedDB:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("IndexedDB aberto com sucesso");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Criar object stores
            if (!db.objectStoreNames.contains('usuarios')) {
                const userStore = db.createObjectStore('usuarios', { keyPath: 'email' });
                userStore.createIndex('nome', 'nome', { unique: false });
                userStore.createIndex('dataCadastro', 'dataCadastro', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('userState')) {
                const userStateStore = db.createObjectStore('userState', { keyPath: 'email' });
                userStateStore.createIndex('instrucoesLidas', 'instrucoesLidas', { unique: false });
                userStateStore.createIndex('orientacoesLidas', 'orientacoesLidas', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('musicas')) {
                const musicasStore = db.createObjectStore('musicas', { keyPath: 'id', autoIncrement: true });
                musicasStore.createIndex('categoria', 'categoria', { unique: false });
                musicasStore.createIndex('nome', 'nome', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('boletos')) {
                const boletosStore = db.createObjectStore('boletos', { keyPath: 'id', autoIncrement: true });
                boletosStore.createIndex('email', 'email', { unique: false });
                boletosStore.createIndex('status', 'status', { unique: false });
                boletosStore.createIndex('vencimento', 'vencimento', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('selecoes')) {
                const selecoesStore = db.createObjectStore('selecoes', { keyPath: ['email', 'categoria'] });
                selecoesStore.createIndex('email', 'email', { unique: false });
                selecoesStore.createIndex('categoria', 'categoria', { unique: false });
                selecoesStore.createIndex('dataAtualizacao', 'dataAtualizacao', { unique: false });
            }
        };
    });
}

// Salvar estado do usuário
function saveUserState(email, userState) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['userState'], 'readwrite');
        const store = transaction.objectStore('userState');
        const request = store.put({ email, ...userState });
        
        request.onsuccess = () => {
            console.log(`Estado do usuário ${email} salvo com sucesso`);
            resolve(request.result);
        };
        
        request.onerror = (error) => {
            console.error("Erro ao salvar estado do usuário:", error);
            reject(error);
        };
    });
}

// Carregar estado do usuário
function loadUserState(email) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['userState'], 'readonly');
        const store = transaction.objectStore('userState');
        const request = store.get(email);
        
        request.onsuccess = (event) => {
            resolve(request.result || null);
        };
        
        request.onerror = (error) => {
            console.error("Erro ao carregar estado do usuário:", error);
            reject(error);
        };
    });
}

// Salvar seleções de músicas
function saveSelecoes(email, categoria, musicas) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['selecoes'], 'readwrite');
        const store = transaction.objectStore('selecoes');
        
        const selecao = {
            email: email,
            categoria: categoria,
            musicas: musicas,
            dataAtualizacao: new Date().toISOString()
        };
        
        const request = store.put(selecao);
        
        request.onsuccess = () => {
            console.log(`Seleções para ${categoria} do usuário ${email} salvas com sucesso`);
            resolve(request.result);
        };
        
        request.onerror = (error) => {
            console.error("Erro ao salvar seleções:", error);
            reject(error);
        };
    });
}

// Carregar seleções de músicas
function loadSelecoes(email) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['selecoes'], 'readonly');
        const store = transaction.objectStore('selecoes');
        const index = store.index('email');
        const request = index.getAll(email);
        
        request.onsuccess = (event) => {
            const selecoes = {};
            request.result.forEach(item => {
                selecoes[item.categoria] = item.musicas;
            });
            resolve(selecoes);
        };
        
        request.onerror = (error) => {
            console.error("Erro ao carregar seleções:", error);
            reject(error);
        };
    });
}

// Salvar boletos
function saveBoletos(email, boletos) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['boletos'], 'readwrite');
        const store = transaction.objectStore('boletos');
        
        // Adicionar email a cada boleto
        boletos.forEach(boleto => {
            boleto.email = email;
            store.add(boleto);
        });
        
        transaction.oncomplete = () => {
            console.log(`Boletos do usuário ${email} salvos com sucesso`);
            resolve();
        };
        
        transaction.onerror = (error) => {
            console.error("Erro ao salvar boletos:", error);
            reject(error);
        };
    });
}

// Carregar boletos do usuário
function loadBoletos(email) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['boletos'], 'readonly');
        const store = transaction.objectStore('boletos');
        const index = store.index('email');
        const request = index.getAll(email);
        
        request.onsuccess = (event) => {
            resolve(request.result || []);
        };
        
        request.onerror = (error) => {
            console.error("Erro ao carregar boletos:", error);
            reject(error);
        };
    });
}

// Criar usuário de teste
function createTestUser() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['usuarios', 'boletos', 'selecoes', 'userState'], 'readwrite');
        
        // Criar usuário de teste
        const userStore = transaction.objectStore('usuarios');
        const testUser = {
            email: 'teste@gmail.com',
            nome: 'Noiva Teste',
            senha: '123', // Em produção, usar hash
            dataCadastro: new Date().toISOString(),
            telefone: '(11) 99999-9999',
            dataCasamento: '15/07/2024'
        };
        userStore.put(testUser);
        
        // Criar estado inicial do usuário
        const stateStore = transaction.objectStore('userState');
        stateStore.put({
            email: 'teste@gmail.com',
            instrucoesLidas: false,
            orientacoesLidas: false
        });
        
        // Criar boletos de exemplo
        const boletoStore = transaction.objectStore('boletos');
        const boletos = [
            {
                email: 'teste@gmail.com',
                descricao: "Entrada (30%)",
                vencimento: "15/03/2024",
                valor: "R$ 1.050,00",
                status: "paid",
                dataPagamento: "15/01/2024"
            },
            {
                email: 'teste@gmail.com',
                descricao: "2ª Parcela",
                vencimento: "15/06/2024",
                valor: "R$ 1.050,00",
                status: "pending",
                dataPagamento: null
            },
            {
                email: 'teste@gmail.com',
                descricao: "3ª Parcela",
                vencimento: "15/07/2024",
                valor: "R$ 1.400,00",
                status: "pending",
                dataPagamento: null
            }
        ];
        
        boletos.forEach(boleto => boletoStore.add(boleto));
        
        transaction.oncomplete = () => {
            console.log("Usuário de teste criado com sucesso");
            resolve();
        };
        
        transaction.onerror = (error) => {
            console.error("Erro ao criar usuário de teste:", error);
            reject(error);
        };
    });
}

// Verificar credenciais
function checkCredentials(email, senha) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Banco de dados não inicializado"));
            return;
        }
        
        const transaction = db.transaction(['usuarios'], 'readonly');
        const store = transaction.objectStore('usuarios');
        const request = store.get(email);
        
        request.onsuccess = (event) => {
            const user = request.result;
            if (user && user.senha === senha) {
                resolve({ success: true, user: user });
            } else {
                resolve({ success: false, message: "E-mail ou senha inválidos" });
            }
        };
        
        request.onerror = (error) => {
            console.error("Erro ao verificar credenciais:", error);
            reject(error);
        };
    });
}

// Exportar funções
window.DB = {
    init: initDB,
    saveUserState,
    loadUserState,
    saveSelecoes,
    loadSelecoes,
    saveBoletos,
    loadBoletos,
    createTestUser,
    checkCredentials
};