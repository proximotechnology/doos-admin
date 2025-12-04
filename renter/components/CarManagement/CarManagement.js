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
        perPage: 10,
        perPageOptions: [10, 20, 50, 100],
        filters: {
            status: '',
            brand_car_id: '',
            model_car_id: '',
            year_from: '',
            year_to: '',
            min_price: '',
            max_price: ''
        },
        brands: [],
        models: [],
        allModels: [],
        _initialized: false,

        async initComponent() {
            if (this._initialized) return;
            this._initialized = true;

            loadGoogleMapsAPI(() => { });

            // Check if car ID is in URL - redirect to details page
            const urlParams = new URLSearchParams(window.location.search);
            const carIdFromUrl = urlParams.get('carId') || urlParams.get('id');
            if (carIdFromUrl) {
                window.location.href = `CarDetails.html?id=${carIdFromUrl}`;
                return;
            }

            // Fetch brands and models for filters
            await this.fetchBrands();
            await this.fetchAllModels();

            document.addEventListener('click', (e) => {
                if (e.target.closest('.view-car-btn')) {
                    const carId = e.target.closest('.view-car-btn').dataset.id;
                    // Navigate to car details page
                    window.location.href = `CarDetails.html?id=${carId}`;
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

        async fetchBrands() {
            try {
                const data = await ApiService.getBrands(1, { per_page: 1000 });
                if (data.success && data.data && data.data.data) {
                    this.brands = data.data.data;
                }
            } catch (error) {
                console.error('Error fetching brands:', error);
            }
        },

        async fetchAllModels() {
            try {
                const data = await ApiService.getModels(1, { per_page: 1000 });
                if (data.success && data.data && data.data.data) {
                    this.allModels = data.data.data;
                    this.models = this.allModels;
                }
            } catch (error) {
                console.error('Error fetching models:', error);
            }
        },

        filterModelsByBrand() {
            if (this.filters.brand_car_id) {
                this.models = this.allModels.filter(model => 
                    model.brand_car_id == this.filters.brand_car_id
                );
                // Reset model filter if selected model doesn't belong to selected brand
                const selectedModel = this.models.find(m => m.id == this.filters.model_car_id);
                if (!selectedModel) {
                    this.filters.model_car_id = '';
                }
            } else {
                this.models = this.allModels;
            }
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
                    ...this.filters,
                    per_page: this.perPage
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
                brand_car_id: '',
                model_car_id: '',
                year_from: '',
                year_to: '',
                min_price: '',
                max_price: ''
            };
            this.models = this.allModels;
            this.applyFilters();
        },

        hasActiveFilters() {
            return !!(this.filters.status || this.filters.brand_car_id || this.filters.model_car_id || 
                     this.filters.year_from || this.filters.year_to || this.filters.min_price || this.filters.max_price);
        },

        changePerPage() {
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
                    perPage: this.tableData.length, // Show all data (we handle pagination server-side)
                    perPageSelect: false,
                    paging: false, // Disable SimpleDatatables pagination
                    columns: [{ select: 0, sort: 'asc' }],
                    firstLast: true,
                    firstText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                    lastText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                    prevText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                    nextText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
                    labels: { perPage: '{select}' },
                    layout: {
                        top: '{search}',
                        bottom: this.generatePaginationHTML() + '{info}',
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

        formatAnswerTime(timeAnswer) {
            if (!timeAnswer && timeAnswer !== 0) return Alpine.store('i18n').t('na');
            const time = parseFloat(timeAnswer);
            if (isNaN(time)) return Alpine.store('i18n').t('na');
            
            if (time === 0) {
                return `<span class="badge bg-gray-500 text-white">${Alpine.store('i18n').t('no_limit') || 'No Limit'}</span>`;
            }
            
            // Format as hours or days
            if (time < 24) {
                return `<span class="text-sm font-medium text-gray-700 dark:text-gray-300">${time} ${time === 1 ? (Alpine.store('i18n').t('hour') || 'Hour') : (Alpine.store('i18n').t('hours') || 'Hours')}</span>`;
            } else {
                const days = Math.floor(time / 24);
                return `<span class="text-sm font-medium text-gray-700 dark:text-gray-300">${days} ${days === 1 ? (Alpine.store('i18n').t('day') || 'Day') : (Alpine.store('i18n').t('days') || 'Days')}</span>`;
            }
        },

        formatAnswerTimeForDetails(timeAnswer) {
            if (!timeAnswer && timeAnswer !== 0) return 'N/A';
            const time = parseFloat(timeAnswer);
            if (isNaN(time)) return 'N/A';
            
            if (time === 0) {
                return Alpine.store('i18n').t('no_limit') || 'No Limit';
            }
            
            // Format as hours or days
            if (time < 24) {
                return `${time} ${time === 1 ? (Alpine.store('i18n').t('hour') || 'Hour') : (Alpine.store('i18n').t('hours') || 'Hours')}`;
            } else {
                const days = Math.floor(time / 24);
                return `${days} ${days === 1 ? (Alpine.store('i18n').t('day') || 'Day') : (Alpine.store('i18n').t('days') || 'Days')}`;
            }
        },

        formatDiscountInfo(discountInfo) {
            if (!discountInfo || !discountInfo.has_discount) {
                return '';
            }

            const discountAmount = discountInfo.discount_amount || 0;
            const discountType = discountInfo.discount_type || 'fixed';
            const originalPrice = discountInfo.original_price || 0;
            const finalPrice = discountInfo.final_price || 0;
            
            const discountText = discountType === 'percentage' 
                ? `${discountAmount}%`
                : `${discountAmount} ${Alpine.store('i18n').t('currency') || 'AED'}`;

            return `
                <div class="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                    <div class="flex items-center gap-2 mb-3">
                        <svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 class="text-lg font-bold text-green-900 dark:text-green-100">${Alpine.store('i18n').t('discount_info') || 'Discount Information'}</h4>
                    </div>
                    <div class="space-y-3">
                        <div class="p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">${Alpine.store('i18n').t('original_price') || 'Original Price'}</p>
                            <p class="text-base font-semibold text-gray-900 dark:text-white">${parseFloat(originalPrice).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'AED'}</p>
                        </div>
                        <div class="p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">${Alpine.store('i18n').t('discount') || 'Discount'}</p>
                            <p class="text-base font-semibold text-green-600 dark:text-green-400">-${discountText}</p>
                        </div>
                        <div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border-2 border-green-300 dark:border-green-700">
                            <p class="text-xs font-medium text-green-700 dark:text-green-300 uppercase mb-1">${Alpine.store('i18n').t('final_price') || 'Final Price'}</p>
                            <p class="text-xl font-bold text-green-900 dark:text-green-100">${parseFloat(finalPrice).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'AED'}</p>
                        </div>
                    </div>
                </div>
            `;
        },

        formatAnswerTimeInfo(timeAnswer) {
            if (!timeAnswer && timeAnswer !== 0) {
                return '';
            }

            const time = parseFloat(timeAnswer);
            if (isNaN(time)) {
                return '';
            }

            let timeText = '';
            if (time === 0) {
                timeText = Alpine.store('i18n').t('no_limit') || 'No Limit';
            } else if (time < 24) {
                timeText = `${time} ${time === 1 ? (Alpine.store('i18n').t('hour') || 'Hour') : (Alpine.store('i18n').t('hours') || 'Hours')}`;
            } else {
                const days = Math.floor(time / 24);
                timeText = `${days} ${days === 1 ? (Alpine.store('i18n').t('day') || 'Day') : (Alpine.store('i18n').t('days') || 'Days')}`;
            }

            return `
                <div class="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                    <div class="flex items-center gap-2 mb-3">
                        <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 class="text-lg font-bold text-blue-900 dark:text-blue-100">${Alpine.store('i18n').t('answer_time') || 'Answer Time'}</h4>
                    </div>
                    <div class="p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <p class="text-base font-semibold text-blue-900 dark:text-blue-100">${timeText}</p>
                    </div>
                </div>
            `;
        },

        getActionButtons(carId) {
            return `
                <div class="flex items-center gap-2">
                    <button class="btn btn-sm btn-outline-info view-car-btn" data-id="${carId}" title="${Alpine.store('i18n').t('view_details')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <a href="UpdateCar.html?id=${carId}" class="btn btn-sm btn-outline-primary" title="${Alpine.store('i18n').t('update_car') || 'Update Car'}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </a>
                    <button class="btn btn-sm btn-outline-warning edit-features-btn" data-id="${carId}" title="${Alpine.store('i18n').t('edit_features')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary change-status-btn" data-id="${carId}" title="${Alpine.store('i18n').t('change_status')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-car-btn" data-id="${carId}" title="${Alpine.store('i18n').t('delete_car')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
