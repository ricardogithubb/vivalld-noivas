const Utils = {
    // Mostrar toast
    showToast(message, type = 'info') {
        const toast = $(`
            <div class="toast custom-toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-body d-flex align-items-center">
                    <i class="bi bi-info-circle-fill me-2"></i>
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
    },

    // Formatar tempo
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // Parar todos os áudios
    stopAllAudio() {
        if (window.Repertorio && Repertorio.currentAudio) {
            Repertorio.currentAudio.pause();
            Repertorio.currentAudio.currentTime = 0;
            Repertorio.currentAudio = null;
            Repertorio.currentPlayingId = null;
        }
    }
};

window.Utils = Utils;