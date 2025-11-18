document.addEventListener('alpine:init', () => {
    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        featureId: null,
        callback: null,
        isOpen: false,
        plans: [],
        featureData: {
            plan_id: '',
            feature: ''
        },

        async openModal(featureId, feature, plans, callback) {
            this.featureId = featureId;
            this.callback = callback;
            this.plans = plans || [];
            this.featureData = {
                plan_id: feature.plan_id || '',
                feature: feature.feature || ''
            };
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.featureId = null;
            this.callback = null;
            this.plans = [];
            this.featureData = {
                plan_id: '',
                feature: ''
            };
        },

        confirmUpdate() {
            if (this.callback && this.featureId) {
                this.callback(this.featureId, {
                    plan_id: this.featureData.plan_id,
                    feature: this.featureData.feature.trim()
                });
            }
            this.closeModal();
        },
    });
});
