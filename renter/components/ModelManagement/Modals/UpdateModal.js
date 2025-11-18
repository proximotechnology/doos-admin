document.addEventListener('alpine:init', () => {
    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        modelId: null,
        currentName: '',
        callback: null,
        isOpen: false,

        openModal(modelId, modelName, callback) {
            this.modelId = modelId;
            this.currentName = modelName;
            Alpine.store('global').sharedData.fullname2 = modelName;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.modelId = null;
            this.currentName = '';
            Alpine.store('global').sharedData.fullname2 = '';
            this.callback = null;
        },

        confirmUpdate() {
            if (this.callback && typeof this.callback === 'function') {
                this.callback(this.modelId, Alpine.store('global').sharedData.fullname2);
            } else {
                }
            this.closeModal();
        },
    });
});
