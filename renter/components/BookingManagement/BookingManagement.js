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
            coloredToast('danger', Alpine.store('i18n').t('failed_to_load_map'));
        };
        document.head.appendChild(script);
    }

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

    Alpine.store('bookingTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="bookingTable"]'));
            if (tableComponent && tableComponent.fetchBookings) {
                await tableComponent.fetchBookings();
            }
        }
    });

    Alpine.data('bookingTable', () => ({
        tableData: [],
        paginationMeta: {},
        meta: {
            total: 0,
            confirm: 0,
            draft: 0,
            picked_up: 0,
            Returned: 0,
            Completed: 0,
            Canceled: 0,
            pending: 0

        },
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            status: '',
            date_from: '',
            date_to: ''
        },

        async initComponent() {
            loadGoogleMapsAPI(() => { });

            // Event Delegation for buttons
            if (!this._listenersAttached) {
                document.addEventListener('click', (e) => {
                    if (e.target.closest('.view-car-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const btn = e.target.closest('.view-car-btn');
                        const bookingId = btn.dataset.id;
                        if (bookingId) {
                            this.showCarDetails(bookingId);
                        }
                    }
                if (e.target.closest('.change-status-btn')) {
                    const bookingId = e.target.closest('.change-status-btn').dataset.id;
                    this.changeStatus(bookingId);
                }
                if (e.target.closest('.change-payment-btn')) {
                    const bookingId = e.target.closest('.change-payment-btn').dataset.id;
                    this.changePaymentStatus(bookingId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchBookings(page);
                }
                });
                this._listenersAttached = true;
            }

            await this.fetchBookings(1);
        },

        applyFilters() {
            this.currentPage = 1;
            this.fetchBookings(1);
        },

        resetFilters() {
            this.filters = {
                status: '',
                date_from: '',
                date_to: ''
            };
            this.applyFilters();
        },

        hasActiveFilters() {
            return !!(this.filters.status || this.filters.date_from || this.filters.date_to);
        },

        async fetchBookings(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const filters = {};
                if (this.filters.status) filters.status = this.filters.status;
                if (this.filters.date_from) filters.date_from = this.filters.date_from;
                if (this.filters.date_to) filters.date_to = this.filters.date_to;

                const data = await ApiService.getBookings(page, filters);

                if (data.status && Array.isArray(data.data)) {
                    this.tableData = data.data;
                    this.meta = data.meta || {
                        total: 0,
                        confirm: 0,
                        draft: 0,
                        picked_up: 0,
                        Returned: 0,
                        Completed: 0,
                        Canceled: 0,
                        pending: 0
                    };
                    this.paginationMeta = data.pagination || {
                        current_page: 1,
                        last_page: 1,
                        per_page: 10,
                        total: 0,
                        from: 0,
                        to: 0,
                        links: []
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
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },


        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2">';

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

            const mappedData = this.tableData.map((booking, index) => [
                `<span class="text-sm font-medium text-gray-900 dark:text-white">${(this.currentPage - 1) * this.paginationMeta.per_page + index + 1}</span>`,
                this.formatCarInfo(booking.car),
                this.formatDate(booking.date_from),
                this.formatDate(booking.date_end),
                this.formatPrice(booking.total_price),
                this.formatPaymentMethod(booking.payment_method),
                this.formatStatus(booking.status, booking.id),
                this.formatDate(booking.created_at),
                this.getActionButtons(booking.id, booking.status, booking.is_paid),
            ]);

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('car'),
                        Alpine.store('i18n').t('date_from'),
                        Alpine.store('i18n').t('date_to'),
                        Alpine.store('i18n').t('total_price'),
                        Alpine.store('i18n').t('payment_method'),
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

        formatCarInfo(carDetails) {
            if (!carDetails) return Alpine.store('i18n').t('na');

            let firstImage = carDetails.car_image && carDetails.car_image.length > 0
                ? carDetails.car_image[0].image
                : 'assets/images/default-car.png';

            const defaultImage = '/assets/images/default-car.png';

            // Normalize image path
            if (firstImage) {
                // If it's already an absolute URL, keep it
                if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
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

            // Clean and escape the image URL
            const cleanImage = firstImage.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const escapedMake = (carDetails.make || 'Car').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escapedYear = carDetails.years?.year ? String(carDetails.years.year).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'N/A';

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
                    <span class="text-xs font-normal text-gray-900 dark:text-white truncate" style="max-width: 150px;" title="${escapedMake} (${escapedYear})">${escapedMake} (${escapedYear})</span>
                </div>`;
        },

        formatDate(dateString) {
            if (!dateString) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            const date = new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
            return `<span class="text-sm font-normal text-gray-900 dark:text-white">${date}</span>`;
        },

        formatPrice(price) {
            if (!price) return Alpine.store('i18n').t('na');
            return `<span class="text-sm font-medium text-gray-900 dark:text-white">${parseFloat(price).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'USD'}</span>`;
        },

        formatStatus(status, bookingId) {
            if (!status) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            
            // Normalize status
            if (status == "Canceled" || status == "canceled") {
                status = "canceled";
            } else if (status == "Completed" || status == "completed") {
                status = "completed";
            } else if (status == "Returned" || status == "returned") {
                status = "returned";
            } else if (status == "Picked_up" || status == "picked_up") {
                status = "picked_up";
            } else {
                status = status.toLowerCase();
            }
            
            const statusColors = {
                'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                'confirm': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                'confirmed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                'picked_up': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                'returned': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
                'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                'canceled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            };
            
            const statusClass = statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            
            return `
                <button class="change-status-btn table-action-btn inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${statusClass}" data-id="${bookingId}" title="${Alpine.store('i18n').t('change_status')}">
                    ${Alpine.store('i18n').t(status) || status}
                </button>`;
        },

        formatText(text) {
            if (!text) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            return `<span class="text-sm font-normal text-gray-900 dark:text-white">${text}</span>`;
        },

        getActionButtons(bookingId, status, isPaid) {
            return `
                <div class="flex items-center gap-1">
                    <button class="view-car-btn table-action-btn btn btn-primary btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" data-id="${bookingId}" title="${Alpine.store('i18n').t('view_details')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('view_details')}</span>
                    </button>
                    <button class="change-payment-btn table-action-btn btn ${isPaid === '1' ? 'btn-success' : 'btn-danger'} btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" data-id="${bookingId}" title="${Alpine.store('i18n').t('change_payment')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('change_payment')}</span>
                    </button>
                </div>`;
        },

        async showCarDetails(bookingId) {
            try {
                loadingIndicator.show();

                // Convert bookingId to number for comparison
                const id = parseInt(bookingId);
                const booking = this.tableData.find(b => b.id === id || b.id == id);
                
                if (!booking) {
                    throw new Error(Alpine.store('i18n').t('car_details_not_found'));
                }
                
                if (!booking.car) {
                    throw new Error(Alpine.store('i18n').t('car_details_not_found'));
                }

                const car = booking.car;
                const t = Alpine.store('i18n').t;

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

                const userInfoHtml = booking.user ? `
            <div class="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <h4 class="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-300">${Alpine.store('i18n').t('user_info')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('name')}:</span>
                            <span class="font-medium text-blue-900 dark:text-white text-base">${booking.user.name || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('email')}:</span>
                            <span class="font-medium text-blue-900 dark:text-white text-base">${booking.user.email || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('phone')}:</span>
                            <span class="font-medium text-blue-900 dark:text-white text-base">${booking.user.phone || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('type')}:</span>
                            <span class="font-medium text-blue-900 dark:text-white text-base">${this.formatUserType(booking.user.type)}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('country')}:</span>
                            <span class="font-medium text-blue-900 dark:text-white text-base">${booking.user.country || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('has_license')}:</span>
                            <span class="font-medium ${booking.user.has_license === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.user.has_license === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('has_car')}:</span>
                            <span class="font-medium ${booking.user.has_car === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.user.has_car === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('is_online')}:</span>
                            <span class="font-medium ${booking.user.is_online ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.user.is_online ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

                const ownerInfoHtml = car.owner ? `
            <div class="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <h4 class="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">${Alpine.store('i18n').t('owner_info')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('name')}:</span>
                            <span class="font-medium text-green-900 dark:text-white text-base">${car.owner.name || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('email')}:</span>
                            <span class="font-medium text-green-900 dark:text-white text-base">${car.owner.email || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('phone')}:</span>
                            <span class="font-medium text-green-900 dark:text-white text-base">${car.owner.phone || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('country')}:</span>
                            <span class="font-medium text-green-900 dark:text-white text-base">${car.owner.country || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('has_license')}:</span>
                            <span class="font-medium ${car.owner.has_license === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${car.owner.has_license === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('is_company')}:</span>
                            <span class="font-medium ${car.owner.is_company === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${car.owner.is_company === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

                // Booking Information Section
                const bookingInfoHtml = `
            <div class="mt-6 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                <h4 class="mb-3 text-lg font-semibold text-purple-800 dark:text-purple-300">${Alpine.store('i18n').t('booking_info')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('booking_status')}:</span>
                            <span class="font-medium ${this.getStatusColor(booking.status)} text-base">
                                ${this.formatBookingStatus(booking.status)}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('payment_status')}:</span>
                            <span class="font-medium ${booking.is_paid === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.is_paid === '1' ? Alpine.store('i18n').t('paid') : Alpine.store('i18n').t('not_paid')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('payment_method')}:</span>
                            <span class="font-medium text-purple-900 dark:text-white text-base">${this.formatPaymentMethod(booking.payment_method)}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('date_from')}:</span>
                            <span class="font-medium text-purple-900 dark:text-white text-base">${this.formatDate1(booking.date_from, booking.time_from)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('date_end')}:</span>
                            <span class="font-medium text-purple-900 dark:text-white text-base">${this.formatDate1(booking.date_end, booking.time_return)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('duration')}:</span>
                            <span class="font-medium text-purple-900 dark:text-white text-base">${this.calculateDuration(booking.date_from, booking.date_end)}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('with_driver')}:</span>
                            <span class="font-medium ${booking.with_driver === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.with_driver === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('has_representative')}:</span>
                            <span class="font-medium ${booking.has_representative === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.has_representative === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('repres_status')}:</span>
                            <span class="font-medium ${this.getRepresStatusColor(booking.repres_status)} text-base">
                                ${this.formatRepresStatus(booking.repres_status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

                // Pricing Information Section
                const pricingInfoHtml = `
            <div class="mt-6 rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
                <h4 class="mb-3 text-lg font-semibold text-orange-800 dark:text-orange-300">${Alpine.store('i18n').t('pricing_info')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div class="text-orange-700 dark:text-orange-200 text-sm">${Alpine.store('i18n').t('total_price')}</div>
                        <div class="text-2xl font-bold text-orange-900 dark:text-white">$${booking.total_price || '0.00'}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-orange-700 dark:text-orange-200 text-sm">${Alpine.store('i18n').t('final_price')}</div>
                        <div class="text-2xl font-bold text-orange-900 dark:text-white">$${booking.final_price || '0.00'}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-orange-700 dark:text-orange-200 text-sm">${Alpine.store('i18n').t('fee_percentage')}</div>
                        <div class="text-2xl font-bold text-orange-900 dark:text-white">$${booking.fee_percentage || '0.00'}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-orange-700 dark:text-orange-200 text-sm">${Alpine.store('i18n').t('insurance_price')}</div>
                        <div class="text-2xl font-bold text-orange-900 dark:text-white">$${booking.insurancePrice || '0.00'}</div>
                    </div>
                </div>
            </div>
        `;

                // Location Information Section
                const locationInfoHtml = `
            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
                    <h4 class="mb-3 text-lg font-semibold text-indigo-800 dark:text-indigo-300">${Alpine.store('i18n').t('pickup_location')}</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-indigo-700 dark:text-indigo-200 text-base">${Alpine.store('i18n').t('address')}:</span>
                            <span class="font-medium text-indigo-900 dark:text-white text-base">${booking.address || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-indigo-700 dark:text-indigo-200 text-base">${Alpine.store('i18n').t('latitude')}:</span>
                            <span class="font-medium text-indigo-900 dark:text-white text-base">${booking.lat || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-indigo-700 dark:text-indigo-200 text-base">${Alpine.store('i18n').t('longitude')}:</span>
                            <span class="font-medium text-indigo-900 dark:text-white text-base">${booking.lang || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-indigo-700 dark:text-indigo-200 text-base">${Alpine.store('i18n').t('pickup_time')}:</span>
                            <span class="font-medium text-indigo-900 dark:text-white text-base">${booking.time_from || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="rounded-lg bg-teal-50 p-4 dark:bg-teal-900/20">
                    <h4 class="mb-3 text-lg font-semibold text-teal-800 dark:text-teal-300">${Alpine.store('i18n').t('return_location')}</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('address_return')}:</span>
                            <span class="font-medium text-teal-900 dark:text-white text-base">${booking.address_return || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('latitude')}:</span>
                            <span class="font-medium text-teal-900 dark:text-white text-base">${booking.lat_return || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('longitude')}:</span>
                            <span class="font-medium text-teal-900 dark:text-white text-base">${booking.lang_return || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('return_time')}:</span>
                            <span class="font-medium text-teal-900 dark:text-white text-base">${booking.time_return || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

                let mapsHtml = '';
                const lat = parseFloat(booking.lat);
                const lng = parseFloat(booking.lang);
                const latReturn = parseFloat(booking.lat_return);
                const lngReturn = parseFloat(booking.lang_return);

                if (!isNaN(lat) && !isNaN(lng)) {
                    mapsHtml += `
        <div class="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <h4 class="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">${Alpine.store('i18n').t('pickup_location')} - ${Alpine.store('i18n').t('map')}</h4>
            <div class="mb-2 text-green-700 dark:text-green-200">
                ${Alpine.store('i18n').t('latitude')}: ${lat.toFixed(6)}, ${Alpine.store('i18n').t('longitude')}: ${lng.toFixed(6)}
            </div>
            <div id="map-${booking.id}" class="h-64 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <div id="map-loading-${booking.id}" class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <i class="fas fa-spinner fa-spin mr-2"></i>${Alpine.store('i18n').t('loading_map')}
                </div>
            </div>
        </div>
    `;
                }

                if (!isNaN(latReturn) && !isNaN(lngReturn)) {
                    mapsHtml += `
        <div class="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <h4 class="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-300">${Alpine.store('i18n').t('return_location')} - ${Alpine.store('i18n').t('map')}</h4>
            <div class="mb-2 text-blue-700 dark:text-blue-200">
                ${Alpine.store('i18n').t('latitude')}: ${latReturn.toFixed(6)}, ${Alpine.store('i18n').t('longitude')}: ${lngReturn.toFixed(6)}
            </div>
            <div id="return-map-${booking.id}" class="h-64 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <div id="return-map-loading-${booking.id}" class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <i class="fas fa-spinner fa-spin mr-2"></i>${Alpine.store('i18n').t('loading_map')}
                </div>
            </div>
        </div>
    `;
                }


                setTimeout(() => {
                    if (!isNaN(lat) && !isNaN(lng)) {
                        this.initMap(booking.id, lat, lng);
                    }
                    if (!isNaN(latReturn) && !isNaN(lngReturn)) {
                        this.initMap(booking.id, latReturn, lngReturn, true);
                    }
                }, 100);

                // Additional Information Section
                const additionalInfoHtml = `
            <div class="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('additional_info')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('created_at')}:</span>
                            <span class="font-medium text-gray-800 dark:text-white text-base">${this.formatDate1(booking.created_at)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('updated_at')}:</span>
                            <span class="font-medium text-gray-800 dark:text-white text-base">${this.formatDate1(booking.updated_at)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('completed_at')}:</span>
                            <span class="font-medium text-gray-800 dark:text-white text-base">${booking.completed_at ? this.formatDate1(booking.completed_at) : 'N/A'}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('is_notify')}:</span>
                            <span class="font-medium ${booking.is_notify === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.is_notify === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('is_notify_return')}:</span>
                            <span class="font-medium ${booking.is_notify_return === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.is_notify_return === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('is_cancell_picked_up')}:</span>
                            <span class="font-medium ${booking.is_cancell_picked_up === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                ${booking.is_cancell_picked_up === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

                // Hero Section with Car Image
                const heroImage = car.car_image && car.car_image.length > 0 ? car.car_image[0].image : '/assets/images/default-car.png';
                const heroHtml = `
                    <div class="relative h-32 w-full overflow-hidden rounded-t-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
                        <img src="${heroImage}" alt="${car.make || 'Car'}" 
                             class="h-full w-full object-cover opacity-30"
                             onerror="this.src='/assets/images/default-car.png';">
                        <div class="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div class="text-center">
                                <h2 class="text-lg font-bold text-white">${car.make || 'Car'} ${car.model ? `(${car.model.name || ''})` : ''}</h2>
                                <p class="text-sm text-white/80">${car.years?.year || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                `;

                // Quick Stats
                const quickStatsHtml = `
                    <div class="grid grid-cols-2 gap-2 px-4 pt-4">
                        <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                            <div class="mb-1 flex items-center gap-2">
                                <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="text-xs font-medium text-blue-600 dark:text-blue-400">${Alpine.store('i18n').t('status')}</span>
                            </div>
                            <p class="text-sm font-normal text-black dark:text-white">${this.formatBookingStatus(booking.status)}</p>
                        </div>
                        <div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                            <div class="mb-1 flex items-center gap-2">
                                <svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="text-xs font-medium text-green-600 dark:text-green-400">${Alpine.store('i18n').t('total_price')}</span>
                            </div>
                            <p class="text-sm font-normal text-black dark:text-white">${parseFloat(booking.total_price || 0).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'USD'}</p>
                        </div>
                        <div class="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                            <div class="mb-1 flex items-center gap-2">
                                <svg class="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span class="text-xs font-medium text-purple-600 dark:text-purple-400">${Alpine.store('i18n').t('date_from')}</span>
                            </div>
                            <p class="text-sm font-normal text-black dark:text-white">${this.formatDate1(booking.date_from)}</p>
                        </div>
                        <div class="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/20">
                            <div class="mb-1 flex items-center gap-2">
                                <svg class="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span class="text-xs font-medium text-indigo-600 dark:text-indigo-400">${Alpine.store('i18n').t('date_to')}</span>
                            </div>
                            <p class="text-sm font-normal text-black dark:text-white">${this.formatDate1(booking.date_end)}</p>
                        </div>
                    </div>
                `;

                // Redesign sections with cards
                const bookingInfoCard = `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('booking_info')}</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('booking_status')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${this.formatBookingStatus(booking.status)}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('payment_status')}</span>
                                <span class="text-sm font-normal ${booking.is_paid === '1' ? 'text-green-600' : 'text-red-600'}">${booking.is_paid === '1' ? Alpine.store('i18n').t('paid') : Alpine.store('i18n').t('not_paid')}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('payment_method')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${this.formatPaymentMethodText(booking.payment_method)}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('duration')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${this.calculateDuration(booking.date_from, booking.date_end)}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('with_driver')}</span>
                                <span class="text-sm font-normal ${booking.with_driver === '1' ? 'text-green-600' : 'text-red-600'}">${booking.with_driver === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}</span>
                            </div>
                        </div>
                    </div>
                `;

                const pricingCard = `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('pricing_info')}</h3>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('total_price')}</p>
                                <p class="text-sm font-normal text-black dark:text-white">${parseFloat(booking.total_price || 0).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'USD'}</p>
                            </div>
                            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('final_price')}</p>
                                <p class="text-sm font-normal text-black dark:text-white">${parseFloat(booking.final_price || 0).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'USD'}</p>
                            </div>
                            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('fee_percentage')}</p>
                                <p class="text-sm font-normal text-black dark:text-white">${parseFloat(booking.fee_percentage || 0).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'USD'}</p>
                            </div>
                            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('insurance_price')}</p>
                                <p class="text-sm font-normal text-black dark:text-white">${parseFloat(booking.insurancePrice || 0).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'USD'}</p>
                            </div>
                        </div>
                    </div>
                `;

                // Redesign user and owner info
                const userInfoCard = booking.user ? `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('user_info')}</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('name')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${booking.user.name || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('email')}</span>
                                <span class="text-sm font-normal text-black dark:text-white break-all">${booking.user.email || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('phone')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${booking.user.phone || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('country')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${booking.user.country || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                ` : '';

                const ownerInfoCard = car.owner ? `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('owner_info')}</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('name')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${car.owner.name || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('email')}</span>
                                <span class="text-sm font-normal text-black dark:text-white break-all">${car.owner.email || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('phone')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${car.owner.phone || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('country')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${car.owner.country || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                ` : '';

                // Redesign location info
                const locationCard = `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('locations')}</h3>
                        </div>
                        <div class="grid grid-cols-1 gap-4">
                            <div class="rounded-lg border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-900/20">
                                <h4 class="mb-2 text-sm font-semibold text-indigo-900 dark:text-indigo-100">${Alpine.store('i18n').t('pickup_location')}</h4>
                                <div class="space-y-1.5 text-xs">
                                    <div class="flex justify-between">
                                        <span class="text-indigo-700 dark:text-indigo-300">${Alpine.store('i18n').t('address')}:</span>
                                        <span class="font-normal text-black dark:text-white">${booking.address || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-indigo-700 dark:text-indigo-300">${Alpine.store('i18n').t('time')}:</span>
                                        <span class="font-normal text-black dark:text-white">${booking.time_from || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-lg border border-teal-100 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-900/20">
                                <h4 class="mb-2 text-sm font-semibold text-teal-900 dark:text-teal-100">${Alpine.store('i18n').t('return_location')}</h4>
                                <div class="space-y-1.5 text-xs">
                                    <div class="flex justify-between">
                                        <span class="text-teal-700 dark:text-teal-300">${Alpine.store('i18n').t('address')}:</span>
                                        <span class="font-normal text-black dark:text-white">${booking.address_return || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-teal-700 dark:text-teal-300">${Alpine.store('i18n').t('time')}:</span>
                                        <span class="font-normal text-black dark:text-white">${booking.time_return || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Redesign images section
                const imagesCard = car.car_image && car.car_image.length > 0 ? `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('images')} (${car.car_image.length})</h3>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                            ${car.car_image.map((img, index) => `
                                <div class="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                    <img src="${img.image}" alt="Car Image ${index + 1}" 
                                         class="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                         loading="lazy"
                                         onerror="this.src='/assets/images/default-car.png';">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '';

                const detailsHtml = `
                    <div class="space-y-4">
                        ${heroHtml}
                        ${quickStatsHtml}
                        <div class="grid grid-cols-1 gap-4 px-4">
                            ${bookingInfoCard}
                            ${pricingCard}
                            ${userInfoCard}
                            ${ownerInfoCard}
                            ${locationCard}
                            ${imagesCard}
                            ${mapsHtml}
                        </div>
                    </div>
                `;

                const carDetailsContent = document.getElementById('carDetailsContent');
                const carDetailsModal = document.getElementById('carDetailsModal');
                
                if (!carDetailsContent || !carDetailsModal) {
                    throw new Error('Modal elements not found');
                }

                const carDetailsContentDiv = carDetailsModal.querySelector('#carDetailsContent');
                if (carDetailsContentDiv) {
                    carDetailsContentDiv.innerHTML = detailsHtml;
                } else {
                    carDetailsContent.innerHTML = detailsHtml;
                }
                carDetailsModal.classList.remove('hidden');

                setTimeout(() => {
                    if (!isNaN(lat) && !isNaN(lng)) {
                        this.initMap('pickup', booking.id, lat, lng, booking.address || t('pickup_location'));
                    }
                    if (!isNaN(latReturn) && !isNaN(lngReturn)) {
                        this.initMap('return', booking.id, latReturn, lngReturn, booking.address_return || t('return_location'));
                    }
                }, 100);

            } catch (error) {
                coloredToast('danger', t('failed_to_load_car_details') + ': ' + error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        formatUserType(type) {
            const types = {
                '0': Alpine.store('i18n').t('individual'),
                '1': Alpine.store('i18n').t('company')
            };
            return types[type] || type;
        },

        formatBookingStatus(status) {
            const statuses = {
                'confirm': Alpine.store('i18n').t('confirmed'),
                'pending': Alpine.store('i18n').t('pending'),
                'cancelled': Alpine.store('i18n').t('cancelled'),
                'completed': Alpine.store('i18n').t('completed')
            };
            return statuses[status] || status;
        },

        getStatusColor(status) {
            const colors = {
                'confirm': 'text-green-600',
                'pending': 'text-yellow-600',
                'cancelled': 'text-red-600',
                'completed': 'text-blue-600'
            };
            return colors[status] || 'text-gray-600';
        },

        formatPaymentMethod(method) {
            if (!method) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            const methods = {
                'montypay': 'MontyPay',
                'cash': Alpine.store('i18n').t('cash'),
                'card': Alpine.store('i18n').t('card')
            };
            const methodText = methods[method] || method;
            return `<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">${methodText}</span>`;
        },

        formatPaymentMethodText(method) {
            if (!method) return Alpine.store('i18n').t('na');
            const methods = {
                'montypay': 'MontyPay',
                'cash': Alpine.store('i18n').t('cash'),
                'card': Alpine.store('i18n').t('card')
            };
            return methods[method] || method;
        },



        calculateDuration(dateFrom, dateEnd) {
            if (!dateFrom || !dateEnd) return 'N/A';
            const start = new Date(dateFrom);
            const end = new Date(dateEnd);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return `${diffDays} ${Alpine.store('i18n').t('days')}`;
        },

        formatRepresStatus(status) {
            const statuses = {
                '0': Alpine.store('i18n').t('not_assigned'),
                '1': Alpine.store('i18n').t('assigned'),
                '2': Alpine.store('i18n').t('completed')
            };
            return statuses[status] || status;
        },

        getRepresStatusColor(status) {
            const colors = {
                '0': 'text-gray-600',
                '1': 'text-blue-600',
                '2': 'text-green-600'
            };
            return colors[status] || 'text-gray-600';
        },

        formatDate1(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleString();
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

        formatDriverType(driverType) {
            if (!driverType) return 'N/A';

            const driverTypes = {
                'mail_in': 'Mail In',
                'commercial': 'Commercial',
                'personal': 'Personal'
            };

            return driverTypes[driverType] || driverType;
        },

        async changeStatus(bookingId) {
            try {
                const { value: status } = await Swal.fire({
                    title: Alpine.store('i18n').t('change_status'),
                    input: 'select',
                    inputOptions: {
                        'confirm': Alpine.store('i18n').t('confirm'),
                        'draft': Alpine.store('i18n').t('draft'),
                        'picked_up': Alpine.store('i18n').t('picked_up'),
                        'Returned': Alpine.store('i18n').t('returned'),
                        'Completed': Alpine.store('i18n').t('completed'),
                        'canceled': Alpine.store('i18n').t('canceled'),
                        'pending': Alpine.store('i18n').t('pending')

                    },
                    inputPlaceholder: Alpine.store('i18n').t('select_status'),
                    showCancelButton: true,
                    inputValidator: (value) => {
                        if (!value) {
                            return Alpine.store('i18n').t('select_status_required');
                        }
                    }
                });

                if (status) {
                    loadingIndicator.show();
                    const result = await ApiService.changeBookingStatus(bookingId, status);
                    if (result.status === 'success' || result.success) {
                        coloredToast('success', Alpine.store('i18n').t('booking_updated_successfully'));
                        await this.fetchBookings(this.currentPage);
                    } else {
                        throw new Error(result.message || Alpine.store('i18n').t('failed_update_booking'));
                    }
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async changePaymentStatus(bookingId) {
            try {
                const { value: isPaid } = await Swal.fire({
                    title: Alpine.store('i18n').t('change_payment_status'),
                    input: 'select',
                    inputOptions: {
                        '1': Alpine.store('i18n').t('paid'),
                        '0': Alpine.store('i18n').t('not_paid')
                    },
                    inputPlaceholder: Alpine.store('i18n').t('select_payment_status'),
                    showCancelButton: true,
                    inputValidator: (value) => {
                        if (value === undefined) {
                            return Alpine.store('i18n').t('select_payment_status_required');
                        }
                    }
                });

                if (isPaid !== undefined) {
                    loadingIndicator.show();
                    const result = await ApiService.changeBookingPaymentStatus(bookingId, isPaid);
                    if (result.status === 'success' || result.success) {
                        coloredToast('success', Alpine.store('i18n').t('booking_updated_successfully'));
                        await this.fetchBookings(this.currentPage);
                    } else {
                        throw new Error(result.message || Alpine.store('i18n').t('failed_update_booking'));
                    }
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
