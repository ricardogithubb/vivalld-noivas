// ui.js - Gerenciamento da interface do usuário

// Cache de templates
const templateCache = {};

// Carregar template HTML
async function loadTemplate(templateName) {
    // Verificar cache
    if (templateCache[templateName]) {
        return templateCache[templateName];
    }
    
    try {
        const response = await fetch(`pages/${templateName}.html`);
        const html = await response.text();
        templateCache[templateName] = html;
        return html;
    } catch (error) {
        console.error(`Erro ao carregar template ${templateName}:`, error);
        return `<div class="alert alert-danger">Erro ao carregar conteúdo</div>`;
    }
}

// Mostrar seção específica
async function showSection(section) {
    let content = '';
    let templateName = section;
    
    // Verificar se precisa mostrar instruções ou orientações primeiro
    if (section === 'repertorio') {
        if (!Auth.currentUser.instrucoesLidas) {
            templateName = 'instrucoes';
        } else if (!Auth.currentUser.orientacoesLidas) {
            templateName = 'orientacoes';
        }
    }
    
    // Carregar template
    content = await loadTemplate(templateName);
    
    // Substituir placeholders
    content = replacePlaceholders(content);
    
    $('#contentArea').html(content);
    
    // Inicializar componentes da página
    initPageComponents(templateName);
}

