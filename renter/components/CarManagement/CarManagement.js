document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
        },
        showTableLoader: function () {
            document.getElementById('tableLoading').classList.remove('hidden');
            document.getElementById('myTable1').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('myTable1').classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('myTable1').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const toast = window.Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: {
                popup: `color-${color}`,
            },
        });
        toast.fire({
            title: message,
        });
    }

    function loadGoogleMapsAPI(callback) {
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
            callback();
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = callback;
        script.onerror = function () {
            console.error('Failed to load Google Maps API');
            coloredToast('danger', Alpine.store('i18n').t('failed_to_load_map'));
        };
        document.head.appendChild(script);
    }

    Alpine.data('carsTable', () => ({
        tableData: [],
        meta: {
            total: 0,
            active: 0,
            inactive: 0,
            rejected: 0
        },
        paginationMeta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
            from: 0,
            to: 0,
            links: []
        },
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            status: '',
            year: '',
            min_price: '',
            max_price: ''
        },

        async initComponent() {
            loadGoogleMapsAPI(() => { });

            document.addEventListener('click', (e) => {
                if (e.target.closest('.view-car-btn')) {
                    const carId = e.target.closest('.view-car-btn').dataset.id;
                    this.showCarDetails(carId);
                }
                if (e.target.closest('.edit-features-btn')) {
                    const carId = e.target.closest('.edit-features-btn').dataset.id;
                    this.editFeatures(carId);
                }
                if (e.target.closest('.delete-car-btn')) {
                    const carId = e.target.closest('.delete-car-btn').dataset.id;
                    this.deleteCar(carId);
                }
                if (e.target.closest('.change-status-btn')) {
                    const carId = e.target.closest('.change-status-btn').dataset.id;
                    this.changeStatus(carId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchCars(page);
                }
            });

            await this.fetchCars(1);
        },

        async fetchCars(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = parseInt(page);

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const queryParams = new URLSearchParams({ page, per_page: 10 });
                if (this.filters.status) queryParams.append('status', this.filters.status);
                if (this.filters.year) queryParams.append('year', this.filters.year);
                if (this.filters.min_price) queryParams.append('min_price', this.filters.min_price);
                if (this.filters.max_price) queryParams.append('max_price', this.filters.max_price);

                const url = `${this.apiBaseUrl}/api/get_all_mycars?${queryParams.toString()}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_to_load'));
                }

                const data = await response.json();
                console.log(data);

                if (Array.isArray(data.data.data)) {
                    this.tableData = data.data.data;
                    this.paginationMeta = {
                        current_page: data.data.current_page || 1,
                        last_page: data.data.last_page || 1,
                        per_page: data.data.per_page || 10,
                        total: data.data.total || 0,
                        from: data.data.from || 0,
                        to: data.data.to || 0,
                        links: data.data.links || []
                    };
                    this.meta = {
                        total: data.data.total || this.tableData.length,
                        active: this.tableData.filter(car => car.status === 'active').length,
                        inactive: this.tableData.filter(car => car.status === 'inactive').length,
                        rejected: this.tableData.filter(car => car.status === 'rejected').length
                    };

                    if (this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                console.error('Error fetching cars:', error);
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.currentPage = 1;
            this.fetchCars(1);
        },

        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2 rtl:space-x-reverse">';

            if (this.paginationMeta.current_page > 1) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary rounded-md px-3 py-1 hover:bg-blue-100" data-page="${this.paginationMeta.current_page - 1}">
                    ${Alpine.store('i18n').t('previous')}
                </button>`;
            }

            const startPage = Math.max(1, this.paginationMeta.current_page - 2);
            const endPage = Math.min(this.paginationMeta.last_page, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary bg-blue-600 text-white' : 'btn-outline-primary border border-blue-600 text-blue-600'} rounded-md px-3 py-1 hover:bg-blue-100" data-page="${i}">
                    ${i}
                </button>`;
            }

            if (this.paginationMeta.current_page < this.paginationMeta.last_page) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary rounded-md px-3 py-1 hover:bg-blue-100" data-page="${this.paginationMeta.current_page + 1}">
                    ${Alpine.store('i18n').t('next')}
                </button>`;
            }

            paginationHTML += '</nav></div>';
            return paginationHTML;
        },

        populateTable() {
            if (this.datatable1) {
                this.datatable1.destroy();
            }

            const mappedData = this.tableData.map((car, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatCarInfo(car),
                this.formatText(car.years?.year || 'N/A'),
                this.formatPrice(car.price),
                this.formatStatus(car.status),
                this.formatDate(car.created_at),
                this.getActionButtons(car.id),
            ]);

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('car'),
                        Alpine.store('i18n').t('year'),
                        Alpine.store('i18n').t('price'),
                        Alpine.store('i18n').t('status'),
                        Alpine.store('i18n').t('created_at'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
                perPageSelect: false,
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                lastText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prevText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                nextText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: this.generatePaginationHTML() + '{info}{pager}',
                },
            });
        },

        formatCarInfo(car) {
            if (!car) return Alpine.store('i18n').t('na');

            const firstImage = car.car_image && car.car_image.length > 0
                ? car.car_image[0].image
                : 'assets/images/default-car.png';

            return `
                <div class="flex items-center w-max" x-data="{ imgError: false }">
                    <img class="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                        :src="imgError ? 'assets/images/default-car.png' : '${firstImage}'"
                        alt="${car.make || 'Car'}"
                        @error="imgError = true"
                        loading="lazy"
                        width="36"
                        height="36" />
                    ${car.make || 'Car'} ${car.model ? `(${car.model.name})` : ''}
                </div>`;
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
        },

        formatPrice(price) {
            if (!price) return Alpine.store('i18n').t('na');
            return `${parseFloat(price).toFixed(2)} ${Alpine.store('i18n').t('currency')}`;
        },

        formatStatus(status) {
            const statusClass = `status-${status}`;
            const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A';
            return `<span class="status-badge ${statusClass}">${Alpine.store('i18n').t(status)}</span>`;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(carId) {
            return `
                <div class="flex items-center gap-1">
                    <button class="btn view-car-btn btn-primary btn-sm rounded-md px-3 py-1" data-id="${carId}">
                        ${Alpine.store('i18n').t('view_details')}
                    </button>
                    <button class="btn edit-features-btn btn-warning btn-sm rounded-md px-3 py-1" data-id="${carId}">
                        ${Alpine.store('i18n').t('edit_features')}
                    </button>
                    <button class="btn change-status-btn btn-outline-info btn-sm rounded-md px-3 py-1" data-id="${carId}">
                        ${Alpine.store('i18n').t('change_status')}
                    </button>
                    <button class="btn delete-car-btn btn-danger btn-sm rounded-md px-3 py-1" data-id="${carId}">
                        ${Alpine.store('i18n').t('delete_car')}
                    </button>
                </div>`;
        },

        async changeStatus(carId) {
            try {
                const car = this.tableData.find(c => c.id == carId);
                if (!car) {
                    throw new Error(Alpine.store('i18n').t('car_not_found'));
                }

                const statusConfig = this.getStatusConfig(car);
                const result = await this.showStatusModal(statusConfig);

                if (result.isConfirmed && result.value) {
                    await this.updateCarStatus(carId, result.value);
                }
            } catch (error) {
                this.handleStatusError(error);
            } finally {
                loadingIndicator.hide();
            }
        },

        // تكوين إعدادات الحالة
        getStatusConfig(car) {
            return {
                title: Alpine.store('i18n').t('change_status'),
                currentStatus: car.status,
                statusOptions: [
                    { value: 'active', label: Alpine.store('i18n').t('active') },
                    { value: 'inactive', label: Alpine.store('i18n').t('inactive') },
                    { value: 'rejected', label: Alpine.store('i18n').t('rejected') }
                ],
                texts: {
                    selectStatus: Alpine.store('i18n').t('select_status'),
                    rejectionReasons: Alpine.store('i18n').t('rejection_reasons'),
                    writeReasonHere: Alpine.store('i18n').t('write_reason_here'),
                    addNewReason: Alpine.store('i18n').t('add_new_reason'),
                    pleaseEnterRejectionReasons: Alpine.store('i18n').t('please_enter_rejection_reasons'),
                    save: Alpine.store('i18n').t('save'),
                    cancel: Alpine.store('i18n').t('cancel')
                }
            };
        },

        // عرض النافذة المنبثقة لتغيير الحالة
        async showStatusModal(config) {
            const html = this.generateStatusHtml(config);

            return await Swal.fire({
                title: config.title,
                html: html,
                width: '600px',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: config.texts.save,
                cancelButtonText: config.texts.cancel,
                didOpen: () => this.initializeStatusModalEvents(),
                preConfirm: () => this.validateStatusForm()
            });
        },

        // توليد HTML للنموذج
        generateStatusHtml(config) {
            const statusOptions = config.statusOptions.map(option =>
                `<option value="${option.value}" ${config.currentStatus === option.value ? 'selected' : ''}>
            ${option.label}
        </option>`
            ).join('');

            return `
        <div class="status-modal">
            <div class="mb-6">
                <label class="block mb-3 font-semibold text-gray-700">${config.texts.selectStatus}</label>
                <select id="statusSelect" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                    ${statusOptions}
                </select>
            </div>
            <div id="rejectionReasonsSection" class="hidden transition-all duration-300">
                <label class="block mb-3 font-semibold text-gray-700">${config.texts.rejectionReasons}</label>
                <div id="rejectionReasonsContainer" class="space-y-3 mb-4">
                    <div class="flex items-center gap-3 reason-item">
                        <input type="text" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rejection-reason-input" 
                               placeholder="${config.texts.writeReasonHere}">
                        <button type="button" class="remove-reason-btn hidden w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                            ×
                        </button>
                    </div>
                </div>
                <button type="button" id="addReasonBtn" class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                    + ${config.texts.addNewReason}
                </button>
            </div>
        </div>
    `;
        },

        // تهيئة الأحداث في النافذة المنبثقة
        initializeStatusModalEvents() {
            const statusSelect = document.getElementById('statusSelect');
            const rejectionSection = document.getElementById('rejectionReasonsSection');
            const reasonsContainer = document.getElementById('rejectionReasonsContainer');
            const addReasonBtn = document.getElementById('addReasonBtn');

            // تبديل قسم أسباب الرفض
            const toggleRejectionSection = () => {
                const isRejected = statusSelect.value === 'rejected';
                rejectionSection.classList.toggle('hidden', !isRejected);

                if (isRejected) {
                    rejectionSection.classList.add('fade-in');
                }
            };

            addReasonBtn.addEventListener('click', () => {
                this.addNewReasonField(reasonsContainer);
            });

            reasonsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-reason-btn')) {
                    this.removeReasonField(e.target.closest('.reason-item'));
                }
            });

            statusSelect.addEventListener('change', toggleRejectionSection);
            toggleRejectionSection();
        },

        addNewReasonField(container) {
            const reasonItem = document.createElement('div');
            reasonItem.className = 'flex items-center gap-3 reason-item fade-in';
            reasonItem.innerHTML = `
        <input type="text" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rejection-reason-input" 
               placeholder="${Alpine.store('i18n').t('write_reason_here')}">
        <button type="button" class="remove-reason-btn w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            ×
        </button>
    `;

            container.appendChild(reasonItem);

            this.toggleRemoveButtons(container);
        },

        removeReasonField(reasonItem) {
            reasonItem.classList.add('fade-out');
            setTimeout(() => {
                reasonItem.remove();
                this.toggleRemoveButtons(document.getElementById('rejectionReasonsContainer'));
            }, 300);
        },

        toggleRemoveButtons(container) {
            const reasonItems = container.querySelectorAll('.reason-item');
            const removeButtons = container.querySelectorAll('.remove-reason-btn');

            const shouldShowRemove = reasonItems.length > 1;

            removeButtons.forEach(btn => {
                btn.classList.toggle('hidden', !shouldShowRemove);
            });
        },

        validateStatusForm() {
            const statusSelect = document.getElementById('statusSelect');
            const selectedStatus = statusSelect.value;

            const result = {
                status: selectedStatus,
                rejection_reasons: []
            };

            if (selectedStatus === 'rejected') {
                const reasonInputs = document.querySelectorAll('.rejection-reason-input');
                reasonInputs.forEach(input => {
                    const value = input.value.trim();
                    if (value) {
                        result.rejection_reasons.push(value);
                    }
                });

                if (result.rejection_reasons.length === 0) {
                    Swal.showValidationMessage(Alpine.store('i18n').t('please_enter_rejection_reasons'));
                    return false;
                }
            }

            return result;
        },

        async updateCarStatus(carId, data) {
            loadingIndicator.show();

            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error(Alpine.store('i18n').t('auth_token_missing'));
            }

            const apiUrl = `${this.apiBaseUrl}/api/admin/cars/update_car_status/${carId}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`${Alpine.store('i18n').t('failed_update_status')}: ${errorText}`);
            }

            const responseData = await response.json();

            if (responseData.status) {
                coloredToast('success', Alpine.store('i18n').t('status_updated_successfully'));
                await this.fetchCars(this.currentPage);
            } else {
                throw new Error(responseData.message || Alpine.store('i18n').t('failed_update_status'));
            }
        },

        handleStatusError(error) {
            console.error('Error changing car status:', error);

            const errorMessage = error.message || Alpine.store('i18n').t('unexpected_error');
            coloredToast('danger', errorMessage);
        },

        async showCarDetails(carId) {
            try {
                loadingIndicator.show();

                const car = this.tableData.find(c => c.id == carId);
                if (!car) {
                    throw new Error(Alpine.store('i18n').t('car_not_found'));
                }

                let imagesHtml = '';
                if (car.car_image && car.car_image.length > 0) {
                    imagesHtml = `
                        <div class="mt-6">
                            <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('images')}</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                ${car.car_image.map(img => `
                                    <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                        <img src="${img.image}" alt="Car Image" 
                                             class="h-48 w-full object-cover transition-transform hover:scale-105"
                                             loading="lazy">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                const ownerInfoHtml = car.owner ? `
                    <div class="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                        <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('owner_info')}</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('name')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${car.owner.name || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('email')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${car.owner.email || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('phone')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${car.owner.phone || 'N/A'}</span>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('country')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${car.owner.country || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('has_license')}:</span>
                                    <span class="font-medium ${car.owner.has_license === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                        ${car.owner.has_license === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('is_company')}:</span>
                                    <span class="font-medium ${car.owner.is_company === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                        ${car.owner.is_company === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : '';

                const additionalFeaturesHtml = car.additional_features && Array.isArray(car.additional_features) && car.additional_features.length > 0 ? `
                    <div class="mt-6 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
                        <h4 class="mb-3 text-lg font-semibold text-indigo-800 dark:text-indigo-300">${Alpine.store('i18n').t('additional_features')}</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            ${car.additional_features.map(feature => `
                                <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                    <div class="text-sm text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                                        ${Alpine.store('i18n').t(feature) || feature.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                    <div class="text-base font-semibold text-green-600">
                                        ${Alpine.store('i18n').t('yes')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '';

                const licenseImageHtml = car.image_license ? `
                    <div class="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <h4 class="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-300">${Alpine.store('i18n').t('license_image')}</h4>
                        <div class="flex justify-center">
                            <img src="${car.image_license}" 
                                 alt="License Image" 
                                 class="max-w-xs h-48 object-contain rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                                 onclick="this.classList.toggle('max-w-xs'); this.classList.toggle('max-w-full');"
                                 loading="lazy">
                        </div>
                    </div>
                ` : '';

                let mapHtml = '';
                const lat = parseFloat(car.lat);
                const lng = parseFloat(car.lang);
                if (!isNaN(lat) && !isNaN(lng)) {
                    mapHtml = `
                        <div class="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                            <h4 class="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">${Alpine.store('i18n').t('location')}</h4>
                            <div class="mb-2 text-green-700 dark:text-green-200">
                                ${Alpine.store('i18n').t('latitude')}: ${lat.toFixed(6)}, ${Alpine.store('i18n').t('longitude')}: ${lng.toFixed(6)}
                            </div>
                            <div id="map-${car.id}" class="h-64 w-full rounded-lg border border-gray-200 dark:border-gray-700">
                                <div id="map-loading-${car.id}" class="flex items-center justify-center h-full">
                                    ${Alpine.store('i18n').t('loading_map')}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    mapHtml = `
                        <div class="mt-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                            <h4 class="mb-3 text-lg font-semibold text-red-800 dark:text-red-300">${Alpine.store('i18n').t('location')}</h4>
                            <div class="text-red-700 dark:text-red-200">
                                ${Alpine.store('i18n').t('invalid_coordinates')}: ${Alpine.store('i18n').t('latitude')}: ${car.lat || 'N/A'}, ${Alpine.store('i18n').t('longitude')}: ${car.lang || 'N/A'}
                            </div>
                        </div>
                    `;
                }

                let returnMapHtml = '';
                const latReturn = parseFloat(car.lat_return);
                const lngReturn = parseFloat(car.lang_return);
                if (!isNaN(latReturn) && !isNaN(lngReturn)) {
                    returnMapHtml = `
                        <div class="mt-6 rounded-lg bg-teal-50 p-4 dark:bg-teal-900/20">
                            <h4 class="mb-3 text-lg font-semibold text-teal-800 dark:text-teal-300">${Alpine.store('i18n').t('return_location')}</h4>
                            <div class="mb-2 text-teal-700 dark:text-teal-200">
                                ${Alpine.store('i18n').t('latitude')}: ${latReturn.toFixed(6)}, 
                                ${Alpine.store('i18n').t('longitude')}: ${lngReturn.toFixed(6)}, 
                                ${Alpine.store('i18n').t('address_return')}: ${car.address_return || 'N/A'}
                            </div>
                            <div id="return-map-${car.id}" class="h-64 w-full rounded-lg border border-gray-200 dark:border-gray-700">
                                <div id="return-map-loading-${car.id}" class="flex items-center justify-center h-full">
                                    ${Alpine.store('i18n').t('loading_map')}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    returnMapHtml = `
                        <div class="mt-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                            <h4 class="mb-3 text-lg font-semibold text-red-800 dark:text-red-300">${Alpine.store('i18n').t('return_location')}</h4>
                            <div class="text-red-700 dark:text-red-200">
                                ${Alpine.store('i18n').t('invalid_coordinates')}: 
                                ${Alpine.store('i18n').t('latitude')}: ${car.lat_return || 'N/A'}, 
                                ${Alpine.store('i18n').t('longitude')}: ${car.lang_return || 'N/A'}, 
                                ${Alpine.store('i18n').t('address_return')}: ${car.address_return || 'N/A'}
                            </div>
                        </div>
                    `;
                }

                const dynamicFeaturesHtml = car.cars_features ? `
                    <div class="mt-6 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
                        <h4 class="mb-3 text-lg font-semibold text-indigo-800 dark:text-indigo-300">${Alpine.store('i18n').t('additional_features')}</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${Object.entries(car.cars_features)
                        .filter(([key, value]) => {
                            const excludedKeys = ['id', 'cars_id', 'created_at', 'updated_at'];
                            return !excludedKeys.includes(key) &&
                                value !== null &&
                                value !== '' &&
                                value !== undefined;
                        })
                        .map(([key, value]) => {
                            let displayValue = value;
                            let valueClass = 'text-indigo-900 dark:text-white';

                            if (typeof value === 'boolean') {
                                displayValue = value ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no');
                                valueClass = value ? 'text-green-600' : 'text-red-600';
                            }
                            else if (value === 1 || value === '1') {
                                displayValue = Alpine.store('i18n').t('yes');
                                valueClass = 'text-green-600';
                            }
                            else if (value === 0 || value === '0') {
                                displayValue = Alpine.store('i18n').t('no');
                                valueClass = 'text-red-600';
                            }

                            return `
                                <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                    <div class="text-sm text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                                        ${Alpine.store('i18n').t(key) || key.replace(/_/g, ' ')}
                                    </div>
                                    <div class="text-base font-semibold ${valueClass}">
                                        ${displayValue}
                                    </div>
                                </div>
                            `;
                        })
                        .join('')}
                    </div>
                    </div>
                ` : '';

                const detailsHtml = `
                    <div class="space-y-6 text-base">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                <h4 class="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-300">${Alpine.store('i18n').t('basic_info')}</h4>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('make')}:</span>
                                        <span class="font-medium text-blue-900 dark:text-white text-base">${car.make || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('model')}:</span>
                                        <span class="font-medium text-blue-900 dark:text-white text-base">${car.model ? car.model.name : 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('year')}:</span>
                                        <span class="font-medium text-blue-900 dark:text-white text-base">${car.years?.year || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('vin')}:</span>
                                        <span class="font-medium text-blue-900 dark:text-white text-base">${car.vin || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('number')}:</span>
                                        <span class="font-medium text-blue-900 dark:text-white text-base">${car.number || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <h4 class="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">${Alpine.store('i18n').t('pricing_info')}</h4>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('price')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${this.formatPrice(car.price)}/${Alpine.store('i18n').t('day')}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('min_day_trip')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${car.min_day_trip || 'N/A'} ${Alpine.store('i18n').t('days')}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('max_day_trip')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${car.max_day_trip || 'N/A'} ${Alpine.store('i18n').t('days')}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('advanced_notice')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${car.advanced_notice || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                            <h4 class="mb-3 text-lg font-semibold text-purple-800 dark:text-purple-300">${Alpine.store('i18n').t('additional_info')}</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div class="flex justify-between mb-2">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('number_license')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">${car.number_license || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between mb-2">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('state')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">${car.state || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between mb-2">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('description_condition')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">${car.description_condition || 'N/A'}</span>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex justify-between mb-2">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('day')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">${car.day || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between mb-2">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('address')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">${car.address || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between mb-2">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('status')}:</span>
                                        <span class="font-medium ${car.status === 'active' ? 'text-green-600' : car.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'} text-base">${Alpine.store('i18n').t(car.status)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-3">
                                <p class="text-sm text-purple-700 dark:text-purple-200 mb-1">${Alpine.store('i18n').t('description')}:</p>
                                <p class="text-purple-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded-md border border-purple-200 dark:border-purple-700 text-base">${car.description || 'N/A'}</p>
                            </div>
                        </div>
                        ${dynamicFeaturesHtml}
                        ${additionalFeaturesHtml}
                        ${licenseImageHtml}
                        ${mapHtml}
                        ${returnMapHtml}
                        ${ownerInfoHtml}
                        ${imagesHtml}
                    </div>
                `;

                document.getElementById('carDetailsContent').innerHTML = detailsHtml;
                document.getElementById('carDetailsModal').classList.remove('hidden');

                if (!isNaN(lat) && !isNaN(lng)) {
                    loadGoogleMapsAPI(() => {
                        this.initMap(car.id, lat, lng);
                    });
                } else {
                    console.warn('Invalid coordinates for car ID:', car.id, { lat: car.lat, lng: car.lang });
                    coloredToast('warning', Alpine.store('i18n').t('invalid_coordinates'));
                }

                if (!isNaN(latReturn) && !isNaN(lngReturn)) {
                    loadGoogleMapsAPI(() => {
                        this.initReturnMap(car.id, latReturn, lngReturn);
                    });
                } else {
                    console.warn('Invalid return coordinates for car ID:', car.id, { lat_return: car.lat_return, lng_return: car.lang_return });
                    coloredToast('warning', Alpine.store('i18n').t('invalid_coordinates'));
                }
            } catch (error) {
                console.error('Error in showCarDetails:', error);
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_car_details') + ': ' + error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        initMap(carId, lat, lng) {
            const mapElement = document.getElementById(`map-${carId}`);
            if (!mapElement) {
                console.warn('Map element not found for ID:', `map-${carId}`);
                return;
            }

            const mapLoading = document.getElementById(`map-loading-${carId}`);
            if (mapLoading) mapLoading.style.display = 'none';

            const map = new google.maps.Map(mapElement, {
                zoom: 15,
                center: { lat, lng },
                mapTypeControl: false,
                streetViewControl: false
            });

            new google.maps.Marker({
                position: { lat, lng },
                map: map,
                title: Alpine.store('i18n').t('car_location'),
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(40, 40)
                }
            });

            setTimeout(() => {
                google.maps.event.trigger(map, 'resize');
                map.setCenter({ lat, lng });
            }, 500);
        },

        initReturnMap(carId, lat, lng) {
            const mapElement = document.getElementById(`return-map-${carId}`);
            if (!mapElement) {
                console.warn('Return map element not found for ID:', `return-map-${carId}`);
                return;
            }

            const mapLoading = document.getElementById(`return-map-loading-${carId}`);
            if (mapLoading) mapLoading.style.display = 'none';

            const map = new google.maps.Map(mapElement, {
                zoom: 15,
                center: { lat, lng },
                mapTypeControl: false,
                streetViewControl: false
            });

            new google.maps.Marker({
                position: { lat, lng },
                map: map,
                title: Alpine.store('i18n').t('return_location'),
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new google.maps.Size(40, 40)
                }
            });

            setTimeout(() => {
                google.maps.event.trigger(map, 'resize');
                map.setCenter({ lat, lng });
            }, 500);
        },

        async editFeatures(carId) {
            try {
                const car = this.tableData.find(c => c.id == carId);
                if (!car) {
                    throw new Error(Alpine.store('i18n').t('car_not_found'));
                }

                const features = car.cars_features || {};
                const excludedKeys = ['id', 'cars_id', 'created_at', 'updated_at', 'additional_features'];

                const featureFields = Object.entries(features)
                    .filter(([key]) => !excludedKeys.includes(key))
                    .map(([key, value]) => {
                        const translatedLabel = Alpine.store('i18n').t(key) || key.replace(/_/g, ' ');
                        return `
                    <div class="flex items-center gap-3 mb-3 feature-item">
                        <label class="block mb-1 w-1/3 font-medium text-gray-700">${translatedLabel}</label>
                        <input type="text" 
                               id="${key}" 
                               class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                               placeholder="${translatedLabel}"
                               value="${value || ''}">
                    </div>
                `;
                    })
                    .join('');

                // معالجة الميزات الإضافية - فك تشفير JSON string
                const getAdditionalFeaturesArray = (features) => {
                    if (!features.additional_features) return [];

                    try {
                        // إذا كانت سلسلة JSON
                        if (typeof features.additional_features === 'string' && features.additional_features.startsWith('[')) {
                            return JSON.parse(features.additional_features);
                        }
                        // إذا كانت مصفوفة بالفعل
                        else if (Array.isArray(features.additional_features)) {
                            return features.additional_features;
                        }
                        // إذا كانت سلسلة عادية مفصولة بفواصل
                        else if (typeof features.additional_features === 'string') {
                            return features.additional_features.split(',').map(f => f.trim()).filter(f => f.length > 0);
                        }
                    } catch (error) {
                        console.error('Error parsing additional_features:', error);
                    }

                    return [];
                };

                const additionalFeaturesArray = getAdditionalFeaturesArray(features);

                const additionalFeaturesHtml = `
            <div class="mt-6">
                <label class="block mb-3 font-medium text-gray-700">${Alpine.store('i18n').t('additional_features')}</label>
                <div id="additionalFeaturesContainer" class="space-y-2 mb-3">
                    ${additionalFeaturesArray.map(feature => `
                        <div class="flex items-center gap-3 additional-feature-item">
                            <input type="text" 
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 additional-feature-input" 
                                   placeholder="${Alpine.store('i18n').t('enter_feature')}"
                                   value="${feature}">
                            <button type="button" class="remove-additional-feature-btn w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                ×
                            </button>
                        </div>
                    `).join('')}
                    ${additionalFeaturesArray.length === 0 ? `
                        <div class="flex items-center gap-3 additional-feature-item">
                            <input type="text" 
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 additional-feature-input" 
                                   placeholder="${Alpine.store('i18n').t('enter_feature')}">
                            <button type="button" class="remove-additional-feature-btn w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors hidden">
                                ×
                            </button>
                        </div>
                    ` : ''}
                </div>
                <button type="button" id="addAdditionalFeatureBtn" class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                    + ${Alpine.store('i18n').t('add_new_feature')}
                </button>
            </div>
        `;

                const { value: formValues } = await Swal.fire({
                    title: Alpine.store('i18n').t('edit_features'),
                    html: `
                <div class="text-right max-h-96 overflow-y-auto">
                    <div class="mb-6">
                        ${featureFields}
                    </div>
                    ${additionalFeaturesHtml}
                </div>
            `,
                    width: '700px',
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('save'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                    didOpen: () => {
                        this.initializeFeaturesEvents();
                    },
                    preConfirm: () => {
                        return this.validateFeaturesForm(features);
                    }
                });

                if (formValues) {
                    await this.updateCarFeatures(carId, formValues);
                }
            } catch (error) {
                this.handleFeaturesError(error);
            } finally {
                loadingIndicator.hide();
            }
        },

        validateFeaturesForm(originalFeatures) {
            const formData = {};
            const excludedKeys = ['id', 'cars_id', 'created_at', 'updated_at'];

            // معالجة الحقول الأساسية
            Object.keys(originalFeatures)
                .filter(key => !excludedKeys.includes(key) && key !== 'additional_features')
                .forEach(key => {
                    const inputElement = document.getElementById(key);
                    if (inputElement) {
                        let inputValue = inputElement.value;

                        // تحويل الأنواع الخاصة
                        if (key === 'all_have_seatbelts') {
                            inputValue = parseInt(inputValue) || 0;
                        } else if (key === 'num_of_door' || key === 'num_of_seat') {
                            inputValue = inputValue ? parseInt(inputValue) : null;
                        }

                        formData[key] = inputValue;
                    }
                });

            // معالجة الميزات الإضافية
            const additionalInputs = document.querySelectorAll('.additional-feature-input');
            const additionalFeatures = [];

            additionalInputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    additionalFeatures.push(value);
                }
            });

            // إرسال الميزات الإضافية كـ array
            formData.additional_features = additionalFeatures;

            return formData;
        },

        async updateCarFeatures(carId, data) {
            loadingIndicator.show();

            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error(Alpine.store('i18n').t('auth_token_missing'));
            }

            // تحضير البيانات بشكل صحيح
            const requestData = {
                features: data
            };

            console.log('Sending features data:', requestData);

            const response = await fetch(`${this.apiBaseUrl}/api/updateCarFeatures/${carId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`${Alpine.store('i18n').t('failed_update_car')}: ${errorText}`);
            }

            const result = await response.json();

            if (response.ok && result.status) {
                coloredToast('success', Alpine.store('i18n').t('car_updated_successfully'));
                await this.fetchCars(this.currentPage);
            } else {
                throw new Error(result.message || Alpine.store('i18n').t('failed_update_car'));
            }
        },
        initializeFeaturesEvents() {
            const addBtn = document.getElementById('addAdditionalFeatureBtn');
            const container = document.getElementById('additionalFeaturesContainer');

            if (addBtn && container) {
                addBtn.addEventListener('click', () => {
                    this.addAdditionalFeatureField(container);
                });

                container.addEventListener('click', (e) => {
                    if (e.target.classList.contains('remove-additional-feature-btn')) {
                        this.removeAdditionalFeatureField(e.target.closest('.additional-feature-item'));
                    }
                });

                this.toggleAdditionalFeatureRemoveButtons(container);
            }
        },

        addAdditionalFeatureField(container) {
            const featureItem = document.createElement('div');
            featureItem.className = 'flex items-center gap-3 additional-feature-item fade-in';
            featureItem.innerHTML = `
        <input type="text" 
               class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 additional-feature-input" 
               placeholder="${Alpine.store('i18n').t('enter_feature')}">
        <button type="button" class="remove-additional-feature-btn w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            ×
        </button>
    `;

            container.appendChild(featureItem);
            this.toggleAdditionalFeatureRemoveButtons(container);
        }, removeAdditionalFeatureField(featureItem) {
            featureItem.classList.add('fade-out');
            setTimeout(() => {
                featureItem.remove();
                this.toggleAdditionalFeatureRemoveButtons(document.getElementById('additionalFeaturesContainer'));
            }, 300);
        },

        toggleAdditionalFeatureRemoveButtons(container) {
            const featureItems = container.querySelectorAll('.additional-feature-item');
            const removeButtons = container.querySelectorAll('.remove-additional-feature-btn');

            const shouldShowRemove = featureItems.length > 1;

            removeButtons.forEach(btn => {
                btn.classList.toggle('hidden', !shouldShowRemove);
            });
        },

        async deleteCar(carId) {
            try {
                const result = await Swal.fire({
                    title: Alpine.store('i18n').t('confirm_delete'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel')
                });

                if (result.isConfirmed) {
                    loadingIndicator.show();
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/deleteCar/${carId}`, {
                        method: 'DELETE',
                        headers: {
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        }
                    });

                    const data = await response.json();
                    if (response.ok) {
                        coloredToast('success', Alpine.store('i18n').t('car_deleted_successfully'));
                        await this.fetchCars(this.currentPage);
                    } else {
                        throw new Error(data.message || Alpine.store('i18n').t('failed_delete_car'));
                    }
                }
            } catch (error) {
                console.error('Error in deleteCar:', error);
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        showSuccess(message) {
            Swal.fire({
                icon: 'success',
                title: Alpine.store('i18n').t('success'),
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message
            });
        }
    }));
});
