document.addEventListener('alpine:init', () => {

    Alpine.store('deleteYearModal', {
        isOpen: false,
        yearId: null,
        callback: null,

        openModal(yearId, callback) {
            this.yearId = yearId;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.yearId = null;
            this.callback = null;
        },

        confirmDelete() {
            if (this.callback && typeof this.callback === 'function') {
                this.callback(this.yearId);
            }
            this.closeModal();
        }
    });
})
