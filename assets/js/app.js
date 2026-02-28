const App = {
    currentView: 'login',
    menuOffcanvas: null,

    async init() {
        // Initialize DB
        await DB.init();
        
        // Initialize Auth
        await Auth.init();
        
        // Initialize Repertorio
        await Repertorio.init();
        
        // Setup menu
        this.menuOffcanvas = new bootstrap.Offcanvas(document.getElementById('menuOffcanvas'));
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check authentication and navigate
        await this.checkAuthAndNavigate();
    },

    setupEventListeners() {
        // Back button
        $('#backButton').on('click', () => this.handleBack());

        // Next button
        $('#nextButton').on('click', () => this.handleNext());

        // Menu button
        $('#menuButton').on('click', () => this.menuOffcanvas.show());

        // Menu items
        $('.menu-item').on('click', (e) => {
            const action = $(e.currentTarget).data('action');
            this.menuOffcanvas.hide();
            
            if (action === 'logout') {
                this.logout();
            } else if (action === 'termos') {
                this.showTerms();
            } else {
                this.navigateTo(action);
            }
        });

        // Handle hash changes
        $(window).on('hashchange', () => this.handleRouting());
    },

    async checkAuthAndNavigate() {
        if (Auth.currentUser) {
            // User is logged in, check terms
            const nextScreen = await Auth.getNextScreen();
            window.location.hash = nextScreen;
        } else {
            window.location.hash = 'login';
        }
    },

    handleRouting() {
        const hash = window.location.hash.substring(1) || 'login';
        this.navigateTo(hash);
    },

    async navigateTo(view) {
        // Stop any playing audio
        if (Repertorio.stopAllAudio) {
            Repertorio.stopAllAudio();
        }

        this.currentView = view;
        
        // Update UI based on view
        await this.updateUI(view);
        
        // Load view content
        const content = await this.getViewContent(view);
        $('#mainContent').html(content);
        
        // Update page title
        this.updatePageTitle(view);
    },

    async updateUI(view) {
        // Hide/show header elements
        if (view === 'login') {
            $('#backButton').addClass('d-none');
            $('#menuButton').addClass('d-none');
            $('#footer').addClass('d-none');
            $('#progressContainer').addClass('d-none');
        } else {
            $('#menuButton').removeClass('d-none');
            
            // Show back button only if not on main views
            if (view === 'repertorio' || view === 'termo1' || view === 'termo2') {
                $('#backButton').removeClass('d-none');
            } else {
                $('#backButton').addClass('d-none');
            }
            
            // Show footer with next button only on repertorio and terms
            if (view === 'repertorio' || view === 'termo1' || view === 'termo2') {
                $('#footer').removeClass('d-none');
            } else {
                $('#footer').addClass('d-none');
            }
            
            // Show progress only on repertorio
            if (view === 'repertorio') {
                $('#progressContainer').removeClass('d-none');
                Repertorio.updateProgress();
            } else {
                $('#progressContainer').addClass('d-none');
            }
        }
    },

    updatePageTitle(view) {
        const titles = {
            'login': 'Bridal Harmony',
            'termo1': 'Instruções',
            'termo2': 'Orientações',
            'repertorio': 'Repertório',
            'contrato': 'Contrato',
            'boletos': 'Boletos',
            'resumo': 'Meu Repertório'
        };
        
        $('#pageTitle').text(titles[view] || 'Bridal Harmony');
    },

    async getViewContent(view) {
        switch(view) {
            case 'login':
                return this.renderLogin();
            case 'termo1':
                return this.renderTermo(1);
            case 'termo2':
                return this.renderTermo(2);
            case 'repertorio':
                return await Repertorio.renderSection(Repertorio.sections[Repertorio.currentSectionIndex]);
            case 'contrato':
                return this.renderContrato();
            case 'boletos':
                return await Boletos.render();
            case 'resumo':
                return await Repertorio.getSummary();
            default:
                return '<div class="text-center py-5">Página não encontrada</div>';
        }
    },

    renderLogin() {
        return `
            <div class="login-container">
                <div class="login-card fade-in">
                    <h1 class="login-title text-center">Bridal Harmony</h1>
                    <p class="login-subtitle text-center">Seu repertório de casamento</p>
                    
                    <form id="loginForm">
                        <div class="mb-3">
                            <label for="email" class="form-label">E-mail</label>
                            <input type="email" class="form-control" id="email" 
                                   placeholder="seu@email.com" required>
                        </div>
                        <div class="mb-4">
                            <label for="password" class="form-label">Senha</label>
                            <input type="password" class="form-control" id="password" 
                                   placeholder="********" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 next-btn">
                            Entrar
                        </button>
                    </form>
                    
                    <p class="text-center text-muted small mt-4">
                        Use qualquer e-mail/senha para teste
                    </p>
                </div>
            </div>
        `;
    },

    renderTermo(termNumber) {
        const terms = {
            1: {
                title: 'Instruções',
                content: `
                    <h4>Instruções para Escolha do Repertório</h4>
                    <p>1. Você pode selecionar até 2 músicas por seção.</p>
                    <p>2. Ouça as prévias antes de fazer sua escolha.</p>
                    <p>3. As músicas selecionadas serão usadas na cerimônia.</p>
                    <p>4. Após a confirmação, não será possível alterar as escolhas sem contatar a produção.</p>
                    <p>5. Certifique-se de que as letras estão de acordo com a liturgia.</p>
                    <p>6. Em caso de dúvidas, consulte o celebrante.</p>
                    <p>7. O prazo para escolha do repertório é de 30 dias antes da cerimônia.</p>
                    <p>8. Músicas não selecionadas até o prazo serão escolhidas pela produção.</p>
                    <p>9. É possível ouvir a prévia completa de cada música.</p>
                    <p>10. Ao navegar entre as seções, a música em reprodução será pausada.</p>
                `
            },
            2: {
                title: 'Orientações',
                content: `
                    <h4>Orientações Importantes</h4>
                    <p>1. Chegue com 2 horas de antecedência no local da cerimônia.</p>
                    <p>2. A entrada da noiva deve ser previamente combinada com o cerimonial.</p>
                    <p>3. O salmo será proclamado após a entrada da noiva.</p>
                    <p>4. Durante a comunhão, as músicas devem ser mais suaves e reflexivas.</p>
                    <p>5. A assinatura do contrato ocorrerá após a comunhão.</p>
                    <p>6. O fotógrafo precisará de 15 minutos para as fotos oficiais.</p>
                    <p>7. A saída do casal deve ser uma música alegre e festiva.</p>
                    <p>8. Os boletos devem ser pagos até as datas de vencimento.</p>
                    <p>9. O contrato deve ser lido atentamente antes da assinatura.</p>
                    <p>10. Qualquer dúvida, entre em contato com nossa equipe.</p>
                `
            }
        };

        return `
            <div class="section-card fade-in">
                <h2 class="section-title">${terms[termNumber].title}</h2>
                <div class="contract-content mb-4">
                    ${terms[termNumber].content}
                </div>
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="acceptTerm">
                    <label class="form-check-label" for="acceptTerm">
                        Li e concordo com as ${termNumber === 1 ? 'instruções' : 'orientações'}
                    </label>
                </div>
            </div>
        `;
    },

    renderContrato() {
        return `
            <div class="section-card fade-in">
                <h2 class="section-title">Contrato de Prestação de Serviços</h2>
                <div class="contract-content">
                    <h4>CONTRATO DE PRESTAÇÃO DE SERVIÇOS MUSICAIS PARA CASAMENTO</h4>
                    
                    <p><strong>CONTRATANTE:</strong> [Nome do(a) Noivo(a)]</p>
                    <p><strong>CONTRATADO:</strong> Bridal Harmony Produções Musicais</p>
                    
                    <h5>CLÁUSULA PRIMEIRA - DO OBJETO</h5>
                    <p>O presente contrato tem como objeto a prestação de serviços musicais para a cerimônia de casamento a ser realizada no dia [DATA], conforme repertório selecionado pela CONTRATANTE através da plataforma Bridal Harmony.</p>
                    
                    <h5>CLÁUSULA SEGUNDA - DO REPERTÓRIO</h5>
                    <p>2.1. A CONTRATANTE poderá selecionar até 2 (duas) músicas por seção, totalizando até 18 (dezoito) músicas para toda a cerimônia.</p>
                    <p>2.2. As músicas selecionadas deverão ser confirmadas com até 30 (trinta) dias de antecedência da data do evento.</p>
                    <p>2.3. Após a confirmação, não serão permitidas alterações no repertório, salvo mediante acordo entre as partes e possível custo adicional.</p>
                    
                    <h5>CLÁUSULA TERCEIRA - DO VALOR E FORMA DE PAGAMENTO</h5>
                    <p>3.1. O valor total dos serviços é de R$ 5.000,00 (cinco mil reais).</p>
                    <p>3.2. O pagamento será realizado da seguinte forma:</p>
                    <ul>
                        <li>30% no ato da assinatura do contrato (R$ 1.500,00)</li>
                        <li>30% até 30 dias antes do evento (R$ 1.500,00)</li>
                        <li>40% até 7 dias antes do evento (R$ 2.000,00)</li>
                    </ul>
                    
                    <h5>CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATADO</h5>
                    <p>4.1. Disponibilizar músicos qualificados para a execução do repertório selecionado.</p>
                    <p>4.2. Comparecer ao local da cerimônia com 2 (duas) horas de antecedência.</p>
                    <p>4.3. Disponibilizar equipamento de som de qualidade adequada ao espaço.</p>
                    
                    <h5>CLÁUSULA QUINTA - DAS OBRIGAÇÕES DA CONTRATANTE</h5>
                    <p>5.1. Fornecer todas as informações necessárias sobre a cerimônia.</p>
                    <p>5.2. Efetuar os pagamentos nas datas estipuladas.</p>
                    <p>5.3. Disponibilizar local adequado para a apresentação dos músicos.</p>
                    
                    <h5>CLÁUSULA SEXTA - DO CANCELAMENTO</h5>
                    <p>6.1. Em caso de cancelamento por parte da CONTRATANTE com mais de 60 dias de antecedência, será devolvido 50% do valor pago.</p>
                    <p>6.2. Em caso de cancelamento com menos de 60 dias de antecedência, não haverá devolução dos valores pagos.</p>
                    
                    <p class="mt-4 text-center">Por estarem assim justos e contratados, firmam o presente instrumento.</p>
                    
                    <p class="mt-5">[CIDADE], [DATA]</p>
                    
                    <div class="row mt-5">
                        <div class="col-6 text-center">
                            <p>___________________________</p>
                            <p>CONTRATANTE</p>
                        </div>
                        <div class="col-6 text-center">
                            <p>___________________________</p>
                            <p>Bridal Harmony</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async handleBack() {
        switch(this.currentView) {
            case 'termo1':
                window.location.hash = 'login';
                break;
            case 'termo2':
                window.location.hash = 'termo1';
                break;
            case 'repertorio':
                const prevSection = await Repertorio.previousSection();
                if (prevSection) {
                    await this.navigateTo('repertorio');
                } else {
                    window.location.hash = 'termo2';
                }
                break;
            default:
                window.history.back();
        }
    },

    async handleNext() {
        switch(this.currentView) {
            case 'termo1':
                if ($('#acceptTerm').is(':checked')) {
                    await Auth.acceptTerm(1);
                    window.location.hash = 'termo2';
                }
                break;
                
            case 'termo2':
                if ($('#acceptTerm').is(':checked')) {
                    await Auth.acceptTerm(2);
                    window.location.hash = 'repertorio';
                }
                break;
                
            case 'repertorio':
                const next = await Repertorio.nextSection();
                if (next === 'resumo') {
                    window.location.hash = 'resumo';
                } else {
                    await this.navigateTo('repertorio');
                }
                break;
        }
    },

    async logout() {
        await Auth.logout();
        window.location.hash = 'login';
    },

    async showTerms() {
        await Auth.resetTerms();
        window.location.hash = 'termo1';
    }
};

// Initialize app when document is ready
$(document).ready(() => {
    App.init();
    
    // Handle login form submission
    $(document).on('submit', '#loginForm', async (e) => {
        e.preventDefault();
        
        const email = $('#email').val();
        const password = $('#password').val();
        
        try {
            await Auth.login(email, password);
            const nextScreen = await Auth.getNextScreen();
            window.location.hash = nextScreen;
        } catch (error) {
            alert(error.message);
        }
    });
    
    // Handle term acceptance checkbox change
    $(document).on('change', '#acceptTerm', function() {
        $('#nextButton').prop('disabled', !$(this).is(':checked'));
    });
});