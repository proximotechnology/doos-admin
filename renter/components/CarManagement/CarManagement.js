// Wait for DOM and dependencies to be ready
(function() {
    'use strict';
    
    // Wait for Alpine and API_CONFIG to be available
    function waitForDependencies(callback) {
        if (typeof Alpine !== 'undefined' && typeof API_CONFIG !== 'undefined') {
            callback();
        } else {
            setTimeout(() => waitForDependencies(callback), 50);
        }
    }
    
    // Register immediately if Alpine is already available, otherwise wait
    function registerComponent() {
        // Check if alpine:init already fired
        if (typeof Alpine !== 'undefined' && Alpine.store) {
            // Alpine is ready, register directly
            registerAlpineComponent();
        } else {
            // Wait for alpine:init event
            document.addEventListener('alpine:init', registerAlpineComponent, { once: true });
        }
    }
    
    // Safe i18n translation helper
    function t(key) {
        const i18n = Alpine.store('i18n');
        return (i18n && i18n.t) ? i18n.t(key) : key;
    }
    
    function registerAlpineComponent() {
            const loadingIndicator = {
                show: function () {
                    const el = document.getElementById('loadingIndicator');
                    if (el) el.classList.remove('hidden');
                },
                hide: function () {
                    const el = document.getElementById('loadingIndicator');
                    if (el) el.classList.add('hidden');
                },
                showTableLoader: function () {
                    const tableLoading = document.getElementById('tableLoading');
                    const myTable1Container = document.getElementById('myTable1Container');
                    const tableEmptyState = document.getElementById('tableEmptyState');
                    if (tableLoading) tableLoading.classList.remove('hidden');
                    if (myTable1Container) myTable1Container.style.display = 'none';
                    if (tableEmptyState) tableEmptyState.classList.add('hidden');
                },
                hideTableLoader: function () {
                    const tableLoading = document.getElementById('tableLoading');
                    const myTable1Container = document.getElementById('myTable1Container');
                    if (tableLoading) tableLoading.classList.add('hidden');
                    if (myTable1Container) myTable1Container.style.display = 'block';
                },
                showEmptyState: function () {
                    const tableEmptyState = document.getElementById('tableEmptyState');
                    const myTable1Container = document.getElementById('myTable1Container');
                    const tableLoading = document.getElementById('tableLoading');
                    if (tableEmptyState) tableEmptyState.classList.remove('hidden');
                    if (myTable1Container) myTable1Container.style.display = 'none';
                    if (tableLoading) tableLoading.classList.add('hidden');
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
            const i18n = Alpine.store('i18n');
            const message = i18n && i18n.t ? i18n.t('failed_to_load_map') : 'Failed to load map';
            coloredToast('danger', message);
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
            year_from: '',
            year_to: '',
            min_price: '',
            max_price: ''
        },
        _initialized: false,

        async initComponent() {
            if (this._initialized) return;
            this._initialized = true;

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

            await this.$nextTick();
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

                const filters = {
                    ...this.filters
                };
                
                // Remove empty filters
                Object.keys(filters).forEach(key => {
                    if (filters[key] === '' || filters[key] === null || filters[key] === undefined) {
                        delete filters[key];
                    }
                });

                const data = await ApiService.getCars(page, filters);

                if (data.data && Array.isArray(data.data.data)) {
                    this.tableData = data.data.data || [];
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
                        total: data.data.total || (this.tableData ? this.tableData.length : 0),
                        active: (this.tableData || []).filter(car => car.status === 'active').length,
                        inactive: (this.tableData || []).filter(car => car.status === 'inactive').length,
                        rejected: (this.tableData || []).filter(car => car.status === 'rejected').length
                    };

                    if (!this.tableData || this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        await this.$nextTick();
                        setTimeout(() => {
                            this.populateTable();
                            loadingIndicator.hideTableLoader();
                        }, 100);
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.currentPage = 1;
            this.fetchCars(1);
        },

        resetFilters() {
            this.filters = {
                status: '',
                year_from: '',
                year_to: '',
                min_price: '',
                max_price: ''
            };
            this.applyFilters();
        },

        hasActiveFilters() {
            return !!(this.filters.status || this.filters.year_from || this.filters.year_to || this.filters.min_price || this.filters.max_price);
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
            const tableElement = document.getElementById('myTable1');
            if (!tableElement) {
                return;
            }

            if (this.datatable1) {
                try {
                    this.datatable1.destroy();
                } catch (e) {
                    // Ignore destroy errors
                }
            }

            const mappedData = this.tableData.map((car, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatCarInfo(car),
                this.formatText(car.years?.year || 'N/A'),
                this.formatPrice(car.price, car),
                this.formatStatus(car.status),
                this.formatDate(car.created_at),
                this.getActionButtons(car.id),
            ]);

            const DataTableLib = typeof simpleDatatables !== 'undefined' ? simpleDatatables : (typeof window !== 'undefined' && window.simpleDatatables ? window.simpleDatatables : null);
            
            if (!DataTableLib || !DataTableLib.DataTable) {
                if (tableElement) {
                    tableElement.innerHTML = this.generateSimpleTableHTML(mappedData);
                }
                return;
            }

            try {
                this.datatable1 = new DataTableLib.DataTable('#myTable1', {
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
            } catch (error) {
                console.error('Error initializing DataTable:', error);
                // Fallback: create simple table
                if (tableElement) {
                    try {
                        tableElement.innerHTML = this.generateSimpleTableHTML(mappedData);
                    } catch (innerError) {
                        console.error('Error creating fallback table:', innerError);
                    }
                }
            }
        },

        generateSimpleTableHTML(data) {
            try {
                const headings = [
                    Alpine.store('i18n').t('id'),
                    Alpine.store('i18n').t('car'),
                    Alpine.store('i18n').t('year'),
                    Alpine.store('i18n').t('price'),
                    Alpine.store('i18n').t('status'),
                    Alpine.store('i18n').t('created_at'),
                    Alpine.store('i18n').t('action')
                ];
                
                let html = '<thead><tr>';
                headings.forEach(heading => {
                    html += `<th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 border-b-2 border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">${heading}</th>`;
                });
                html += '</tr></thead><tbody>';
                
                if (data && data.length > 0) {
                    data.forEach(row => {
                        html += '<tr class="border-b border-white-light/40 hover:bg-primary/5 dark:border-[#191e3a] dark:hover:bg-[#1a2941]/50 transition-colors">';
                        row.forEach(cell => {
                            html += `<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">${cell}</td>`;
                        });
                        html += '</tr>';
                    });
                } else {
                    html += '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">لا توجد بيانات</td></tr>';
                }
                html += '</tbody>';
                
                return html;
            } catch (error) {
                console.error('Error generating simple table HTML:', error);
                return '<tbody><tr><td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Error loading table data</td></tr></tbody>';
            }
        },

        formatCarInfo(car) {
            if (!car) return Alpine.store('i18n').t('na');

            const defaultImage = '/assets/images/default-car.png';
            let firstImage = defaultImage;
            
            // Check if car_image exists and has valid data
            if (car.car_image && Array.isArray(car.car_image) && car.car_image.length > 0) {
                const imageObj = car.car_image[0];
                if (imageObj && imageObj.image) {
                    firstImage = imageObj.image;
                    // Normalize image URL
                    if (firstImage) {
                        // If it's a full URL, use it as is
                        if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
                            // Keep as is
                        }
                        // If it starts with /, use it as is
                        else if (firstImage.startsWith('/')) {
                            // Keep as is
                        }
                        // If it starts with assets/, add leading /
                        else if (firstImage.startsWith('assets/')) {
                            firstImage = '/' + firstImage;
                        }
                        // If it starts with ./ remove it
                        else if (firstImage.startsWith('./')) {
                            firstImage = '/' + firstImage.substring(2);
                        }
                        // Otherwise, add leading /
                        else {
                            firstImage = '/' + firstImage;
                        }
                    }
                }
            }

            // Clean and escape the image URL
            const cleanImage = firstImage.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const escapedMake = (car.make || 'Car').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escapedModel = car.model ? (car.model.name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

            return `
                <div class="flex items-center gap-1.5 min-w-0 max-w-[200px]">
                    <img class="w-8 h-8 rounded flex-shrink-0 object-cover border border-gray-200 dark:border-gray-700"
                        src="${cleanImage}"
                        alt="${escapedMake}"
                        onerror="this.onerror=null; this.src='${defaultImage}';"
                        loading="lazy"
                        width="32"
                        height="32"
                        style="display: block; min-width: 32px; min-height: 32px;" />
                    <span class="text-xs font-normal text-gray-900 dark:text-white truncate" style="max-width: 150px;" title="${escapedMake}${escapedModel ? ` (${escapedModel})` : ''}">${escapedMake}${escapedModel ? ` (${escapedModel})` : ''}</span>
                </div>`;
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
        },

        formatPrice(price, car = null) {
            if (!price) return Alpine.store('i18n').t('na');
            
            // Check if car has seasonal pricing - show final price only
            if (car && car.season_pricing_info && car.season_pricing_info.has_season_pricing) {
                const finalPrice = parseFloat(car.season_pricing_info.final_price || price);
                return `${finalPrice.toFixed(2)} ${Alpine.store('i18n').t('currency')}`;
            }
            
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

                const updateConfirmed = await new Promise((resolve) => {
                    Alpine.store('changeStatusModal').openModal(
                        carId,
                        car.status,
                        async (formData) => {
                            try {
                                await this.updateCarStatus(carId, formData);
                                resolve(true);
                            } catch (error) {
                                this.handleStatusError(error);
                                resolve(false);
                            }
                        }
                    );
                });
            } catch (error) {
                this.handleStatusError(error);
            }
        },


        async updateCarStatus(carId, data) {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    loadingIndicator.hide();
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                // Validate and normalize status
                if (!data || typeof data !== 'object') {
                    loadingIndicator.hide();
                    throw new Error(Alpine.store('i18n').t('invalid_status'));
                }

                const status = (data.status || '').toString().trim().toLowerCase();
                const validStatuses = ['active', 'inactive', 'rejected'];
                
                if (!status || !validStatuses.includes(status)) {
                    loadingIndicator.hide();
                    console.error('Invalid status received:', data);
                    throw new Error(Alpine.store('i18n').t('invalid_status'));
                }

                // Prepare data for API - only send rejection_reasons if status is rejected
                const apiData = {
                    status: status
                };
                
                if (status === 'rejected' && data.rejection_reasons && Array.isArray(data.rejection_reasons) && data.rejection_reasons.length > 0) {
                    apiData.rejection_reasons = data.rejection_reasons;
                }

                console.log('Sending status update:', apiData);
                const responseData = await ApiService.updateCarStatus(carId, apiData);

                if (responseData.status) {
                    coloredToast('success', Alpine.store('i18n').t('status_updated_successfully'));
                    await this.fetchCars(this.currentPage);
                } else {
                    const errorMessage = responseData.message || responseData.error || Alpine.store('i18n').t('failed_update_status');
                    throw new Error(errorMessage);
                }
            } catch (error) {
                console.error('Error updating car status:', error);
                // Extract error message from API response if available
                let errorMessage = error.message;
                if (error.response || error.data) {
                    const apiError = error.response || error.data;
                    if (apiError.message) {
                        errorMessage = apiError.message;
                    } else if (apiError.error) {
                        errorMessage = apiError.error;
                    }
                }
                throw new Error(errorMessage);
            } finally {
                loadingIndicator.hide();
            }
        },

        handleStatusError(error) {
            const errorMessage = error.message || Alpine.store('i18n').t('unexpected_error');
            coloredToast('danger', errorMessage);
        },

        handleFeaturesError(error) {
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

                // Get main car image
                const mainImage = car.car_image && car.car_image.length > 0 ? car.car_image[0].image : '';

                // Build image gallery with lightbox
                let imagesHtml = '';
                if (car.car_image && car.car_image.length > 0) {
                    imagesHtml = `
                        <div class="mb-8">
                            <div class="mb-4 flex items-center gap-2">
                                <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('images')} (${car.car_image.length})</h3>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                ${car.car_image.map((img, index) => `
                                    <div class="group relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-xl hover:scale-105" onclick="this.querySelector('img').classList.toggle('scale-150'); setTimeout(() => this.querySelector('img').classList.toggle('scale-150'), 300);">
                                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 z-10"></div>
                                        <img src="${img.image}" alt="Car Image ${index + 1}" 
                                             class="h-40 w-full object-cover transition-transform duration-500"
                                             loading="lazy">
                                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <p class="text-white text-xs font-medium">${Alpine.store('i18n').t('image')} ${index + 1}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                const ownerInfoHtml = car.owner ? `
                    <div class="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border-2 border-amber-200 dark:border-amber-800 p-6 shadow-xl">
                        <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-amber-200 dark:border-amber-800">
                            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 class="text-xl font-bold text-amber-900 dark:text-amber-100">${Alpine.store('i18n').t('owner_info')}</h3>
                        </div>
                        <div class="space-y-4">
                            <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">${Alpine.store('i18n').t('name')}</p>
                                <p class="text-sm font-normal text-black dark:text-white">${car.owner.name || 'N/A'}</p>
                            </div>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">${Alpine.store('i18n').t('email')}</p>
                                    <p class="text-sm font-normal text-black dark:text-white break-all">${car.owner.email || 'N/A'}</p>
                                </div>
                                <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">${Alpine.store('i18n').t('phone')}</p>
                                    <p class="text-sm font-normal text-black dark:text-white">${car.owner.phone || 'N/A'}</p>
                                </div>
                                <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">${Alpine.store('i18n').t('country')}</p>
                                    <p class="text-sm font-normal text-black dark:text-white">${car.owner.country || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">${Alpine.store('i18n').t('has_license')}</p>
                                    <span class="badge ${car.owner.has_license === '1' ? 'bg-success' : 'bg-danger'} text-white px-3 py-1 text-sm font-semibold">
                                        ${car.owner.has_license === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                    </span>
                                </div>
                                <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">${Alpine.store('i18n').t('is_company')}</p>
                                    <span class="badge ${car.owner.is_company === '1' ? 'bg-success' : 'bg-danger'} text-white px-3 py-1 text-sm font-semibold">
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
                    <div class="rounded-xl border-2 border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-lg dark:from-blue-900/20 dark:to-blue-800/10 dark:border-blue-800/50">
                        <div class="mb-4 flex items-center gap-3">
                            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600 dark:bg-blue-500/30 dark:text-blue-400">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h4 class="text-xl font-bold text-blue-900 dark:text-blue-100">${Alpine.store('i18n').t('license_image')}</h4>
                        </div>
                        <div class="flex justify-center">
                            <div class="group relative overflow-hidden rounded-xl border-2 border-blue-200/50 shadow-md transition-all hover:scale-105 hover:shadow-xl dark:border-blue-800/50">
                                <img src="${car.image_license}" 
                                     alt="License Image" 
                                     class="max-w-xs h-64 object-contain cursor-pointer transition-transform duration-300 group-hover:scale-110"
                                     onclick="this.classList.toggle('max-w-xs'); this.classList.toggle('max-w-full');"
                                     loading="lazy">
                            </div>
                        </div>
                    </div>
                ` : '';

                let mapHtml = '';
                const lat = parseFloat(car.lat);
                const lng = parseFloat(car.lang);
                if (!isNaN(lat) && !isNaN(lng)) {
                    mapHtml = `
                        <div class="rounded-xl border-2 border-green-200/50 bg-gradient-to-br from-green-50 to-green-100/50 p-6 shadow-lg dark:from-green-900/20 dark:to-green-800/10 dark:border-green-800/50">
                            <div class="mb-4 flex items-center gap-3">
                                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20 text-green-600 dark:bg-green-500/30 dark:text-green-400">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h4 class="text-xl font-bold text-green-900 dark:text-green-100">${Alpine.store('i18n').t('location')}</h4>
                            </div>
                            <div class="mb-4 rounded-lg bg-white/60 p-3 dark:bg-gray-800/60">
                                <div class="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    <span class="font-medium">${Alpine.store('i18n').t('latitude')}: ${lat.toFixed(6)}, ${Alpine.store('i18n').t('longitude')}: ${lng.toFixed(6)}</span>
                                </div>
                            </div>
                            <div id="map-${car.id}" class="h-80 w-full rounded-xl border-2 border-green-200/50 shadow-md dark:border-green-800/50">
                                <div id="map-loading-${car.id}" class="flex h-full items-center justify-center">
                                    <div class="text-center">
                                        <div class="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-green-600 mx-auto"></div>
                                        <span class="text-sm text-green-700 dark:text-green-300">${Alpine.store('i18n').t('loading_map')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    mapHtml = `
                        <div class="rounded-xl border-2 border-red-200/50 bg-gradient-to-br from-red-50 to-red-100/50 p-6 shadow-lg dark:from-red-900/20 dark:to-red-800/10 dark:border-red-800/50">
                            <div class="mb-4 flex items-center gap-3">
                                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 class="text-xl font-bold text-red-900 dark:text-red-100">${Alpine.store('i18n').t('location')}</h4>
                            </div>
                            <div class="rounded-lg bg-white/60 p-4 dark:bg-gray-800/60">
                                <p class="text-sm font-medium text-red-700 dark:text-red-300">
                                    ${Alpine.store('i18n').t('invalid_coordinates')}: ${Alpine.store('i18n').t('latitude')}: ${car.lat || 'N/A'}, ${Alpine.store('i18n').t('longitude')}: ${car.lang || 'N/A'}
                                </p>
                            </div>
                        </div>
                    `;
                }

                let returnMapHtml = '';
                const latReturn = parseFloat(car.lat_return);
                const lngReturn = parseFloat(car.lang_return);
                if (!isNaN(latReturn) && !isNaN(lngReturn)) {
                    returnMapHtml = `
                        <div class="rounded-xl border-2 border-teal-200/50 bg-gradient-to-br from-teal-50 to-teal-100/50 p-6 shadow-lg dark:from-teal-900/20 dark:to-teal-800/10 dark:border-teal-800/50">
                            <div class="mb-4 flex items-center gap-3">
                                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-500/20 text-teal-600 dark:bg-teal-500/30 dark:text-teal-400">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                </div>
                                <h4 class="text-xl font-bold text-teal-900 dark:text-teal-100">${Alpine.store('i18n').t('return_location')}</h4>
                            </div>
                            <div class="mb-4 rounded-lg bg-white/60 p-3 dark:bg-gray-800/60">
                                <div class="space-y-2 text-sm">
                                    <div class="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        <span class="font-medium">${Alpine.store('i18n').t('latitude')}: ${latReturn.toFixed(6)}, ${Alpine.store('i18n').t('longitude')}: ${lngReturn.toFixed(6)}</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span class="font-medium">${Alpine.store('i18n').t('address_return')}: ${car.address_return || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div id="return-map-${car.id}" class="h-80 w-full rounded-xl border-2 border-teal-200/50 shadow-md dark:border-teal-800/50">
                                <div id="return-map-loading-${car.id}" class="flex h-full items-center justify-center">
                                    <div class="text-center">
                                        <div class="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600 mx-auto"></div>
                                        <span class="text-sm text-teal-700 dark:text-teal-300">${Alpine.store('i18n').t('loading_map')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    returnMapHtml = `
                        <div class="rounded-xl border-2 border-red-200/50 bg-gradient-to-br from-red-50 to-red-100/50 p-6 shadow-lg dark:from-red-900/20 dark:to-red-800/10 dark:border-red-800/50">
                            <div class="mb-4 flex items-center gap-3">
                                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 class="text-xl font-bold text-red-900 dark:text-red-100">${Alpine.store('i18n').t('return_location')}</h4>
                            </div>
                            <div class="rounded-lg bg-white/60 p-4 dark:bg-gray-800/60">
                                <p class="text-sm font-medium text-red-700 dark:text-red-300">
                                    ${Alpine.store('i18n').t('invalid_coordinates')}: ${Alpine.store('i18n').t('latitude')}: ${car.lat_return || 'N/A'}, ${Alpine.store('i18n').t('longitude')}: ${car.lang_return || 'N/A'}, ${Alpine.store('i18n').t('address_return')}: ${car.address_return || 'N/A'}
                                </p>
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

                // Hero Section with main image
                const heroSection = mainImage ? `
                    <div class="relative mb-4 overflow-hidden rounded-xl border border-primary/20 shadow-md">
                        <div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent z-10"></div>
                        <img src="${mainImage}" alt="${car.make || 'Car'}" class="h-32 w-full object-cover">
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 z-20">
                            <div class="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <h2 class="text-lg font-bold text-white mb-0.5">${car.make || 'N/A'} ${car.model ? car.model.name : ''} ${car.years?.year || ''}</h2>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="badge ${car.status === 'active' ? 'bg-success' : car.status === 'rejected' ? 'bg-danger' : 'bg-warning'} text-white px-2 py-0.5 text-xs font-semibold">${Alpine.store('i18n').t(car.status)}</span>
                                        <span class="text-white/90 text-sm font-semibold">${this.formatPrice(car.price)} <span class="text-xs">/${Alpine.store('i18n').t('day')}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : '';

                const detailsHtml = `
                    <div class="space-y-4 animate-fade-in">
                        ${heroSection}
                        
                        <!-- Quick Stats -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div class="flex items-center gap-1.5 mb-1">
                                    <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <span class="text-xs font-medium text-gray-500">${Alpine.store('i18n').t('make')}</span>
                                </div>
                                <p class="text-sm font-normal text-black dark:text-white">${car.make || 'N/A'}</p>
                            </div>
                            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div class="flex items-center gap-1.5 mb-1">
                                    <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span class="text-xs font-medium text-gray-500">${Alpine.store('i18n').t('year')}</span>
                                </div>
                                <p class="text-sm font-normal text-black dark:text-white">${car.years?.year || 'N/A'}</p>
                            </div>
                            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div class="flex items-center gap-1.5 mb-1">
                                    <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    <span class="text-xs font-medium text-gray-500">${Alpine.store('i18n').t('number')}</span>
                                </div>
                                <p class="text-sm font-normal text-black dark:text-white">${car.number || 'N/A'}</p>
                            </div>
                            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div class="flex items-center gap-1.5 mb-1">
                                    <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="text-xs font-medium text-gray-500">${Alpine.store('i18n').t('price')}</span>
                                </div>
                                <p class="text-sm font-normal text-black dark:text-white">${this.formatPrice(car.price)}</p>
                            </div>
                        </div>

                        <!-- Main Content Grid -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <!-- Left Column - Basic Info & Pricing -->
                            <div class="lg:col-span-2 space-y-4">
                                <!-- Basic Information Card -->
                                <div class="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 shadow-lg">
                                    <div class="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-200 dark:border-gray-700">
                                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('basic_info')}</h3>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('make')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.make || 'N/A'}</p>
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('model')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.model ? car.model.name : 'N/A'}</p>
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('year')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.years?.year || 'N/A'}</p>
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('vin')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white font-mono">${car.vin || 'N/A'}</p>
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('number')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.number || 'N/A'}</p>
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('number_license')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.number_license || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Pricing Information Card -->
                                <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-800 p-4 shadow-lg">
                                    <div class="flex items-center gap-2 mb-4 pb-3 border-b-2 border-green-200 dark:border-green-800">
                                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-white">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 class="text-lg font-bold text-green-900 dark:text-green-100">${Alpine.store('i18n').t('pricing_info')}</h3>
                                    </div>
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl">
                                            <span class="text-gray-700 dark:text-gray-300 font-medium">${Alpine.store('i18n').t('price')}</span>
                                            <div class="text-right">
                                                ${car.season_pricing_info && car.season_pricing_info.has_season_pricing ? `
                                                    <div class="flex flex-col items-end gap-1">
                                                        <div class="flex items-center gap-2">
                                                            <span class="text-lg font-normal text-black dark:text-white line-through text-gray-400">${parseFloat(car.season_pricing_info.original_price || car.price).toFixed(2)} ${Alpine.store('i18n').t('currency')}</span>
                                                            <span class="text-lg font-bold text-green-600 dark:text-green-400">${parseFloat(car.season_pricing_info.final_price || car.price).toFixed(2)} ${Alpine.store('i18n').t('currency')}</span>
                                                        </div>
                                                        <span class="text-xs text-gray-500">/${Alpine.store('i18n').t('day')}</span>
                                                        <span class="badge bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs px-2 py-0.5 rounded mt-1">
                                                            ${Alpine.store('i18n').t('seasonal_pricing')}
                                                        </span>
                                                    </div>
                                                ` : `
                                                    <span class="text-lg font-normal text-black dark:text-white">${this.formatPrice(car.price)} <span class="text-sm text-gray-500">/${Alpine.store('i18n').t('day')}</span></span>
                                                `}
                                            </div>
                                        </div>
                                        ${car.season_pricing_info && car.season_pricing_info.has_season_pricing ? `
                                            <div class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                                                <div class="flex items-center gap-2 mb-3">
                                                    <svg class="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <h4 class="text-sm font-bold text-orange-900 dark:text-orange-100">${Alpine.store('i18n').t('seasonal_pricing')}</h4>
                                                </div>
                                                <div class="space-y-2 text-sm">
                                                    ${car.season_pricing_info.season_pricing_data ? `
                                                        <div class="flex items-center justify-between">
                                                            <span class="text-gray-600 dark:text-gray-400">${Alpine.store('i18n').t('season_name')}:</span>
                                                            <span class="font-semibold text-gray-900 dark:text-white">${car.season_pricing_info.season_pricing_data.title || 'N/A'}</span>
                                                        </div>
                                                        <div class="flex items-center justify-between">
                                                            <span class="text-gray-600 dark:text-gray-400">${Alpine.store('i18n').t('date_range')}:</span>
                                                            <span class="font-semibold text-gray-900 dark:text-white">
                                                                ${this.formatDate(car.season_pricing_info.season_pricing_data.date_from)} - ${this.formatDate(car.season_pricing_info.season_pricing_data.date_end)}
                                                            </span>
                                                        </div>
                                                        <div class="flex items-center justify-between">
                                                            <span class="text-gray-600 dark:text-gray-400">${Alpine.store('i18n').t('increase_type')}:</span>
                                                            <span class="font-semibold text-gray-900 dark:text-white">
                                                                ${car.season_pricing_info.season_pricing_data.type === 'percentage' ? Alpine.store('i18n').t('percentage') : Alpine.store('i18n').t('fixed_amount')}
                                                            </span>
                                                        </div>
                                                        <div class="flex items-center justify-between">
                                                            <span class="text-gray-600 dark:text-gray-400">${Alpine.store('i18n').t('increase_value')}:</span>
                                                            <span class="font-semibold text-green-600 dark:text-green-400">
                                                                ${car.season_pricing_info.season_pricing_data.type === 'percentage' ? `${car.season_pricing_info.season_pricing_data.value}%` : `${car.season_pricing_info.season_pricing_data.value} ${Alpine.store('i18n').t('currency')}`}
                                                            </span>
                                                        </div>
                                                    ` : ''}
                                                    <div class="flex items-center justify-between pt-2 border-t border-orange-200 dark:border-orange-800">
                                                        <span class="text-gray-600 dark:text-gray-400 font-medium">${Alpine.store('i18n').t('price_adjustment')}:</span>
                                                        <span class="font-bold text-orange-600 dark:text-orange-400">
                                                            +${parseFloat(car.season_pricing_info.price_adjustment || 0).toFixed(2)} ${Alpine.store('i18n').t('currency')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ` : ''}
                                        <div class="grid grid-cols-2 gap-4">
                                            <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">${Alpine.store('i18n').t('min_day_trip')}</p>
                                                <p class="text-sm font-normal text-black dark:text-white">${car.min_day_trip || 'N/A'} ${Alpine.store('i18n').t('days')}</p>
                                            </div>
                                            <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">${Alpine.store('i18n').t('max_day_trip')}</p>
                                                <p class="text-sm font-normal text-black dark:text-white">${car.max_day_trip || 'N/A'} ${Alpine.store('i18n').t('days')}</p>
                                            </div>
                                        </div>
                                        <div class="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">${Alpine.store('i18n').t('advanced_notice')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.advanced_notice || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                ${imagesHtml}
                            </div>

                            <!-- Right Column - Additional Info & Owner -->
                            <div class="space-y-4">
                                <!-- Additional Information Card -->
                                <div class="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 shadow-lg">
                                    <div class="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-200 dark:border-gray-700">
                                        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('additional_info')}</h3>
                                    </div>
                                    <div class="space-y-4">
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('state')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.state || 'N/A'}</p>
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('address')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.address || 'N/A'}</p>
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${Alpine.store('i18n').t('description_condition')}</p>
                                            <p class="text-sm font-normal text-black dark:text-white">${car.description_condition || 'N/A'}</p>
                                        </div>
                                        ${car.description ? `
                                            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">${Alpine.store('i18n').t('description')}</p>
                                                <p class="text-sm text-black dark:text-white leading-relaxed">${car.description}</p>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>

                                ${ownerInfoHtml}
                            </div>
                        </div>

                        ${dynamicFeaturesHtml}
                        ${additionalFeaturesHtml}
                        ${licenseImageHtml}
                        ${mapHtml}
                        ${returnMapHtml}
                    </div>
                `;

                // Check if modal elements exist before setting innerHTML
                const carDetailsContent = document.getElementById('carDetailsContent');
                const carDetailsModal = document.getElementById('carDetailsModal');
                
                if (!carDetailsContent || !carDetailsModal) {
                    throw new Error('Car details modal elements not found in DOM');
                }
                
                carDetailsContent.innerHTML = detailsHtml;
                carDetailsModal.classList.remove('hidden');
                
                // Add click outside to close
                carDetailsModal.addEventListener('click', function(e) {
                    if (e.target === carDetailsModal) {
                        carDetailsModal.classList.add('hidden');
                    }
                });

                if (!isNaN(lat) && !isNaN(lng)) {
                    loadGoogleMapsAPI(() => {
                        this.initMap(car.id, lat, lng);
                    });
                } else {
                    coloredToast('warning', Alpine.store('i18n').t('invalid_coordinates'));
                }

                if (!isNaN(latReturn) && !isNaN(lngReturn)) {
                    loadGoogleMapsAPI(() => {
                        this.initReturnMap(car.id, latReturn, lngReturn);
                    });
                } else {
                    coloredToast('warning', Alpine.store('i18n').t('invalid_coordinates'));
                }
            } catch (error) {
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_car_details') + ': ' + error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        initMap(carId, lat, lng) {
            const mapElement = document.getElementById(`map-${carId}`);
            if (!mapElement) {
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

                const updateConfirmed = await new Promise((resolve) => {
                    Alpine.store('editFeaturesModal').openModal(
                        carId,
                        car,
                        async (formData) => {
                            try {
                                await this.updateCarFeatures(carId, formData);
                                resolve(true);
                            } catch (error) {
                                this.handleFeaturesError(error);
                                resolve(false);
                            }
                        }
                    );
                });
            } catch (error) {
                this.handleFeaturesError(error);
            }
        },

        async updateCarFeatures(carId, data) {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const result = await ApiService.updateCarFeatures(carId, data);

                if (result.status) {
                    coloredToast('success', Alpine.store('i18n').t('car_updated_successfully'));
                    await this.fetchCars(this.currentPage);
                } else {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_update_car'));
                }
            } catch (error) {
                throw error;
            } finally {
                loadingIndicator.hide();
            }
        },

        async deleteCar(carId) {
            try {
                const result = await Swal.fire({
                    title: Alpine.store('i18n').t('confirm_delete_car'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel')
                });

                if (result.isConfirmed) {
                    loadingIndicator.show();
                    await ApiService.deleteCar(carId);
                    coloredToast('success', Alpine.store('i18n').t('car_deleted_successfully'));
                    await this.fetchCars(this.currentPage);
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        showSuccess(message) {
            Swal.fire({
                icon: 'success',
                title: t('success'),
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: t('error'),
                text: message
            });
        },
        
        // Safe translation method for use in component
        t(key) {
            const i18n = Alpine.store('i18n');
            return (i18n && i18n.t) ? i18n.t(key) : key;
        }
    }));
    }
    
    waitForDependencies(() => {
        registerComponent();
    });
})();
