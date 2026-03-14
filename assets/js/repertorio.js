const Repertorio = {
    sections: [
        'Entrada do Noivo',
        'Entrada das Damas',
        'Entrada da Noiva',
        'Salmo',
        'Aclamação',
        'Comunhão',
        'Assinatura',
        'Fotos',
        'Saída do Casal'
    ],
    
    currentSectionIndex: 0,
    currentAudio: null,
    currentPlayingId: null,
    selections: {},

    async init() {
        try {
            // Verificar se está autenticado
            if (!Auth.token) {
                return;
            }

            // Load saved selections from API
            await this.loadSelections();
            
            // Load saved progress from API
            await this.loadProgress();

            // Setup audio event listeners
            this.setupAudioListeners();
        } catch (error) {
            console.error('Error initializing repertorio:', error);
            this.selections = {};
            this.currentSectionIndex = 0;
        }
    },

    async loadSelections() {
        try {
            const response = await fetch(`${API_BASE}/selections`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.selections = result.data || {};
            }
        } catch (error) {
            console.error('Error loading selections:', error);
            this.selections = {};
        }
    },

    async loadProgress() {
        try {
            const response = await fetch(`${API_BASE}/progress`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success && result.data.currentSection !== undefined) {
                this.currentSectionIndex = result.data.currentSection;
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    },

    setupAudioListeners() {
        $(document).on('click', '.play-btn', (e) => {
            e.stopPropagation();
            const songId = $(e.currentTarget).data('song-id');
            this.togglePlay(songId);
        });

        $(document).on('click', '.music-card', (e) => {
            if (!$(e.target).closest('.play-btn').length) {
                const songId = $(e.currentTarget).data('song-id');
                this.toggleSelection(songId);
            }
        });

        $(document).on('input', '.progress-slider', (e) => {
            const songId = $(e.currentTarget).data('song-id');
            const value = $(e.target).val();
            if (this.currentPlayingId === songId && this.currentAudio) {
                this.currentAudio.currentTime = value;
            }
        });
    },

    async renderSection(sectionName) {
        try {
            // Buscar músicas da API
            const response = await fetch(`${API_BASE}/songs?section=${encodeURIComponent(sectionName)}`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            const songs = result.success ? result.data : [];
            
            const sectionSelections = this.selections[sectionName] || [];
            
            let html = `
                <div class="section-card fade-in">
                    <h2 class="section-title">${sectionName}</h2>
                    <div class="selection-counter">
                        Selecionadas: <span id="counter-${sectionName.replace(/\s/g, '')}">${sectionSelections.length}</span>/2
                    </div>
                    <div class="songs-list">
            `;

            songs.forEach(song => {
                const isSelected = sectionSelections.includes(song.song_id);
                const isPlaying = this.currentPlayingId === song.song_id;
                
                html += this.renderSongCard(song, isSelected, isPlaying);
            });

            html += '</div></div>';
            
            // Update progress
            this.updateProgress();
            
            return html;
        } catch (error) {
            console.error('Error rendering section:', error);
            return '<div class="alert alert-danger">Erro ao carregar músicas</div>';
        }
    },

    renderSongCard(song, isSelected, isPlaying) {
        const minutes = Math.floor(song.duration / 60);
        const seconds = song.duration % 60;
        const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return `
            <div class="music-card ${isSelected ? 'selected' : ''} ${isPlaying ? 'playing' : ''}" 
                 data-song-id="${song.song_id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="music-title">${song.title}</div>
                        <div class="music-artist">${song.artist || 'Artista não informado'}</div>
                    </div>
                    <button class="btn play-btn ${isPlaying ? 'playing' : ''}" data-song-id="${song.song_id}">
                        <i class="bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}"></i>
                    </button>
                </div>
                
                ${isPlaying ? `
                    <div class="player-container">
                        <div class="player-progress">
                            <span class="current-time" id="current-${song.song_id}">0:00</span>
                            <input type="range" class="progress-slider" 
                                   data-song-id="${song.song_id}" 
                                   min="0" max="${song.duration}" value="0" 
                                   step="1">
                            <span class="total-time">${durationFormatted}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async toggleSelection(songId) {
        // Buscar música para obter a seção
        const song = await this.getSongById(songId);
        if (!song) return;
        
        const section = song.section;
        
        if (!this.selections[section]) {
            this.selections[section] = [];
        }

        const index = this.selections[section].indexOf(songId);
        let success = false;
        
        if (index === -1) {
            // Add selection
            if (this.selections[section].length >= 2) {
                this.showToast('Você já selecionou o máximo de 2 músicas para esta seção');
                return;
            }
            
            // Chamar API para adicionar
            success = await this.addSelectionToAPI(songId, section);
            if (success) {
                this.selections[section].push(songId);
            }
        } else {
            // Remove selection - chamar API para remover
            success = await this.removeSelectionFromAPI(songId);
            if (success) {
                this.selections[section].splice(index, 1);
                
                // Se a seção ficou vazia, remover a propriedade
                if (this.selections[section].length === 0) {
                    delete this.selections[section];
                }
            }
        }

        if (success) {
            // Update counter
            $(`#counter-${section.replace(/\s/g, '')}`).text(this.selections[section]?.length || 0);
            
            // Update card style
            const card = $(`.music-card[data-song-id="${songId}"]`);
            if (index === -1) {
                card.addClass('selected');
            } else {
                card.removeClass('selected');
            }

            // Update next button state
            this.updateNextButton();
        }
    },

    async addSelectionToAPI(songId, section) {
        try {
            const response = await fetch(`${API_BASE}/selections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ songId, section })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error adding selection:', error);
            this.showToast('Erro ao adicionar música');
            return false;
        }
    },

    async removeSelectionFromAPI(songId) {
        try {
            const response = await fetch(`${API_BASE}/selections`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ songId })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error removing selection:', error);
            this.showToast('Erro ao remover música');
            return false;
        }
    },

    async getSongById(songId) {
        try {
            const response = await fetch(`${API_BASE}/songs`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                return result.data.find(s => s.song_id === songId);
            }
            return null;
        } catch (error) {
            console.error('Error getting song:', error);
            return null;
        }
    },

    togglePlay(songId) {
        if (this.currentPlayingId === songId) {
            this.pauseCurrent();
        } else {
            this.playSong(songId);
        }
    },

    async playSong(songId) {
        // Stop current audio
        this.stopAllAudio();

        const song = await this.getSongById(songId);
        if (!song || !song.audio_url) {
            this.showToast('Áudio não disponível');
            return;
        }
        
        // Create new audio element - ajustar URL base conforme necessário
        const audioUrl = song.audio_url.startsWith('http') 
            ? song.audio_url 
            : `https://vivalld.com.br/api/${song.audio_url}`;
            
        this.currentAudio = new Audio(audioUrl);
        this.currentPlayingId = songId;
        
        // Update UI
        $('.music-card.playing').removeClass('playing');
        $('.play-btn.playing').removeClass('playing').html('<i class="bi bi-play-fill"></i>');
        
        const card = $(`.music-card[data-song-id="${songId}"]`);
        card.addClass('playing');
        
        const playBtn = card.find('.play-btn');
        playBtn.addClass('playing').html('<i class="bi bi-pause-fill"></i>');

        // Add player controls if not present
        if (!card.find('.player-container').length) {
            const minutes = Math.floor(song.duration / 60);
            const seconds = song.duration % 60;
            const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            card.append(`
                <div class="player-container">
                    <div class="player-progress">
                        <span class="current-time" id="current-${song.song_id}">0:00</span>
                        <input type="range" class="progress-slider" 
                               data-song-id="${song.song_id}" 
                               min="0" max="${song.duration}" value="0" 
                               step="1">
                        <span class="total-time">${durationFormatted}</span>
                    </div>
                </div>
            `);
        }

        // Setup audio events
        this.currentAudio.addEventListener('timeupdate', () => {
            if (this.currentPlayingId === songId) {
                const currentMinutes = Math.floor(this.currentAudio.currentTime / 60);
                const currentSeconds = Math.floor(this.currentAudio.currentTime % 60);
                $(`#current-${song.song_id}`).text(`${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`);
                
                const slider = $(`.progress-slider[data-song-id="${song.song_id}"]`);
                slider.val(this.currentAudio.currentTime);
                
                if (!isNaN(this.currentAudio.duration)) {
                    const durationMinutes = Math.floor(this.currentAudio.duration / 60);
                    const durationSeconds = Math.floor(this.currentAudio.duration % 60);
                    const formattedSeconds = durationSeconds.toString().padStart(2, '0');
                    
                    $(`#total-time`).text(`${durationMinutes}:${formattedSeconds}`);
                    slider.attr('max', this.currentAudio.duration);
                    
                    const progress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
                    slider.css('background', `linear-gradient(90deg, var(--primary-color) ${progress}%, var(--border-color) ${progress}%)`);
                }
            }
        });

        this.currentAudio.addEventListener('ended', () => {
            this.stopAllAudio();
        });

        // Play
        this.currentAudio.play().catch(e => console.log('Audio play failed:', e));
    },

    pauseCurrent() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            
            const songId = this.currentPlayingId;
            const card = $(`.music-card[data-song-id="${songId}"]`);
            card.removeClass('playing');
            card.find('.play-btn').removeClass('playing').html('<i class="bi bi-play-fill"></i>');
            
            this.currentPlayingId = null;
            this.currentAudio = null;
        }
    },

    stopAllAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            
            if (this.currentPlayingId) {
                const card = $(`.music-card[data-song-id="${this.currentPlayingId}"]`);
                card.removeClass('playing');
                card.find('.play-btn').removeClass('playing').html('<i class="bi bi-play-fill"></i>');
                card.find('.player-container').remove();
            }
            
            this.currentAudio = null;
            this.currentPlayingId = null;
        }
    },

    async nextSection() {
        this.stopAllAudio();
        
        if (this.currentSectionIndex < this.sections.length - 1) {
            this.currentSectionIndex++;
            await this.saveProgress();
            return this.sections[this.currentSectionIndex];
        } else {
            return 'resumo';
        }
    },

    async previousSection() {
        this.stopAllAudio();
        
        if (this.currentSectionIndex > 0) {
            this.currentSectionIndex--;
            await this.saveProgress();
            return this.sections[this.currentSectionIndex];
        }
        return null;
    },

    async saveProgress() {
        try {
            await fetch(`${API_BASE}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ currentSection: this.currentSectionIndex })
            });
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    },

    updateProgress() {
        const progress = ((this.currentSectionIndex + 1) / this.sections.length) * 100;
        $('#wizardProgress').css('width', `${progress}%`);
        $('#progressText').text(`${this.currentSectionIndex + 1}/${this.sections.length}`);
    },

    updateNextButton() {
        const currentSection = this.sections[this.currentSectionIndex];
        const selections = this.selections[currentSection] || [];
        const isValid = selections.length >= 1 && selections.length <= 2;
        
        $('#nextButton').prop('disabled', !isValid);
    },

    async getSummary() {
        let html = '<div class="section-card fade-in"><h2 class="section-title">Repertório Escolhido</h2>';
        
        for (const section of this.sections) {
            const sectionSelections = this.selections[section] || [];
            
            if (sectionSelections.length > 0) {
                html += `<div class="mb-4"><h3 class="h5" style="color: var(--secondary-color);">${section}</h3>`;
                
                for (const songId of sectionSelections) {
                    const song = await this.getSongById(songId);
                    if (song) {
                        html += `
                            <div class="ms-3 mb-2 p-2" style="border-left: 2px solid var(--primary-color);">
                                <div><strong>${song.title}</strong></div>
                                <div class="text-muted small">${song.artist || 'Artista não informado'}</div>
                            </div>
                        `;
                    }
                }
                
                html += '</div>';
            }
        }
        
        html += `
            <div class="d-flex gap-2 mt-4">
                <button class="btn btn-outline-secondary flex-grow-1" onclick="Repertorio.editRepertory()">
                    <i class="bi bi-pencil"></i> Editar
                </button>
                <button class="btn btn-outline-danger flex-grow-1" onclick="Repertorio.clearRepertory()">
                    <i class="bi bi-trash"></i> Limpar Tudo
                </button>
            </div>
        </div>`;
        
        return html;
    },

    async editRepertory() {
        $('#backButton').removeClass('d-none');
        $('#footer').removeClass('d-none');
        $('#progressContainer').removeClass('d-none');
        
        this.currentSectionIndex = 0;
        await this.saveProgress();
        
        // Recarregar seleções
        await this.loadSelections();
        
        window.location.href = 'repertorio.html';
    },

    async clearRepertory() {
        if (confirm('Tem certeza que deseja limpar todo o repertório?')) {
            try {
                const response = await fetch(`${API_BASE}/selections`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ clearAll: true })
                });

                const result = await response.json();
                
                if (result.success) {
                    this.selections = {};
                    await this.saveProgress();
                    window.location.href = 'repertorio.html';
                }
            } catch (error) {
                console.error('Error clearing repertory:', error);
                this.showToast('Erro ao limpar repertório');
            }
        }
    },

    showToast(message) {
        const toast = $(`
            <div class="toast custom-toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `);
        
        $('.toast-container').append(toast);
        const bsToast = new bootstrap.Toast(toast[0], { delay: 3000 });
        bsToast.show();
        
        toast.on('hidden.bs.toast', function() {
            $(this).remove();
        });
    }
};

window.Repertorio = Repertorio;