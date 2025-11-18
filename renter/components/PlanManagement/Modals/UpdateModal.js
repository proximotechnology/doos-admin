document.addEventListener('alpine:init', () => {
    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        managerId: null,
        callback: null,
        isOpen: false,

        openModal(id, callback) {
            this.managerId = id;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.managerId = null;
            this.callback = null;
        },

        confirmUpdate() {
            if (this.callback && this.managerId) {
                this.callback(this.managerId);
            }
            this.closeModal();
        },
    });
});
