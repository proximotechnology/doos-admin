document.addEventListener('alpine:init', () => {
    Alpine.store('deleteModal', {
        adminId: null,
        isOpen: false,
        callback: null,

        openModal(adminId, callback) {
            this.adminId = adminId;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.adminId = null;
            this.callback = null;
        },

        confirmDelete() {
            if (this.callback) {
                this.callback();
            }
            this.closeModal();
        },
    });
});
