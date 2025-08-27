document.addEventListener('alpine:init', () => {
    Alpine.store('deleteModal', {
        isOpen: false,
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

        confirmDelete() {
            if (this.callback && this.managerId) {
                this.callback(this.managerId);
            }
            this.closeModal();
        },
    });

});
