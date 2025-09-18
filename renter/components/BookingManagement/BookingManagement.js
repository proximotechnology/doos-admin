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
            // Event Delegation for buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.view-car-btn')) {
                    const bookingId = e.target.closest('.view-car-btn').dataset.id;
                    this.showCarDetails(bookingId);
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

            await this.fetchBookings(1);
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

                // Build query string from filters
                const queryParams = new URLSearchParams({ page, per_page: 10 });
                if (this.filters.status) queryParams.append('status', this.filters.status);
                if (this.filters.date_from) queryParams.append('date_from', this.filters.date_from);
                if (this.filters.date_to) queryParams.append('date_to', this.filters.date_to);

                const url = `${this.apiBaseUrl}/api/admin/cars/booking/get_all_filter?${queryParams.toString()}`;
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
                console.error('Error fetching bookings:', error);
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.currentPage = 1; // Reset to page 1 when applying filters
            this.fetchBookings(1);
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
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatCarInfo(booking.car),
                this.formatDate(booking.date_from),
                this.formatDate(booking.date_end),
                this.formatPrice(booking.total_price),
                this.formatText(booking.payment_method),
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

            const firstImage = carDetails.car_image && carDetails.car_image.length > 0
                ? carDetails.car_image[0].image
                : 'assets/images/default-car.png';

            return `
                <div class="flex items-center w-max" x-data="{ imgError: false }">
                    <img class="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                         :src="imgError ? 'assets/images/default-car.png' : '${firstImage}'"
                         alt="${carDetails.make || 'Car'}"
                         @error="imgError = true"
                         loading="lazy"
                         width="36"
                         height="36" />
                    ${carDetails.make || 'Car'} (${carDetails.years?.year || 'N/A'})
                </div>`;
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatPrice(price) {
            if (!price) return Alpine.store('i18n').t('na');
            return `$${parseFloat(price).toFixed(2)}`;
        },

        formatStatus(status, bookingId) {
            if (status == "Canceled")
                status = "canceled"

            if (!status) return Alpine.store('i18n').t('na');
            const statusClass = `status-${status}`;
            const statusText = status.charAt(0).toUpperCase() + status.slice(1);
            return `
                <button class="change-status-btn status-badge ${statusClass} btn btn-sm rounded-md px-3 py-1 hover:opacity-80" data-id="${bookingId}">
                    ${Alpine.store('i18n').t(status)}
                </button>`;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(bookingId, status, isPaid) {
            return `
                <div class="flex items-center gap-1">
                    <button class="btn view-car-btn btn-primary btn-sm rounded-md px-3 py-1" data-id="${bookingId}">
                        ${Alpine.store('i18n').t('view_details')}
                    </button>
                    <button class="btn change-payment-btn ${isPaid === '1' ? 'btn-success' : 'btn-danger'} btn-sm rounded-md px-3 py-1" data-id="${bookingId}">
                        ${Alpine.store('i18n').t('change_payment')}
                    </button>
                </div>`;
        },

        async showCarDetails(bookingId) {
            try {
                loadingIndicator.show();

                const booking = this.tableData.find(b => b.id == bookingId);
                if (!booking || !booking.car) {
                    throw new Error(Alpine.store('i18n').t('car_details_not_found'));
                }

                const car = booking.car;

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
                                    <span class="text-green-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('email')}:</span>
                                    <span class="font-medium text-green-900 dark:text-white text-base">${car.owner.email || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-green-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('phone')}:</span>
                                    <span class="font-medium text-green-900 dark:text-white text-base">${car.owner.phone || 'N/A'}</span>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-green-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('country')}:</span>
                                    <span class="font-medium text-green-900 dark:text-white text-base">${car.owner.country || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-green-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('has_license')}:</span>
                                    <span class="font-medium ${car.owner.has_license === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                        ${car.owner.has_license === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-green-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('is_company')}:</span>
                                    <span class="font-medium ${car.owner.is_company === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                        ${car.owner.is_company === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : '';

                const additionalInfoHtml = `
                    <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                            <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('booking_info')}</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('completed_at')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${booking.completed_at ? this.formatDate(booking.completed_at) : 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('payment_status')}:</span>
                                    <span class="font-medium ${booking.is_paid === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                        ${booking.is_paid === '1' ? Alpine.store('i18n').t('paid') : Alpine.store('i18n').t('not_paid')}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('with_driver')}:</span>
                                    <span class="font-medium ${booking.with_driver === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                        ${booking.with_driver === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                    </span>
                                </div>
                                ${booking.with_driver === '1' ? `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('driver_type')}:</span>
                                        <span class="font-medium text-gray-800 dark:text-white text-base">${this.formatDriverType(booking.driver_type)}</span>
                                    </div>
                                ` : ''}
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('has_representative')}:</span>
                                    <span class="font-medium ${booking.has_representative === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                        ${booking.has_representative === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                            <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('location_info')}</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('zip_code')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${car.zip_code || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('state')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${car.state || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('address')}:</span>
                                    <span class="font-medium text-gray-800 dark:text-white text-base">${car.address || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

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
                                        <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('year')}:</span>
                                        <span class="font-medium text-blue-900 dark:text-white text-base">${car.year || 'N/A'}</span>
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
                                        <span class="font-medium text-green-900 dark:text-white text-base">$${car.price || '0.00'}/day</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('min_day_trip')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${car.min_day_trip || 'N/A'} days</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('max_day_trip')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${car.max_day_trip || 'N/A'} days</span>
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
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('day')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">${car.day || 'N/A'}</span>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex justify-between mb-2">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('description_condition')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">${car.description_condition || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-3">
                                <p class="text-sm text-purple-700 dark:text-purple-200 mb-1">${Alpine.store('i18n').t('description')}:</p>
                                <p class="text-purple-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded-md border border-purple-200 dark:border-purple-700 text-base">${car.description || 'N/A'}</p>
                            </div>
                        </div>
                        ${userInfoHtml}
                        ${ownerInfoHtml}
                        ${additionalInfoHtml}
                        ${imagesHtml}
                    </div>
                `;

                document.getElementById('carDetailsContent').innerHTML = detailsHtml;
                document.getElementById('carDetailsModal').classList.remove('hidden');

            } catch (error) {
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_car_details') + ': ' + error.message);
            } finally {
                loadingIndicator.hide();
            }
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

                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/booking/change_status_admin/${bookingId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ status })
                    });

                    const result = await response.json();

                    if (response.ok) {
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

                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/booking/change_is_paid/${bookingId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ is_paid: isPaid })
                    });

                    const result = await response.json();

                    if (response.ok) {
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
