document.addEventListener('alpine:init', () => {

    Alpine.store('deleteModal', {
        isOpen: false,
        testimonialId: null,
        onConfirm: null,

        openModal(id, callback) {
            this.testimonialId = id;
            this.onConfirm = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.testimonialId = null;
            this.onConfirm = null;
        }
    });
})
