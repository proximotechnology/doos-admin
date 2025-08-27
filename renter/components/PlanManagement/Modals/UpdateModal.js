document.addEventListener('alpine:init', () => {
    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter, // Ensure API_CONFIG is defined
        managerId: null,
        callback: null,

        openModal(id, callback) {
            this.managerId = id;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
        },

        confirmUpdate() {
            if (this.callback && this.managerId) {
                this.callback(this.managerId);
            }
            this.closeModal();
        },
    });

});
