const Boletos = {
    currentFilter: 'todos',

    async render() {
        let bills = await DB.getAll('bills');
        
        // Apply filter
        if (this.currentFilter !== 'todos') {
            bills = bills.filter(bill => bill.status === this.currentFilter);
        }

        // Sort by due date
        bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        let html = `
            <div class="section-card fade-in">
                <h2 class="section-title">Boletos</h2>
                
                <div class="filter-buttons">
                    <button class="filter-btn ${this.currentFilter === 'todos' ? 'active' : ''}" 
                            onclick="Boletos.setFilter('todos')">Todos</button>
                    <button class="filter-btn ${this.currentFilter === 'pendente' ? 'active' : ''}" 
                            onclick="Boletos.setFilter('pendente')">Pendentes</button>
                    <button class="filter-btn ${this.currentFilter === 'pago' ? 'active' : ''}" 
                            onclick="Boletos.setFilter('pago')">Pagos</button>
                    <button class="filter-btn ${this.currentFilter === 'vencido' ? 'active' : ''}" 
                            onclick="Boletos.setFilter('vencido')">Vencidos</button>
                </div>
                
                <div class="bills-list">
        `;

        if (bills.length === 0) {
            html += '<p class="text-muted text-center py-4">Nenhum boleto encontrado</p>';
        } else {
            bills.forEach(bill => {
                const dueDate = new Date(bill.dueDate).toLocaleDateString('pt-BR');
                const isVencido = bill.status === 'pendente' && new Date(bill.dueDate) < new Date();
                
                // Update status if vencido
                if (isVencido && bill.status !== 'vencido') {
                    bill.status = 'vencido';
                }
                
                html += `
                    <div class="boleto-card">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h3 class="h6 mb-1">${bill.description}</h3>
                                <div class="small text-muted">Vencimento: ${dueDate}</div>
                            </div>
                            <span class="boleto-status status-${bill.status}">
                                ${bill.status === 'pago' ? 'Pago' : 
                                  bill.status === 'pendente' ? 'Pendente' : 'Vencido'}
                            </span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold" style="color: var(--secondary-color);">${bill.amount}</span>
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="Boletos.viewBoleto('${bill.id}')">
                                <i class="bi bi-eye"></i> Ver Boleto
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div></div>';
        
        return html;
    },

    setFilter(filter) {
        this.currentFilter = filter;
        App.navigateTo('boletos');
    },

    viewBoleto(billId) {
        // In a real app, this would show the boleto details or PDF
        Repertorio.showToast('Funcionalidade de visualização de boleto será implementada em breve');
    }
};

window.Boletos = Boletos;