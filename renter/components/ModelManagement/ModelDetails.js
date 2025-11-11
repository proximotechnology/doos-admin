document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
        },
    };
    coloredToast = (color, message) => {
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
    };
    Alpine.data('modelDetails', () => ({
        model: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        modelId: null,

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            this.modelId = urlParams.get('id');

            if (!this.modelId) {
                coloredToast('danger', 'معرف الموديل غير موجود');
                window.location.href = 'model-management.html';
                return;
            }

            await this.fetchModelDetails();
        },

        async fetchModelDetails() {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/model_car/show/${this.modelId}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'فشل في جلب تفاصيل الموديل');
                }

                this.model = data.data;
            } catch (error) {
                coloredToast('danger', error.message || 'فشل في جلب تفاصيل الموديل');
                console.error('Error fetching model details:', error);
            } finally {
                loadingIndicator.hide();
            }
        },

        async addYear() {
            Alpine.store('addYearModal').openModal(this.modelId);
        },

        async updateYear(yearId, currentYear) {
            Alpine.store('updateYearModal').openModal(yearId, currentYear);
        },

        async deleteYear(yearId) {
            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteYearModal').openModal(yearId, (id) => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/year_model/delete/${yearId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_delete_year'));

                coloredToast('success', Alpine.store('i18n').t('year_deleted_successfully'));
                await this.fetchModelDetails();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('error_delete_year'));
            } finally {
                loadingIndicator.hide();
            }
        },

        formatYears(years) {
            if (!years || years.length === 0) {
                return Alpine.store('i18n').t('no_years');
            }

            return years.map(year => {
                return `
                       <div class="msl-years-item" x-data="{ imgError: false }">
                        <img src="${year.image || 'assets/images/default-car.png'}" alt="Year ${year.year}" @error="imgError = true"/>
                        <span class="msl-year-label">${year.year}</span>
                        <div class="msl-year-actions">
                            <button class="msl-edit-btn" @click="updateYear(${year.id}, ${year.year})">${Alpine.store('i18n').t('edit')}</button>
                            <button class="msl-delete-btn" @click="deleteYear(${year.id})">${Alpine.store('i18n').t('delete')}</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }));
    Alpine.store('addYearModal', {
        isOpen: false,
        managerId: null,
        openModal(managerId) {
            this.managerId = managerId;
            this.isOpen = true;
            setTimeout(() => {
                if (Alpine.store('global')) {
                    Alpine.store('global').sharedData.year = '';
                }
            }, 100);
        },
        closeModal() {
            this.isOpen = false;
            this.managerId = null;
            if (Alpine.store('global')) {
                Alpine.store('global').sharedData.year = '';
            }
        },
        async confirmAdd() {
            if (!Alpine.store('global')) {
                coloredToast('danger', 'خطأ في تهيئة التطبيق');
                return;
            }

            const year = Alpine.store('global').sharedData.year;
            const imageInput = document.querySelector('[x-ref="yearImage"]');
            const file = imageInput ? imageInput.files[0] : null;

            if (!year || isNaN(year)) {
                coloredToast('danger', Alpine.store('i18n').t('invalid_year'));
                return;
            }
            if (!file) {
                coloredToast('danger', Alpine.store('i18n').t('no_image_selected'));
                return;
            }

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    this.closeModal();
                    return;
                }

                const formData = new FormData();
                formData.append('car_model_id', this.managerId);
                formData.append('year', year);
                formData.append('image', file);

                let apiBaseUrl = API_CONFIG?.BASE_URL_Renter;
                if (!apiBaseUrl) {
                    const tableElement = document.querySelector('[x-data="multipleTable"]');
                    if (tableElement && Alpine.$data(tableElement)) {
                        apiBaseUrl = Alpine.$data(tableElement).apiBaseUrl;
                    }
                }

                if (!apiBaseUrl) {
                    throw new Error('لم يتم تعريف عنوان API');
                }

                const response = await fetch(`${apiBaseUrl}/api/admin/year_model/store`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_add_year'));
                }

                coloredToast('success', Alpine.store('i18n').t('year_added_successfully'));

                const modelDetailsComponent = Alpine.$data(document.querySelector('[x-data="modelDetails"]'));
                if (modelDetailsComponent && modelDetailsComponent.fetchModelDetails) {
                    await modelDetailsComponent.fetchModelDetails();
                }

                this.closeModal();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_add_year'));
            } finally {
                loadingIndicator.hide();
            }
        }
    });
    Alpine.store('modelTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="multipleTable"]'));
            if (tableComponent && tableComponent.fetchManagers) {
                await tableComponent.fetchManagers();
            }
        }
    });
    let globalApiBaseUrl = API_CONFIG?.BASE_URL_Renter || '';

    Alpine.store('updateYearModal', {
        isOpen: false,
        yearId: null,
        currentYear: '',
        apiBaseUrl: globalApiBaseUrl,

        openModal(yearId, currentYear) {
            this.yearId = yearId;
            this.currentYear = currentYear;

            setTimeout(() => {
                if (Alpine.store('global')) {
                    Alpine.store('global').sharedData.year = currentYear;
                }
            }, 100);

            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.yearId = null;
            this.currentYear = '';

            if (Alpine.store('global')) {
                Alpine.store('global').sharedData.year = '';
            }
        },

        async confirmUpdate() {
            if (!Alpine.store('global')) {
                coloredToast('danger', 'خطأ في تهيئة التطبيق');
                return;
            }

            const year = Alpine.store('global').sharedData.year;
            const imageInput = document.querySelector('[x-ref="updateYearImage"]');
            const file = imageInput ? imageInput.files[0] : null;

            if (!year || isNaN(year)) {
                coloredToast('danger', Alpine.store('i18n').t('invalid_year'));
                return;
            }

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    this.closeModal();
                    return;
                }

                const formData = new FormData();
                formData.append('year', year);
                if (file) formData.append('image', file);

                const apiBaseUrl = this.apiBaseUrl || globalApiBaseUrl;
                if (!apiBaseUrl) {
                    throw new Error('لم يتم تعريف عنوان API');
                }

                const response = await fetch(`${apiBaseUrl}/api/admin/year_model/update/${this.yearId}`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_update_year'));
                }

                coloredToast('success', Alpine.store('i18n').t('year_updated_successfully'));

                const modelDetailsComponent = Alpine.$data(document.querySelector('[x-data="modelDetails"]'));
                if (modelDetailsComponent && modelDetailsComponent.fetchModelDetails) {
                    await modelDetailsComponent.fetchModelDetails();
                }

                this.closeModal();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_update_year'));
            } finally {
                loadingIndicator.hide();
            }
        }
    });

});
