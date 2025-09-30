document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        },
        showTableLoader: function () {
            document.getElementById('tableLoading')?.classList.remove('hidden');
            document.getElementById('testimonialTable')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('testimonialTable')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('testimonialTable')?.classList.add('hidden');
            document.getElementById('tableLoading')?.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const toast = Swal.mixin({
            toast: true,
            position: 'bottom-start',
            icon: color === 'success' ? 'success' : 'error',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: { popup: `color-${color}` },
        });
        toast.fire();
    }

    Alpine.store('testimonialTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="testimonialTable"]'));
            if (tableComponent && tableComponent.fetchTestimonials) {
                await tableComponent.fetchTestimonials(1);
            }
        }
    });

    Alpine.data('testimonialTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            name: '',
            rating: ''
        },

        async init() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const testimonialId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteTestimonial(testimonialId);
                }
                if (e.target.closest('.update-btn')) {
                    const testimonialId = e.target.closest('.update-btn').dataset.id;
                    this.updateTestimonial(testimonialId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchTestimonials(page);
                }
            });
            await this.fetchTestimonials();
        },

        async fetchTestimonials(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const queryParams = new URLSearchParams({ page, per_page: 15 });
                if (this.filters.name) queryParams.append('name', this.filters.name);
                if (this.filters.rating) queryParams.append('rating', this.filters.rating);


                const response = await fetch(`${this.apiBaseUrl}/api/admin/testimonial/filter?${queryParams.toString()}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                if (data.status && data.data) {
                    this.tableData = data.data.data || [];
                    this.paginationMeta = {
                        current_page: data.data.current_page,
                        last_page: data.data.last_page,
                        per_page: data.data.per_page,
                        total: data.data.total,
                        from: data.data.from,
                        to: data.data.to,
                        links: data.data.links
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
                console.error('Error fetching testimonials:', error);
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_testimonials'));
            }
        },

        applyFilters() {
            this.fetchTestimonials(1);
        },

        resetFilters() {
            this.filters.name = '';
            this.filters.rating = '';

            this.fetchTestimonials(1);
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((testimonial, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatName(testimonial.name, testimonial.image, index),
                this.formatText(testimonial.rating),
                this.formatText(testimonial.comment),
                this.getActionButtons(testimonial.id, testimonial.name, testimonial.image, testimonial.rating, testimonial.comment),
            ]);

            this.datatable = new simpleDatatables.DataTable('#testimonialTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
                        Alpine.store('i18n').t('rating'),
                        Alpine.store('i18n').t('comment'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: false,
                perPage: 15,
                perPageSelect: false,
                columns: [
                    { select: 0, sort: 'asc' },
                    { select: [1], render: (data) => data } // Allow HTML rendering for name column
                ],
                firstLast: true,
                firstText: this.getPaginationIcon('first'),
                lastText: this.getPaginationIcon('last'),
                prevText: this.getPaginationIcon('prev'),
                nextText: this.getPaginationIcon('next'),
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: this.generatePaginationHTML() + '{info}{pager}',
                },
            });
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

        formatName(name, imageUrl, index) {
            const defaultImage = '/assets/images/avatar-testimonial.webp';
            const cleanUrl = imageUrl && imageUrl !== 'null' && imageUrl !== '' ? imageUrl : defaultImage;

            return `
                <div class="flex items-center w-max">
                    <img class="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                         src="${cleanUrl}"
                         alt="${name || Alpine.store('i18n').t('unknown')}"
                         onerror="this.src='${defaultImage}';"
                         loading="lazy"
                         width="36"
                         height="36" />
                    <span>${name || Alpine.store('i18n').t('unknown')}</span>
                </div>`;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(testimonialId, name, image, rating, comment) {
            return `
                <div class="flex items-center gap-1">
                    <button class="btn update-btn btn-warning bg-yellow-500 text-white rounded-md px-3 py-1 hover:bg-yellow-600" 
                            data-id="${testimonialId}" 
                            data-name="${name}" 
                            data-image="${image || ''}" 
                            data-rating="${rating || ''}" 
                            data-comment="${comment || ''}">
                        ${Alpine.store('i18n').t('update')}
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn rounded-md px-3 py-1 hover:bg-red-600" data-id="${testimonialId}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path opacity="0.5" d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M18.8334 8.5L18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path opacity="0.5" d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path opacity="0.5" d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>`;
        },

        async updateTestimonial(testimonialId) {
            const testimonial = this.tableData.find((t) => t.id == testimonialId);
            if (!testimonial) {
                coloredToast('danger', Alpine.store('i18n').t('testimonial_not_found'));
                return;
            }

            Alpine.store('global').sharedData.name = testimonial.name || '';
            Alpine.store('global').sharedData.comment = testimonial.comment || '';
            Alpine.store('global').sharedData.rating = testimonial.rating || '';
            Alpine.store('global').sharedData.image = testimonial.image || '';

            Alpine.store('updateModal').openModal(testimonialId);
        },

        async deleteTestimonial(testimonialId) {

            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(testimonialId, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/testimonial/delete/${testimonialId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_delete_testimonial'));
                }

                coloredToast('success', Alpine.store('i18n').t('delete_testimonial_successful'));
                await this.fetchTestimonials(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_delete_testimonial'));
            } finally {
                loadingIndicator.hide();
            }
        },

        getPaginationIcon(type) {
            const icons = {
                first: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                last: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prev: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                next: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
            };
            return icons[type];
        }
    }));

    Alpine.data('Add_Testimonial', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        name: '',
        comment: '',
        rating: '',
        image: null,

        async addTestimonial() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                if (!this.name.trim() || !this.comment.trim() || !this.rating || !this.$refs.image.files[0]) {
                    throw new Error(Alpine.store('i18n').t('all_fields_required'));
                }

                const formData = new FormData();
                formData.append('name', this.name);
                formData.append('comment', this.comment);
                formData.append('rating', this.rating);
                formData.append('image', this.$refs.image.files[0]);

                const response = await fetch(`${this.apiBaseUrl}/api/admin/testimonial/store`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const result = await response.json();
                if (!response.ok) {
                    const errorMsg =
                        result.message ||
                        Object.values(result.errors || {})
                            .flat()
                            .join(', ') ||
                        Alpine.store('i18n').t('failed_to_add_testimonial');
                    throw new Error(errorMsg);
                }

                this.name = '';
                this.comment = '';
                this.rating = '';
                this.$refs.image.value = '';
                coloredToast('success', Alpine.store('i18n').t('add_testimonial_successful'));
                await Alpine.store('testimonialTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_add_testimonial'));
            } finally {
                loadingIndicator.hide();
            }
        }
    }));
});
