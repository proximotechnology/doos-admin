document.addEventListener('alpine:init', () => {
    Alpine.store('deleteModal', {
        isOpen: false,
        roleId: null,
        callback: null,

        openModal(id, callback) {
            this.roleId = id;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.roleId = null;
            this.callback = null;
        },

        confirmDelete() {
            if (this.callback && this.roleId) {
                this.callback(this.roleId);
            }
            this.closeModal();
        },
    });
});
