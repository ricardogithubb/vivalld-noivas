// app.js - Arquivo principal da aplicação

// Inicializar aplicação
$(document).ready(async function() {
    console.log("Inicializando Vivalld...");
    
    // Mostrar loading
    showLoading();
    
    try {
        // Inicializar banco de dados
        await DB.init();
        
        // Criar usuário de teste se não existir
        await DB.createTestUser();
        
        // Inicializar autenticação
        await Auth.init();
        
        // Configurar eventos
        setupEventListeners();
        
        // Verificar se usuário já está logado
        if (Auth.isLoggedIn()) {
            $('#loginScreen').hide();
            $('#mainScreen').show();
            await showSection('repertorio');
        } else {
            $('#loginScreen').show();
            $('#mainScreen').hide();
        }
        
        // Atualizar nome do usuário nos templates
        updateUserName();
        
        console.log("Vivalld inicializado com sucesso!");
        
    } catch (error) {
        console.error("Erro ao inicializar aplicação:", error);
        showError("Erro ao carregar aplicação. Tente novamente.");
    }
});

// Configurar event listeners
function setupEventListeners() {
    // Login form
    $('#loginForm').on('submit', handleLogin);
    
    // Logout (links com onclick já estão configurados)
    
    // Eventos de checkbox
    $(document).on('change', '#concordoInstrucoes', function() {
        $('#btnProximoInstrucoes').prop('disabled', !$(this).is(':checked'));
    });
    
    $(document).on('change', '#concordoOrientacoes', function() {
        $('#btnProximoOrientacoes').prop('disabled', !$(this).is(':checked'));
    });
    
    // Botões próximos
    $(document).on('click', '#btnProximoInstrucoes', async function() {
        if ($('#concordoInstrucoes').is(':checked')) {
            await Auth.markInstrucoesLidas();
            await showSection('repertorio');
        }
    });
    
    $(document).on('click', '#btnProximoOrientacoes', async function() {
        if ($('#concordoOrientacoes').is(':checked')) {
            await Auth.markOrientacoesLidas();
            await showSection('repertorio');
        }
    });
}

// Handler de login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = $('#email').val();
    const password = $('#password').val();
    
    showLoading();
    
    try {
        const result = await Auth.login(email, password);
        
        if (result.success) {
            $('#loginScreen').hide();
            $('#mainScreen').show();
            await showSection('repertorio');
            showSuccess("Login realizado com sucesso! Bem-vinda ao Vivalld.");
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error("Erro no login:", error);
        showError("Erro ao fazer login. Tente novamente.");
    }
}

// Handler de logout
function logout() {
    Auth.logout();
    showSuccess("Logout realizado com sucesso! Até breve.");
}

// Mostrar seção
async function showSection(section) {
    showLoading();
    
    try {
        await UI.showSection(section);
    } catch (error) {
        console.error("Erro ao mostrar seção:", error);
        showError("Erro ao carregar página. Tente novamente.");
    }
}

// Atualizar nome do usuário nos templates
function updateUserName() {
    const userInfo = Auth.getUserInfo();
    // if (userInfo.nome) {
    //     $('.navbar-brand').after(`<span class="ms-2 text-muted">Olá, ${userInfo.nome}</span>`);
    // }
}

// Mostrar loading
function showLoading() {
    $('#contentArea').html(`
        <div class="text-center py-5">
            <div class="spinner"></div>
            <p class="mt-3">Carregando...</p>
        </div>
    `);
}

// Mostrar sucesso
function showSuccess(message) {
    const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show animate__animated animate__fadeIn" role="alert">
            <i class="bi bi-check-circle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('#contentArea').prepend(alertHtml);
    
    // Auto-fechar após 3 segundos
    setTimeout(() => {
        $('.alert').alert('close');
    }, 3000);
}

// Mostrar erro
function showError(message) {
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show animate__animated animate__fadeIn" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('#contentArea').prepend(alertHtml);
}

// Exportar funções globais
window.showSection = showSection;
window.logout = logout;