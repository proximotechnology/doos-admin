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
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.modelId = null;
            this.currentName = '';
        },

        confirmUpdate() {
            if (this.callback && this.modelId) {
                // تمرير الاسم الحالي كمعامل إضافي
                this.callback(this.modelId, this.currentName);
            }
            this.closeModal();
        },
    });
});
