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
                console.log(data.data);

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
                <div class="flex items-center gap-1 justify-center">
                    <button class="btn view-car-btn btn-primary btn-sm rounded-md px-3 py-1" data-id="${carId}">
                        ${Alpine.store('i18n').t('view_details')}
                    </button>
                    <button class="btn edit-features-btn btn-warning btn-sm rounded-md px-3 py-1" data-id="${carId}">
                        ${Alpine.store('i18n').t('edit_features')}
                    </button>
                    <button class="btn change-status-btn btn-info btn-sm rounded-md px-3 py-1" data-id="${carId}">
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

                let statusHtml = `
                    <div class="text-right max-h-96 overflow-y-auto">
                        <div class="mb-4">
                            <label class="block mb-2 font-medium">${Alpine.store('i18n').t('select_status')}</label>
                            <select id="statusSelect" class="swal2-input w-full">
                                <option value="active" ${car.status === 'active' ? 'selected' : ''}>${Alpine.store('i18n').t('active')}</option>
                                <option value="inactive" ${car.status === 'inactive' ? 'selected' : ''}>${Alpine.store('i18n').t('inactive')}</option>
                                <option value="rejected" ${car.status === 'rejected' ? 'selected' : ''}>${Alpine.store('i18n').t('rejected')}</option>
                            </select>
                        </div>
                        <div id="rejectionReasonsSection" class="hidden">
                            <label class="block mb-2 font-medium">${Alpine.store('i18n').t('rejection_reasons')}</label>
                            <div id="rejectionReasonsContainer" class="space-y-2 mb-3">
                                <div class="flex items-center gap-2 reason-item">
                                    <input type="text" class="swal2-input flex-1 rejection-reason-input" placeholder="${Alpine.store('i18n').t('write_reason_here')}">
                                    <button type="button" class="btn btn-danger btn-sm remove-reason-btn hidden">×</button>
                                </div>
                            </div>
                            <button type="button" id="addReasonBtn" class="btn btn-secondary btn-sm w-full">
                                + ${Alpine.store('i18n').t('add_new_reason')}
                            </button>
                        </div>
                    </div>
                `;

                const result = await Swal.fire({
                    title: Alpine.store('i18n').t('change_status'),
                    html: statusHtml,
                    width: '600px',
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('save'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                    didOpen: () => {
                        const statusSelect = document.getElementById('statusSelect');
                        const rejectionSection = document.getElementById('rejectionReasonsSection');
                        const reasonsContainer = document.getElementById('rejectionReasonsContainer');
                        const addReasonBtn = document.getElementById('addReasonBtn');

                        const toggleRejectionSection = () => {
                            if (statusSelect.value === 'rejected') {
                                rejectionSection.classList.remove('hidden');
                            } else {
                                rejectionSection.classList.add('hidden');
                            }
                        };

                        addReasonBtn.addEventListener('click', () => {
                            const newReasonItem = document.createElement('div');
                            newReasonItem.className = 'flex items-center gap-2 reason-item';
                            newReasonItem.innerHTML = `
                                <input type="text" class="swal2-input flex-1 rejection-reason-input" placeholder="${Alpine.store('i18n').t('write_reason_here')}">
                                <button type="button" class="btn btn-danger btn-sm remove-reason-btn">×</button>
                            `;
                            reasonsContainer.appendChild(newReasonItem);

                            newReasonItem.querySelector('.remove-reason-btn').addEventListener('click', function () {
                                newReasonItem.remove();
                            });
                        });

                        toggleRejectionSection();
                        statusSelect.addEventListener('change', toggleRejectionSection);
                    },
                    preConfirm: () => {
                        const statusSelect = document.getElementById('statusSelect');
                        const selectedStatus = statusSelect.value;

                        let rejectionReasons = [];

                        if (selectedStatus === 'rejected') {
                            const reasonInputs = document.querySelectorAll('.rejection-reason-input');
                            reasonInputs.forEach(input => {
                                if (input.value.trim()) {
                                    rejectionReasons.push(input.value.trim());
                                }
                            });

                            if (rejectionReasons.length === 0) {
                                Swal.showValidationMessage(Alpine.store('i18n').t('please_enter_rejection_reasons'));
                                return false;
                            }
                        }

                        return {
                            status: selectedStatus,
                            rejection_reasons: rejectionReasons
                        };
                    }
                });

                if (result.isConfirmed && result.value) {
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
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(result.value)
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
                }
            } catch (error) {
                console.error('Error changing status:', error);
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
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
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('phone')}:</label>
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
                        ${licenseImageHtml}
                        ${mapHtml}
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
                            <div class="mb-1">
                                <label class="block mb-1 w-full">${translatedLabel}</label>
                                <input id="${key}" class="swal2-input w-full" 
                                       placeholder="${translatedLabel}"
                                       value="${value || ''}">
                            </div>
                        `;
                    })
                    .join('');

                const { value: formValues } = await Swal.fire({
                    title: Alpine.store('i18n').t('edit_features'),
                    html: `
                        <div class="text-right max-h-96 overflow-y-auto">
                            ${featureFields}
                        </div>
                    `,
                    width: '600px',
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('save'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                    preConfirm: () => {
                        const formData = {};
                        Object.keys(features)
                            .filter(key => !excludedKeys.includes(key))
                            .forEach(key => {
                                const inputElement = document.getElementById(key);
                                if (inputElement) {
                                    let inputValue = inputElement.value;
                                    if (key === 'all_have_seatbelts') {
                                        inputValue = parseInt(inputValue) || 0;
                                    } else if (key === 'num_of_door' || key === 'num_of_seat') {
                                        inputValue = inputValue ? parseInt(inputValue) : null;
                                    }
                                    formData[key] = inputValue;
                                }
                            });
                        return formData;
                    }
                });

                if (formValues) {
                    loadingIndicator.show();
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/updateCarFeatures/${carId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            features: formValues
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        coloredToast('success', Alpine.store('i18n').t('car_updated_successfully'));
                        await this.fetchCars(this.currentPage);
                    } else {
                        throw new Error(result.message || Alpine.store('i18n').t('failed_update_car'));
                    }
                }
            } catch (error) {
                console.error('Error in editFeatures:', error);
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
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
