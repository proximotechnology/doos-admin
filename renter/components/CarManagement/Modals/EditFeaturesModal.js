document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const icon = color === 'success' ? 'success' : 'error';
        Swal.fire({
            toast: true,
            position: 'bottom-start',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            customClass: {
                popup: `color-${color}`,
            },
        });
    }

    Alpine.store('editFeaturesModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        carId: null,
        isOpen: false,
        callback: null,
        carData: null,
        features: {},
        additionalFeatures: [],

        openModal(carId, carData, callback) {
            this.carId = carId;
            this.carData = carData;
            this.callback = callback;
            this.isOpen = true;

            const features = carData.cars_features || {};
            const excludedKeys = ['id', 'cars_id', 'created_at', 'updated_at', 'additional_features'];
            
            // Store features data
            this.features = {};
            Object.entries(features).forEach(([key, value]) => {
                if (!excludedKeys.includes(key)) {
                    this.features[key] = value || '';
                }
            });

            // Parse additional features
            this.additionalFeatures = this.getAdditionalFeaturesArray(features);

            // Render fields
            this.renderFields();
        },

        getAdditionalFeaturesArray(features) {
            if (!features.additional_features) return [];

            try {
                if (typeof features.additional_features === 'string' && features.additional_features.startsWith('[')) {
                    return JSON.parse(features.additional_features);
                } else if (Array.isArray(features.additional_features)) {
                    return features.additional_features;
                } else if (typeof features.additional_features === 'string') {
                    return features.additional_features.split(',').map(f => f.trim()).filter(f => f.length > 0);
                }
            } catch (error) {
                // Silently handle parsing error
            }

            return [];
        },

        renderFields() {
            const featuresContainer = document.getElementById('featuresFieldsContainer');
            const additionalContainer = document.getElementById('additionalFeaturesContainer');

            if (!featuresContainer || !additionalContainer) return;

            // Render feature fields
            const featureFieldsHtml = Object.entries(this.features).map(([key, value]) => {
                const translatedLabel = Alpine.store('i18n').t(key) || key.replace(/_/g, ' ');
                const safeValue = (value || '').toString().replace(/"/g, '&quot;');
                return `
                    <div class="form-group">
                        <label class="form-label flex items-center gap-2">
                            <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>${translatedLabel}</span>
                        </label>
                        <input
                            type="text"
                            class="form-input feature-input"
                            data-key="${key}"
                            placeholder="${translatedLabel}"
                            value="${safeValue}"
                        />
                    </div>
                `;
            }).join('');

            featuresContainer.innerHTML = featureFieldsHtml;

            // Render additional features
            if (this.additionalFeatures.length === 0) {
                this.additionalFeatures = [''];
            }

            const additionalFeaturesHtml = this.additionalFeatures.map((feature, index) => {
                const safeFeature = (feature || '').toString().replace(/"/g, '&quot;');
                return `
                <div class="flex items-center gap-3 additional-feature-item">
                    <input
                        type="text"
                        class="form-input flex-1 additional-feature-input"
                        placeholder="${Alpine.store('i18n').t('enter_feature')}"
                        value="${safeFeature}"
                        data-index="${index}"
                    />
                    <button
                        type="button"
                        class="remove-additional-feature-btn btn btn-danger btn-sm flex items-center justify-center ${this.additionalFeatures.length > 1 ? '' : 'hidden'}"
                        data-index="${index}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            `;
            }).join('');

            additionalContainer.innerHTML = additionalFeaturesHtml;

            // Add event listeners for remove buttons
            additionalContainer.querySelectorAll('.remove-additional-feature-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    this.removeAdditionalFeature(index);
                });
            });
        },

        addAdditionalFeature() {
            this.additionalFeatures.push('');
            this.renderFields();
        },

        removeAdditionalFeature(index) {
            this.additionalFeatures.splice(index, 1);
            if (this.additionalFeatures.length === 0) {
                this.additionalFeatures = [''];
            }
            this.renderFields();
        },

        updateFeatures() {
            if (!this.callback) return;

            // Collect feature values
            const featureInputs = document.querySelectorAll('.feature-input');
            const formData = {};

            featureInputs.forEach(input => {
                const key = input.dataset.key;
                let value = input.value.trim();

                // Handle special cases
                if (key === 'all_have_seatbelts') {
                    value = parseInt(value) || 0;
                } else if (key === 'num_of_door' || key === 'num_of_seat') {
                    value = value ? parseInt(value) : null;
                }

                formData[key] = value;
            });

            // Collect additional features from inputs
            const additionalInputs = document.querySelectorAll('.additional-feature-input');
            const additionalFeatures = [];
            additionalInputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    additionalFeatures.push(value);
                }
            });

            formData.additional_features = additionalFeatures;

            this.callback(formData);
            this.closeModal();
        },

        closeModal() {
            this.isOpen = false;
            this.carId = null;
            this.callback = null;
            this.carData = null;
            this.features = {};
            this.additionalFeatures = [];
        },
    });
});

