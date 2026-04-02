const Repertorio = {
    sections: [],
    songsCache: [],
    songsById: {},
    songsBySection: {},
    currentSectionIndex: 0,
    currentAudio: null,
    currentPlayingId: null,
    selections: {},
    syncTimer: null,
    isSyncing: false,

    async init() {
        try {
            if (!Auth.token) return;

            this.currentSectionIndex = 0;

            this.showInstructionsModal();

            await DB.init();
            await this.loadSections();

            await this.loadLocalSongs();
            await this.loadLocalSelections();
            // await this.loadLocalProgress();

            await this.loadSongsFromAPI();
            await this.loadSelectionsFromAPI();
            // await this.loadProgressFromAPI();

            this.setupAudioListeners();
            this.setupSyncEvents();

            this.selections = this.selections || {};

            this.scheduleSync(1000);
        } catch (error) {
            console.error('Error initializing repertorio:', error);
            this.selections = this.selections || {};
            this.currentSectionIndex = this.currentSectionIndex || 0;
        }
    },

    showInstructionsModal() {

        const alreadySeen = localStorage.getItem('instructionsSeen');

        if (!alreadySeen) return;

        const tryOpenModal = () => {
            const modalElement = document.getElementById('instructionsModal');

            if (!modalElement || typeof bootstrap === 'undefined') {
                return;
            }

            const modal = new bootstrap.Modal(modalElement);
            modal.show();

            localStorage.setItem('instructionsSeen', 'true');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryOpenModal, { once: true });
        } else {
            setTimeout(tryOpenModal, 100);
        }
    },

    async loadSections() {
        try {
            const response = await fetch(`${API_BASE}/sections`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                this.sections = result.data.map(s => ({
                    name: s.name,
                    limit: s.limit
                }));
            }
        } catch (error) {
            console.error('Erro ao carregar seções:', error);
        }
    },

    getCurrentSectionName() {
        return this.sections[this.currentSectionIndex]?.name || '';
    },

    getCurrentSectionLimit() {
        return this.sections[this.currentSectionIndex]?.limit || 0;
    },

    getSectionLimit(sectionName) {
        const section = this.sections.find(s => s.name === sectionName);
        return section ? section.limit : 0;
    },

    async loadLocalSongs() {
        const songs = await DB.getAll('songs');
        if (songs.length) {
            this.songsCache = songs;
            this.indexSongs();
        }
    },

    async saveLocalSongs() {
        await DB.saveSongs(this.songsCache || []);
    },

    async loadLocalSelections() {
        this.selections = await DB.getMeta('selections', {});
    },

    async saveLocalSelections() {
        await DB.setMeta('selections', this.selections || {});
    },

    async loadLocalProgress() {
        this.currentSectionIndex = await DB.getMeta('currentSectionIndex', 0);
    },

    async saveLocalProgress() {
        await DB.setMeta('currentSectionIndex', this.currentSectionIndex);
    },

    async loadSongsFromAPI() {
        try {
            const response = await fetch(`${API_BASE}/songs`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                this.songsCache = result.data;
                this.indexSongs();
                await this.saveLocalSongs();
            }
        } catch (error) {
            console.error('Erro ao carregar músicas da API:', error);
        }
    },

    indexSongs() {
        this.songsById = {};
        this.songsBySection = {};

        for (const song of this.songsCache) {
            const id = String(song.song_id);
            this.songsById[id] = song;

            if (!this.songsBySection[song.section]) {
                this.songsBySection[song.section] = [];
            }

            this.songsBySection[song.section].push(song);
        }
    },

    async loadSelectionsFromAPI() {
        try {
            const response = await fetch(`${API_BASE}/selections`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success && result.data) {
                this.selections = result.data;
                await this.saveLocalSelections();
            }
        } catch (error) {
            console.error('Erro ao carregar seleções da API:', error);
        }
    },

    async loadProgressFromAPI() {
        try {
            const response = await fetch(`${API_BASE}/progress`, {
                headers: {
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success && result.data.currentSection !== undefined) {
                this.currentSectionIndex = Number(result.data.currentSection) || 0;
                await this.saveLocalProgress();
            }
        } catch (error) {
            console.error('Erro ao carregar progresso da API:', error);
        }
    },

    getSongById(songId) {
        return this.songsById[String(songId)] || null;
    },

    async renderSection(sectionName) {
        try {
            const songs = this.songsBySection[sectionName] || [];
            const sectionSelections = this.selections[sectionName] || [];
            const sectionLimit = this.getSectionLimit(sectionName);

            let html = `
                <div class="section-card fade-in">
                    <h2 class="section-title">${sectionName}</h2>
                    <div class="selection-counter">
                        Selecionadas: <span id="counter-${sectionName.replace(/\s/g, '')}">${sectionSelections.length}</span>/${sectionLimit}
                    </div>
            `;

            songs.forEach(song => {
                const isSelected = sectionSelections.map(String).includes(String(song.song_id));
                const isPlaying = this.currentPlayingId === song.song_id;
                html += this.renderSongCard(song, isSelected, isPlaying);
            });

            html += '</div></div>';
            this.updateProgress();
            return html;
        } catch (error) {
            console.error('Error rendering section:', error);
            return '<div class="alert alert-danger">Erro ao carregar músicas</div>';
        }
    },

    renderSongCard(song, isSelected, isPlaying) {
        const duration = Number(song.duration || 0);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return `
            <div class="music-card ${isSelected ? 'selected' : ''} ${isPlaying ? 'playing' : ''}" data-song-id="${song.song_id}">
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
                                   min="0" max="${duration}" value="0" step="1">
                            <span class="total-time">${durationFormatted}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    setupAudioListeners() {
        $(document).off('click', '.play-btn').on('click', '.play-btn', (e) => {
            e.stopPropagation();
            const songId = $(e.currentTarget).data('song-id');
            this.togglePlay(songId);
        });

        $(document).off('click', '.music-card').on('click', '.music-card', (e) => {
            if (!$(e.target).closest('.play-btn').length) {
                const songId = $(e.currentTarget).data('song-id');
                this.toggleSelection(songId);
            }
        });

        $(document).off('input', '.progress-slider').on('input', '.progress-slider', (e) => {
            const songId = $(e.currentTarget).data('song-id');
            const value = Number($(e.currentTarget).val());

            if (this.currentPlayingId === songId && this.currentAudio) {
                this.currentAudio.currentTime = value;
            }
        });
    },

    setupSyncEvents() {
        window.addEventListener('online', () => {
            this.scheduleSync(500);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.syncNow();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.saveLocalSelections();
            this.saveLocalProgress();
        });
    },

    async toggleSelection(songId) {
        console.log('[TOGGLE] songId recebido:', songId, 'tipo:', typeof songId);

        const song = this.getSongById(songId);
        console.log('[TOGGLE] song encontrado:', song);

        if (!song) {
            this.showToast('Música não encontrada');
            return;
        }

        const section = String(song.section || '').trim();
        const normalizedSongId = String(songId).trim();

        console.log('normalizedSongId:', normalizedSongId);

        if (!section) {
            this.showToast('Seção inválida');
            return;
        }

        // aqui está o ponto principal
        if (!this.selections || typeof this.selections !== 'object' || Array.isArray(this.selections)) {
            console.log('transformando em objeto');
            this.selections = {};
        }

        console.log('section:', section);
        console.log('this.selections antes da seção:', this.selections);
        console.log('Array.isArray(this.selections):', Array.isArray(this.selections));

        if (!Array.isArray(this.selections[section])) {
            console.log('transformando seção em []');
            this.selections[section] = [];
        }

        this.selections[section] = this.selections[section].map(String);

        const selected = this.selections[section];
        const index = selected.indexOf(normalizedSongId);

        console.log('selected:', selected);
        console.log('index:', index);
        console.log('[TOGGLE] antes:', JSON.stringify(this.selections));

        if (index === -1) {
            const sectionLimit = this.getSectionLimit(section);

            if (sectionLimit > 0 && selected.length >= sectionLimit) {
                this.showToast(`Limite de ${sectionLimit} música(s) atingido`);
                return;
            }

            selected.push(normalizedSongId);
        } else {
            selected.splice(index, 1);

            if (selected.length === 0) {
                delete this.selections[section];
            }
        }

        console.log('[TOGGLE] depois objeto real:', this.selections);
        console.log('[TOGGLE] depois json:', JSON.stringify(this.selections));

        await this.saveLocalSelections();

        await DB.enqueueSync({
            type: 'state_change',
            currentSection: this.currentSectionIndex
        });

        this.updateCounter(section);
        this.updateNextButton();
        this.updateCardState(songId, index === -1);

        this.scheduleSync(1200);
    },

    updateCounter(section) {
        const count = this.selections[section]?.length || 0;
        $(`#counter-${section.replace(/\s/g, '')}`).text(count);
    },

    updateCardState(songId, isSelected) {
        const card = $(`.music-card[data-song-id="${songId}"]`);
        if (isSelected) {
            card.addClass('selected');
        } else {
            card.removeClass('selected');
        }
    },

    scheduleSync(delay = 1500) {
        clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => this.syncNow(), delay);
    },

    async syncNow() {
        if (this.isSyncing || !navigator.onLine) return;

        const queue = await DB.getAll('sync_queue');
        if (!queue.length) return;

        this.isSyncing = true;

        try {
            const safeSelections = (
                this.selections &&
                typeof this.selections === 'object' &&
                !Array.isArray(this.selections)
            ) ? this.selections : {};

            const payload = {
                currentSection: this.currentSectionIndex,
                selections: safeSelections
            };

            console.log('[SYNC] payload final:', JSON.stringify({
                currentSection: this.currentSectionIndex,
                selections: this.selections
            }));

            const response = await fetch(`${API_BASE}/selections/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            let result = null;

            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('[SYNC] Erro ao interpretar JSON:', jsonError);
                this.showToast('Erro ao sincronizar: resposta inválida do servidor');
                return;
            }

            console.log('[SYNC] Resposta da API:', result);

            if (response.ok && result.success) {
                await DB.clear('sync_queue');
                await DB.setMeta('lastSync', result.data?.syncedAt || new Date().toISOString());
                return;
            }

            let errorMessage = result?.message || `Erro HTTP ${response.status}`;

            if (result?.errors && typeof result.errors === 'object') {
                const detailedErrors = [];

                Object.entries(result.errors).forEach(([field, messages]) => {
                    if (Array.isArray(messages)) {
                        messages.forEach(msg => detailedErrors.push(`${field}: ${msg}`));
                    } else if (messages) {
                        detailedErrors.push(`${field}: ${messages}`);
                    }
                });

                if (detailedErrors.length) {
                    errorMessage += ' - ' + detailedErrors.join(' | ');
                }
            }

            console.warn('Falha na sincronização:', result);
            this.showToast(errorMessage);
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
            this.showToast(`Erro ao sincronizar: ${error.message || 'falha inesperada'}`);
        } finally {
            this.isSyncing = false;
        }
    },

    async forceFullSync() {
        await this.syncNow();
    },

    async saveProgressLocalAndQueue() {
        await this.saveLocalProgress();
        await DB.enqueueSync({
            type: 'progress',
            currentSection: this.currentSectionIndex
        });
        this.scheduleSync(800);
    },

    togglePlay(songId) {
        if (this.currentPlayingId === songId) {
            this.pauseCurrent();
        } else {
            this.playSong(songId);
        }
    },

    async playSong(songId) {
        this.stopAllAudio();

        const song = this.getSongById(songId);
        if (!song || !song.audio_url) {
            this.showToast('Áudio não disponível');
            return;
        }

        const audioUrl = song.audio_url.startsWith('http')
            ? song.audio_url
            : `https://vivalld.com.br/api/${song.audio_url}`;

        this.currentAudio = new Audio(audioUrl);
        this.currentPlayingId = songId;

        $('.music-card.playing').removeClass('playing');
        $('.play-btn.playing').removeClass('playing').html('<i class="bi bi-play-fill"></i>');

        const card = $(`.music-card[data-song-id="${songId}"]`);
        card.addClass('playing');

        const playBtn = card.find('.play-btn');
        playBtn.addClass('playing').html('<i class="bi bi-pause-fill"></i>');

        if (!card.find('.player-container').length) {
            const duration = Number(song.duration || 0);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            card.append(`
                <div class="player-container">
                    <div class="player-progress">
                        <span class="current-time" id="current-${song.song_id}">0:00</span>
                        <input type="range" class="progress-slider"
                               data-song-id="${song.song_id}"
                               min="0" max="${duration}" value="0" step="1">
                        <span class="total-time">${durationFormatted}</span>
                    </div>
                </div>
            `);
        }

        this.currentAudio.addEventListener('timeupdate', () => {
            if (this.currentPlayingId === songId) {
                const currentMinutes = Math.floor(this.currentAudio.currentTime / 60);
                const currentSeconds = Math.floor(this.currentAudio.currentTime % 60);
                $(`#current-${song.song_id}`).text(`${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`);

                const slider = $(`.progress-slider[data-song-id="${song.song_id}"]`);
                slider.val(this.currentAudio.currentTime);
            }
        });

        this.currentAudio.addEventListener('ended', () => {
            this.stopAllAudio();
        });

        this.currentAudio.addEventListener('loadedmetadata', () => {
            const duration = Math.floor(this.currentAudio.duration);

            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;

            const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // Atualiza o tempo total na tela
            const totalTimeEl = card.find('.total-time');
            if (totalTimeEl.length) {
                totalTimeEl.text(durationFormatted);
            }

            // Atualiza o max do slider
            const slider = $(`.progress-slider[data-song-id="${song.song_id}"]`);
            slider.attr('max', duration);
        });

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

    updateProgress() {
        const total = this.sections.length || 1;
        const progress = ((this.currentSectionIndex + 1) / total) * 100;
        $('#wizardProgress').css('width', `${progress}%`);
        $('#progressText').text(`${this.currentSectionIndex + 1}/${total}`);
    },

    updateNextButton() {
        const currentSection = this.getCurrentSectionName();
        const sectionLimit = this.getCurrentSectionLimit();
        const selections = this.selections[currentSection] || [];

        if (sectionLimit === 0) {
            $('#nextButton').prop('disabled', false);
            return;
        }

        const isValid = selections.length >= 1 && selections.length <= sectionLimit;
        $('#nextButton').prop('disabled', !isValid);
    },

    async getSummary() {
        let html = '<div class="section-card fade-in"><h2 class="section-title">Repertório Escolhido</h2>';

        for (const section of this.sections) {
            const sectionSelections = this.selections[section.name] || [];

            if (sectionSelections.length > 0) {
                html += `<div class="mb-4"><h3 class="h5" style="color: var(--secondary-color);">${section.name}</h3>`;

                for (const songId of sectionSelections) {
                    const song = this.getSongById(songId);
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
        this.currentSectionIndex = 0;
        await this.saveProgressLocalAndQueue();
        window.location.href = 'repertorio.html';
    },

    async clearRepertory() {
        if (confirm('Tem certeza que deseja limpar todo o repertório?')) {
            this.selections = {};
            this.currentSectionIndex = 0;

            await this.saveLocalSelections();
            await this.saveLocalProgress();

            if (window.DB) {
                await DB.enqueueSync({
                    type: 'clear_all',
                    currentSection: 0
                });
            }

            await this.forceFullSync();
            window.location.href = 'repertorio.html';
        }
    },

    showToast(message) {
        const safeMessage = String(message || 'Ocorreu um erro inesperado');

        const toast = $(`
            <div class="toast custom-toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-body" style="white-space: normal; word-break: break-word;">
                    ${safeMessage}
                </div>
            </div>
        `);

        $('.toast-container').append(toast);
        const bsToast = new bootstrap.Toast(toast[0], { delay: 6000 });
        bsToast.show();

        toast.on('hidden.bs.toast', function() {
            $(this).remove();
        });
    },

    async deleteProgress() {
        try {
            this.currentSectionIndex = 0;

            if (window.DB) {
                await DB.setMeta('currentSectionIndex', 0);
                await DB.enqueueSync({
                    type: 'progress_reset',
                    currentSection: 0
                });
            }

            this.scheduleSync(300);
        } catch (error) {
            console.error('Erro ao resetar progresso:', error);
        }
    },

    

    
};

window.Repertorio = Repertorio;