document.addEventListener('alpine:init', () => {
    Alpine.store('deleteModal', {
        adminId: null,
        isOpen: false,
        isDeleting: false,
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
            this.isDeleting = false;
        },

        async confirmDelete() {
            if (this.callback) {
                this.isDeleting = true;
                try {
                    await this.callback();
                } finally {
                    this.isDeleting = false;
                }
            }
            this.closeModal();
        },
    });
});
