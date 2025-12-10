document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
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
        _initialized: false,

        async initComponent() {
            if (this._initialized) return;
            this._initialized = true;

            loadGoogleMapsAPI(() => { });

            if (!this._listenersAttached) {
                document.addEventListener('click', (e) => {
                    if (e.target.closest('.view-car-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const btn = e.target.closest('.view-car-btn');
                        const bookingId = btn.dataset.id;
                        if (bookingId) {
                            window.location.href = '/renter/BookingDetails.html?id=' + bookingId;
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

                if (data.status && data.data && Array.isArray(data.data)) {
                    this.tableData = data.data || [];
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

                    if (!this.tableData || this.tableData.length === 0) {
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

            if (firstImage) {
                if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
                }
                else if (firstImage.startsWith('assets/')) {
                    firstImage = '/' + firstImage;
                }
                else if (firstImage.startsWith('./')) {
                    firstImage = '/' + firstImage.substring(2);
                }
                else {
                    firstImage = '/' + firstImage;
                }
            }

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


        getActionButtons(bookingId, status, isPaid) {
            return `
                <div class="flex items-center gap-2">
                    <button class="btn btn-sm btn-outline-info view-car-btn" data-id="${bookingId}" title="${Alpine.store('i18n').t('view_details')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button class="btn btn-sm ${isPaid === '1' ? 'btn-outline-success' : 'btn-outline-danger'} change-payment-btn" data-id="${bookingId}" title="${Alpine.store('i18n').t('change_payment')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </button>
                </div>`;
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
