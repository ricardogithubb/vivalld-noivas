// theme.js - Gerenciamento de temas (claro/escuro e favorito)

const Theme = {
    // Estado atual
    currentTheme: 'light',
    isFavorite: false,
    
    // Inicializar tema
    init: function() {
        // Carregar preferências salvas
        const savedTheme = localStorage.getItem('vivalld_theme');
        const savedFavorite = localStorage.getItem('vivalld_favorite');
        
        if (savedFavorite === 'true') {
            this.isFavorite = true;
            this.currentTheme = savedTheme || 'light';
            this.applyFavorite(true);
        } else {
            this.currentTheme = savedTheme || 'light';
            document.documentElement.setAttribute('data-theme', this.currentTheme);
        }
        
        this.updateIcons();
    },
    
    // Alternar entre claro/escuro
    toggle: function() {
        if (this.isFavorite) {
            // Se estiver no modo favorito, alterna entre favorite-light e favorite-dark
            this.currentTheme = this.currentTheme === 'favorite-light' ? 'favorite-dark' : 'favorite-light';
        } else {
            // Modo normal
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        }
        
        this.applyTheme();
        this.savePreferences();
        this.updateIcons();
    },
    
    // Alternar favorito
    toggleFavorite: function() {
        this.isFavorite = !this.isFavorite;
        
        if (this.isFavorite) {
            this.applyFavorite();
        } else {
            // Voltar ao tema normal (manter claro/escuro atual)
            this.currentTheme = this.currentTheme.includes('favorite') 
                ? this.currentTheme.replace('favorite-', '') 
                : this.currentTheme;
            this.applyTheme();
        }
        
        this.savePreferences();
        this.updateIcons();
    },
    
    // Aplicar tema favorito
    applyFavorite: function(initial = false) {
        const baseTheme = this.currentTheme.includes('favorite') 
            ? this.currentTheme.split('-')[1] 
            : this.currentTheme;
        
        this.currentTheme = `favorite-${baseTheme}`;
        this.applyTheme();
    },
    
    // Aplicar tema atual
    applyTheme: function() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Disparar evento para outros componentes
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: this.currentTheme, isFavorite: this.isFavorite }
        }));
    },
    
    // Salvar preferências
    savePreferences: function() {
        localStorage.setItem('vivalld_theme', this.currentTheme);
        localStorage.setItem('vivalld_favorite', this.isFavorite);
    },
    
    // Atualizar ícones
    updateIcons: function() {
        // Ícone do tema
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            if (this.currentTheme.includes('dark')) {
                themeIcon.className = 'bi bi-moon-fill';
            } else {
                themeIcon.className = 'bi bi-sun-fill';
            }
        }
        
        // Ícone do favorito
        const favoriteIcon = document.getElementById('favoriteIcon');
        if (favoriteIcon) {
            favoriteIcon.className = this.isFavorite ? 'bi bi-star-fill' : 'bi bi-star';
        }
    },
    
    // Obter cor primária atual
    getPrimaryColor: function() {
        return getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-color').trim();
    }
};

// Inicializar tema quando o documento carregar
document.addEventListener('DOMContentLoaded', () => Theme.init());