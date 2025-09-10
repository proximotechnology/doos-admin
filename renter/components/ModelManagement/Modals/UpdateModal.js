document.addEventListener('alpine:init', () => {
    // Update Modal Store (for updating model name)
    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        modelId: null,
        currentName: '',
        callback: null,
        isOpen: false,

        openModal(modelId, modelName, callback) {
            this.modelId = modelId;
            this.currentName = modelName;
            Alpine.store('global').sharedData.fullname2 = modelName; // Sync with input
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.modelId = null;
            this.currentName = '';
            Alpine.store('global').sharedData.fullname2 = '';
        },

        confirmUpdate() {
            if (this.callback && this.modelId) {
                this.callback(this.modelId, Alpine.store('global').sharedData.fullname2);
            }
            this.closeModal();
        },
    });


});
