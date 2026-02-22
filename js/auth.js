// auth.js - Gerenciamento de autenticação

// Estado do usuário atual
let currentUser = {
    email: null,
    nome: null,
    loggedIn: false,
    instrucoesLidas: false,
    orientacoesLidas: false,
    selecoes: {
        entradaNoivo: [],
        entradaDamas: [],
        entradaNoiva: [],
        salmo: [],
        aclamacao: [],
        comunhao: [],
        assinatura: [],
        saida: []
    },
    dataCasamento: null,
    telefone: null
};

// Inicializar autenticação
async function initAuth() {
    try {
        // Verificar se usuário está logado (sessionStorage)
        const savedSession = sessionStorage.getItem('vivalld_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            currentUser.email = session.email;
            currentUser.nome = session.nome;
            currentUser.loggedIn = true;
            
            // Carregar estado salvo
            await loadUserData(session.email);
        }
    } catch (error) {
        console.error("Erro ao inicializar autenticação:", error);
    }
}

// Carregar dados do usuário
async function loadUserData(email) {
    try {
        // Carregar estado
        const savedState = await DB.loadUserState(email);
        if (savedState) {
            currentUser.instrucoesLidas = savedState.instrucoesLidas || false;
            currentUser.orientacoesLidas = savedState.orientacoesLidas || false;
        }
        
        // Carregar seleções
        const selecoes = await DB.loadSelecoes(email);
        if (selecoes) {
            currentUser.selecoes = { ...currentUser.selecoes, ...selecoes };
        }
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
    }
}

// Login
async function login(email, password) {
    try {
        const result = await DB.checkCredentials(email, password);
        
        if (result.success) {
            currentUser.loggedIn = true;
            currentUser.email = email;
            currentUser.nome = result.user.nome;
            currentUser.dataCasamento = result.user.dataCasamento;
            currentUser.telefone = result.user.telefone;
            
            // Salvar sessão
            sessionStorage.setItem('vivalld_session', JSON.stringify({
                email: email,
                nome: result.user.nome
            }));
            
            // Carregar dados salvos
            await loadUserData(email);
            
            return { success: true, user: currentUser };
        } else {
            return { success: false, message: result.message };
        }
    } catch (error) {
        console.error("Erro no login:", error);
        return { success: false, message: "Erro ao fazer login" };
    }
}

// Logout
function logout() {
    currentUser = {
        email: null,
        nome: null,
        loggedIn: false,
        instrucoesLidas: false,
        orientacoesLidas: false,
        selecoes: {
            entradaNoivo: [],
            entradaDamas: [],
            entradaNoiva: [],
            salmo: [],
            aclamacao: [],
            comunhao: [],
            assinatura: [],
            saida: []
        },
        dataCasamento: null,
        telefone: null
    };
    
    sessionStorage.removeItem('vivalld_session');
    
    // Redirecionar para tela de login
    $('#loginScreen').show();
    $('#mainScreen').hide();
    $('#loginForm')[0].reset();
}

// Verificar se está logado
function isLoggedIn() {
    return currentUser.loggedIn;
}

// Marcar instruções como lidas
async function markInstrucoesLidas() {
    currentUser.instrucoesLidas = true;
    if (currentUser.email) {
        await DB.saveUserState(currentUser.email, {
            instrucoesLidas: true,
            orientacoesLidas: currentUser.orientacoesLidas
        });
    }
}

// Marcar orientações como lidas
async function markOrientacoesLidas() {
    currentUser.orientacoesLidas = true;
    if (currentUser.email) {
        await DB.saveUserState(currentUser.email, {
            instrucoesLidas: currentUser.instrucoesLidas,
            orientacoesLidas: true
        });
    }
}

// Selecionar música
async function selectMusica(categoria, musicaId) {
    if (!currentUser.selecoes[categoria]) {
        currentUser.selecoes[categoria] = [];
    }
    
    const index = currentUser.selecoes[categoria].indexOf(musicaId);
    
    if (index === -1) {
        // Adicionar música
        if (currentUser.selecoes[categoria].length < 2) {
            currentUser.selecoes[categoria].push(musicaId);
        } else {
            return { success: false, message: 'Máximo de 2 músicas por categoria' };
        }
    } else {
        // Remover música
        currentUser.selecoes[categoria].splice(index, 1);
    }
    
    // Salvar no banco de dados
    if (currentUser.email) {
        await DB.saveSelecoes(currentUser.email, categoria, currentUser.selecoes[categoria]);
    }
    
    return { 
        success: true, 
        selecionadas: currentUser.selecoes[categoria].length,
        total: currentUser.selecoes[categoria]
    };
}

// Obter seleções do usuário
function getUserSelecoes() {
    return currentUser.selecoes;
}

// Verificar se usuário completou todas as seleções
function hasCompletedAllSelecoes() {
    const categorias = ['entradaNoivo', 'entradaDamas', 'entradaNoiva', 'salmo', 
                       'aclamacao', 'comunhao', 'assinatura', 'saida'];
    
    return categorias.every(cat => 
        currentUser.selecoes[cat] && currentUser.selecoes[cat].length === 2
    );
}

// Calcular progresso
function getProgresso() {
    const categorias = ['entradaNoivo', 'entradaDamas', 'entradaNoiva', 'salmo', 
                       'aclamacao', 'comunhao', 'assinatura', 'saida'];
    
    const totalSelecionadas = categorias.reduce((total, cat) => {
        return total + (currentUser.selecoes[cat]?.length || 0);
    }, 0);
    
    const totalNecessario = categorias.length * 2;
    return (totalSelecionadas / totalNecessario) * 100;
}

// Obter informações do usuário
function getUserInfo() {
    return {
        nome: currentUser.nome,
        email: currentUser.email,
        dataCasamento: currentUser.dataCasamento,
        telefone: currentUser.telefone
    };
}

// Exportar funções
window.Auth = {
    init: initAuth,
    login,
    logout,
    isLoggedIn,
    markInstrucoesLidas,
    markOrientacoesLidas,
    selectMusica,
    getUserSelecoes,
    hasCompletedAllSelecoes,
    getProgresso,
    getUserInfo,
    currentUser
};