// Substituir placeholders no template
function replacePlaceholders(content) {
    const userInfo = Auth.getUserInfo();
    const selecoes = Auth.getUserSelecoes();
    const progresso = Auth.getProgresso();
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
return content
  .replace(/\{\{nome_usuario\}\}/g, userInfo.nome || 'Noiva')
  .replace(/\{\{email_usuario\}\}/g, userInfo.email || '')
  .replace(/\{\{progresso\}\}/g, Math.round(progresso))
  .replace(/\{\{data_atual\}\}/g, dataAtual)
  .replace(/\{\{instrucoes_lidas\}\}/g, Auth.currentUser.instrucoesLidas ? 'checked' : '')
  .replace(/\{\{orientacoes_lidas\}\}/g, Auth.currentUser.orientacoesLidas ? 'checked' : '')
  .replace(/\{\{#if instrucoes_lidas\}\}disabled\{\{\/if\}\}/g, Auth.currentUser.instrucoesLidas ? 'disabled' : '')
  .replace(/\{\{#if orientacoes_lidas\}\}disabled\{\{\/if\}\}/g, Auth.currentUser.orientacoesLidas ? 'disabled' : '');
}

// Inicializar componentes da página
function initPageComponents(pageName) {
    switch(pageName) {
        case 'instrucoes':
            // Já configurado via eventos globais
            break;
        case 'orientacoes':
            // Já configurado via eventos globais
            break;
        case 'repertorio':
            carregarSecoesRepertorio();
            break;
        case 'contrato':
            // Não há funcionalidades específicas
            break;
        case 'boletos':
            carregarBoletos();
            break;
        case 'repertorio-final':
            carregarRepertorioFinal();
            break;
    }
}

// Carregar seções do repertório
function carregarSecoesRepertorio() {
    const secoes = [
        { id: 'entradaNoivo', titulo: '🤵 Entrada do Noivo', icon: 'bi-person' },
        { id: 'entradaDamas', titulo: '👗 Entrada das Damas', icon: 'bi-people' },
        { id: 'entradaNoiva', titulo: '👰 Entrada da Noiva', icon: 'bi-gem' },
        { id: 'salmo', titulo: '📖 Salmo', icon: 'bi-book' },
        { id: 'aclamacao', titulo: '🎶 Aclamação', icon: 'bi-music-note' },
        { id: 'comunhao', titulo: '🍞 Comunhão', icon: 'bi-cup' },
        { id: 'assinatura', titulo: '📝 Assinatura e Fotos', icon: 'bi-pen' },
        { id: 'saida', titulo: '🎉 Saída do Casal', icon: 'bi-balloon' }
    ];
    
    let html = '';
    secoes.forEach((secao, index) => {
        html += gerarSecaoMusica(secao, index === 0);
    });
    
    $('#repertorioSecoes').html(html);
    
    // Atualizar progresso
    atualizarProgresso();
}

// Gerar seção de música
function gerarSecaoMusica(secao, isFirst) {
    const musicas = Musicas.getByCategoria(secao.id);
    const selecionadas = Auth.currentUser.selecoes[secao.id] || [];
    
    let html = `
        <div class="secao-musica mb-5 animate__animated animate__fadeIn" id="secao-${secao.id}" style="${!isFirst ? 'display: none;' : ''}">
            <h4 class="section-title">
                <i class="bi ${secao.icon} me-2"></i>${secao.titulo}
            </h4>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <p class="text-muted mb-0">
                    <i class="bi bi-info-circle"></i> Selecione até 2 músicas
                </p>
                <span class="badge bg-primary-custom">${selecionadas.length}/2 selecionadas</span>
            </div>
            
            <div class="row">
    `;
    
    musicas.forEach(musica => {
        const selecionada = selecionadas.includes(musica.id);
        const disabled = !selecionada && selecionadas.length >= 2;
        
        html += `
            <div class="col-md-6">
                <div class="music-card ${selecionada ? 'selected' : ''} ${disabled ? 'disabled' : ''}" 
                     onclick="selectMusicaUI(${musica.id}, '${secao.id}', this)">
                    <div class="d-flex align-items-center">
                        <button class="play-btn me-3" onclick="event.stopPropagation(); tocarMusicaPreview('${musica.url}')">
                            <i class="bi bi-play-fill"></i>
                        </button>
                        <div class="flex-grow-1">
                            <h5 class="mb-1">${musica.nome}</h5>
                            <small class="text-muted">
                                <i class="bi bi-person"></i> ${musica.artista} • 
                                <i class="bi bi-clock"></i> ${musica.duracao} • 
                                <i class="bi bi-tag"></i> ${musica.estilo}
                            </small>
                        </div>
                        ${selecionada ? '<i class="bi bi-check-circle-fill ms-auto" style="color: var(--primary-color); font-size: 1.3rem;"></i>' : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-4">
                ${isFirst ? '<div></div>' : `<button class="btn btn-outline-primary" onclick="secaoAnterior('${secao.id}')">
                    <i class="bi bi-arrow-left me-2"></i>Anterior
                </button>`}
                
                <button class="btn btn-primary" onclick="proximaSecao('${secao.id}')" ${selecionadas.length !== 2 ? 'disabled' : ''}>
                    ${secao.id === 'saida' ? 'Finalizar' : 'Próximo'} 
                    <i class="bi bi-arrow-right ms-2"></i>
                </button>
            </div>
        </div>
    `;
    
    return html;
}

// Função global para selecionar música na UI
window.selectMusicaUI = async function(id, categoria, elemento) {
    const result = await Auth.selectMusica(categoria, id);
    
    if (result.success) {
        $(elemento).toggleClass('selected');
        
        // Atualizar contador
        const selecionadas = Auth.currentUser.selecoes[categoria] || [];
        $(`#secao-${categoria} .badge`).text(`${selecionadas.length}/2 selecionadas`);
        
        // Habilitar/desabilitar botão próximo
        if (selecionadas.length === 2) {
            $(`#secao-${categoria} .btn-primary`).prop('disabled', false);
        } else {
            $(`#secao-${categoria} .btn-primary`).prop('disabled', true);
        }
        
        // Atualizar progresso
        atualizarProgresso();
        
        // Desabilitar cards não selecionados se atingiu o limite
        if (selecionadas.length === 2) {
            $(`#secao-${categoria} .music-card:not(.selected)`).addClass('disabled');
        } else {
            $(`#secao-${categoria} .music-card:not(.selected)`).removeClass('disabled');
        }
        
        // Feedback visual
        if (result.selecionadas === 2) {
            showToast(`Ótima escolha! Você selecionou 2 músicas para esta categoria.`);
        }
    } else {
        showToast(result.message, 'warning');
    }
};

// Função para seção anterior
window.secaoAnterior = function(categoriaAtual) {
    const secoes = ['entradaNoivo', 'entradaDamas', 'entradaNoiva', 'salmo', 'aclamacao', 'comunhao', 'assinatura', 'saida'];
    const indexAtual = secoes.indexOf(categoriaAtual);
    
    if (indexAtual > 0) {
        const secaoAnterior = secoes[indexAtual - 1];
        $(`#secao-${categoriaAtual}`).hide();
        $(`#secao-${secaoAnterior}`).show();
        
        // Rolar para o topo
        $('html, body').animate({
            scrollTop: $(`#secao-${secaoAnterior}`).offset().top - 100
        }, 500);
    }
};

// Função global para próxima seção
window.proximaSecao = function(categoriaAtual) {
    const secoes = ['entradaNoivo', 'entradaDamas', 'entradaNoiva', 'salmo', 'aclamacao', 'comunhao', 'assinatura', 'saida'];
    const indexAtual = secoes.indexOf(categoriaAtual);
    
    if (indexAtual < secoes.length - 1) {
        const proximaSecao = secoes[indexAtual + 1];
        $(`#secao-${categoriaAtual}`).hide();
        $(`#secao-${proximaSecao}`).show();
        
        // Rolar para o topo
        $('html, body').animate({
            scrollTop: $(`#secao-${proximaSecao}`).offset().top - 100
        }, 500);
    } else {
        // Todas as seções concluídas
        showSuccess('🎉 Parabéns! Você concluiu a seleção do repertório!');
        showSection('repertorioFinal');
    }
};

// Atualizar barra de progresso
function atualizarProgresso() {
    const progresso = Auth.getProgresso();
    $('#progressoRepertorio').css('width', progresso + '%').text(Math.round(progresso) + '%');
}

// Tocar preview da música
window.tocarMusicaPreview = function(musicaUrl) {
    // const musica = Musicas.getById(musicaId);
   // if (musica) {
        // Simular preview (em produção, usar arquivo de áudio real)
        const audio = document.getElementById('audioPlayer');
        
        // Criar URL de preview baseada no ID (simulação)
        audio.src = `/${musicaUrl}`;
        
        audio.play().catch(error => {
            console.log("Preview não disponível - modo demonstração");
            
            // Mostrar modal com informações da música
            showMusicInfo(musica);
        });
   // }
};

// Mostrar informações da música
function showMusicInfo(musica) {
    const modalHtml = `
        <div class="modal fade" id="musicModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${musica.nome}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Artista:</strong> ${musica.artista}</p>
                        <p><strong>Duração:</strong> ${musica.duracao}</p>
                        <p><strong>Estilo:</strong> ${musica.estilo}</p>
                        <p><strong>Letra:</strong> ${musica.letra}</p>
                        <hr>
                        <p class="text-muted">Preview não disponível no momento. Esta é uma simulação.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal anterior se existir
    $('#musicModal').remove();
    
    // Adicionar novo modal
    $('body').append(modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('musicModal'));
    modal.show();
}

// Carregar boletos
async function carregarBoletos() {
    try {
        const boletos = await DB.loadBoletos(Auth.currentUser.email);
        renderBoletos(boletos);
    } catch (error) {
        console.error("Erro ao carregar boletos:", error);
        renderBoletos([]);
    }
}

// Renderizar tabela de boletos
function renderBoletos(boletos) {
    let html = '';
    
    if (boletos.length === 0) {
        // Dados de exemplo
        boletos = [
            {
                id: 1,
                descricao: "Entrada (30%)",
                vencimento: "15/03/2024",
                valor: "R$ 1.050,00",
                status: "paid",
                dataPagamento: "15/01/2024"
            },
            {
                id: 2,
                descricao: "2ª Parcela",
                vencimento: "15/06/2024",
                valor: "R$ 1.050,00",
                status: "pending",
                dataPagamento: "-"
            },
            {
                id: 3,
                descricao: "3ª Parcela",
                vencimento: "15/07/2024",
                valor: "R$ 1.400,00",
                status: "pending",
                dataPagamento: "-"
            }
        ];
    }
    
    boletos.forEach(boleto => {
        const statusClass = boleto.status === 'paid' ? 'status-paid' : 
                           boleto.status === 'pending' ? 'status-pending' : 'status-overdue';
        
        const statusText = boleto.status === 'paid' ? 'Pago' :
                          boleto.status === 'pending' ? 'Pendente' : 'Vencido';
        
        html += `
            <tr>
                <td>${boleto.descricao}</td>
                <td>${boleto.vencimento}</td>
                <td><strong>${boleto.valor}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${boleto.dataPagamento || '-'}</td>
                <td>
                    ${boleto.status !== 'paid' ? 
                        `<button class="btn btn-sm btn-primary" onclick="simularDownloadBoleto(${boleto.id})">
                            <i class="bi bi-download"></i> Baixar
                        </button>` : 
                        `<button class="btn btn-sm btn-outline-success" disabled>
                            <i class="bi bi-check-circle"></i> Pago
                        </button>`
                    }
                </td>
            </tr>
        `;
    });
    
    $('#boletosTable').html(html);
}

// Simular download de boleto
window.simularDownloadBoleto = function(id) {
    showToast(`Boleto #${id} - Em desenvolvimento. Esta é uma simulação.`, 'info');
};

// Carregar repertório final
function carregarRepertorioFinal() {
    const selecoes = Auth.getUserSelecoes();
    const musicasSelecionadas = Musicas.getSelecionadas(selecoes);
    
    let html = '';
    
    const categorias = [
        { id: 'entradaNoivo', titulo: '🤵 Entrada do Noivo', icon: 'bi-person' },
        { id: 'entradaDamas', titulo: '👗 Entrada das Damas', icon: 'bi-people' },
        { id: 'entradaNoiva', titulo: '👰 Entrada da Noiva', icon: 'bi-gem' },
        { id: 'salmo', titulo: '📖 Salmo', icon: 'bi-book' },
        { id: 'aclamacao', titulo: '🎶 Aclamação', icon: 'bi-music-note' },
        { id: 'comunhao', titulo: '🍞 Comunhão', icon: 'bi-cup' },
        { id: 'assinatura', titulo: '📝 Assinatura e Fotos', icon: 'bi-pen' },
        { id: 'saida', titulo: '🎉 Saída do Casal', icon: 'bi-balloon' }
    ];
    
    categorias.forEach(categoria => {
        const musicas = musicasSelecionadas[categoria.id] || [];
        
        html += `
            <div class="card bg-transparent border-primary-custom mb-3">
                <div class="card-body">
                    <h5 class="card-title">
                        <i class="bi ${categoria.icon} me-2" style="color: var(--primary-color);"></i>
                        ${categoria.titulo}
                    </h5>
                    ${musicas.length > 0 ? 
                        musicas.map(m => `
                            <div class="d-flex align-items-center mb-2 p-2 bg-transparent rounded">
                                <i class="bi bi-music-note me-3" style="color: var(--primary-color);"></i>
                                <div>
                                    <strong>${m.nome}</strong>
                                    <br>
                                    <small class="text-muted">
                                        ${m.artista} • ${m.duracao} • ${m.estilo}
                                    </small>
                                </div>
                                <button class="btn btn-sm btn-outline-primary ms-auto" onclick="tocarMusicaPreview(${m.id})">
                                    <i class="bi bi-play-circle"></i>
                                </button>
                            </div>
                        `).join('') 
                        : '<p class="text-muted"><i class="bi bi-exclamation-circle"></i> Nenhuma música selecionada</p>'
                    }
                </div>
            </div>
        `;
    });
    
    $('#repertorioFinalContent').html(html);
}

// Mostrar toast notification
function showToast(message, type = 'success') {
    const toastHtml = `
        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1100">
            <div class="toast align-items-center text-white bg-${type} border-0 animate__animated animate__fadeInUp" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `;
    
    // Remover toasts anteriores
    $('.position-fixed.bottom-0').remove();
    
    // Adicionar novo toast
    $('body').append(toastHtml);
    
    // Mostrar toast
    const toast = new bootstrap.Toast($('.toast'));
    toast.show();
    
    // Remover após 3 segundos
    setTimeout(() => {
        $('.position-fixed.bottom-0').remove();
    }, 3000);
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'danger');
}

// Exportar funções
window.UI = {
    showSection,
    showSuccess,
    showError,
    showToast
};