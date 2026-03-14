const API_BASE = 'https://vivalld.com.br/api/api';

const Auth = {
    currentUser: null,
    token: null,

    async init() {
        this.token = localStorage.getItem('auth_token');
        this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        
        if(this.token && this.currentUser) {
            try {
                await this.validateToken();
            } catch(e) {
                await this.logout();
            }
        }
        
        return this.currentUser;
    },

    async validateToken() {
        const response = await fetch(`${API_BASE}/check-auth`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if(!result.success) {
            throw new Error('Token inválido');
        }
        
        return result;
    },

    async login(email, password) {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if(!result.success) {
            throw new Error(result.message);
        }

        this.currentUser = result.data.user;
        this.token = result.data.token;
        this.type  = result.data.type;
        
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        
        return result.data;
    },

    async logout() {
        if(this.token) {
            try {
                await fetch(`${API_BASE}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/json'
                    }
                });
            } catch(e) {
                console.error('Erro no logout:', e);
            }
        }
        
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    },

    async getNextScreen() {
        if(!this.currentUser || !this.token) {
            return 'login';
        }

        if(this.type == 'admin'){
            return 'admin';
        }

        try {
            const response = await fetch(`${API_BASE}/terms`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if(!result.success) {
                return 'login';
            }

            const terms = result.data;

            if(!terms.termo1Aceito) {
                return 'termo1';
            } else if(!terms.termo2Aceito) {
                return 'termo2';
            } else {
                return 'repertorio';
            }
        } catch(error) {
            console.error('Error getting next screen:', error);
            return 'login';
        }
    },

    async acceptTerm(termNumber) {
        const termType = `termo${termNumber}`;
        
        const response = await fetch(`${API_BASE}/terms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({ termType })
        });

        const result = await response.json();
        
        if(!result.success) {
            throw new Error(result.message);
        }
    },

    async checkFirstTimeUser() {
        const response = await fetch(`${API_BASE}/terms`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json'
            }
        });

        const result = await response.json();
        
        if(!result.success) {
            throw new Error(result.message);
        }

        return result.data;
    }
};

window.Auth = Auth;