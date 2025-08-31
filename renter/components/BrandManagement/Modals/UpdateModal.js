document.addEventListener('alpine:init', () => {
    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        brandId: null,
        callback: null,
        isOpen: false,

        openModal(id, callback) {
            this.brandId = id;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
        },

        confirmUpdate() {
            if (this.callback && this.brandId) {
                this.callback(this.brandId);
            }
            this.closeModal();
        },
    });
});
