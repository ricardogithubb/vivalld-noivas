const Auth = {
    currentUser: null,

    async init() {
        try {
            // Aguardar DB estar pronto
            if (!DB.isInitialized) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Check for existing session
            const session = await DB.get('session', 'currentUser');
            if (session) {
                this.currentUser = session;
            }
            return this.currentUser;
        } catch (error) {
            console.error('Error initializing auth:', error);
            return null;
        }
    },

    async login(email, password) {
        // Simple validation - in real app would validate against backend
        if (!email || !password) {
            throw new Error('Por favor, preencha todos os campos');
        }

        // Create user session
        const user = {
            email: email,
            loggedInAt: new Date().toISOString(),
            userId: 'user_' + Date.now()
        };

        await DB.set('session', 'currentUser', user);
        this.currentUser = user;
        
        return user;
    },

    async logout() {
        await DB.delete('session', 'currentUser');
        this.currentUser = null;
        
        // Stop any playing audio
        if (window.Repertorio && window.Repertorio.stopAllAudio) {
            window.Repertorio.stopAllAudio();
        }
    },

    async checkFirstTimeUser() {
        try {
            const term1 = await DB.get('terms', 'termo1Aceito');
            const term2 = await DB.get('terms', 'termo2Aceito');
            
            return {
                termo1Aceito: term1 || false,
                termo2Aceito: term2 || false,
                isFirstLogin: !term1 || !term2
            };
        } catch (error) {
            console.error('Error checking first time user:', error);
            return {
                termo1Aceito: false,
                termo2Aceito: false,
                isFirstLogin: true
            };
        }
    },

    async acceptTerm(termNumber) {
        await DB.set('terms', `termo${termNumber}Aceito`, true);
    },

    async resetTerms() {
        await DB.set('terms', 'termo1Aceito', false);
        await DB.set('terms', 'termo2Aceito', false);
    },

    async getNextScreen() {
        try {
            const terms = await this.checkFirstTimeUser();
            
            if (!terms.termo1Aceito) {
                return 'termo1';
            } else if (!terms.termo2Aceito) {
                return 'termo2';
            } else {
                // Check if there's saved progress
                const progress = await DB.get('wizardProgress', 'currentSection');
                if (progress !== undefined && progress !== null) {
                    return 'repertorio';
                }
                return 'repertorio';
            }
        } catch (error) {
            console.error('Error getting next screen:', error);
            return 'termo1'; // Default to first term on error
        }
    }
};

window.Auth = Auth;