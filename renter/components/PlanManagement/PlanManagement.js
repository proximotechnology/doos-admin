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

    Alpine.store('planTable', {
        refreshTable: async function (page = 1) {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="multipleTable"]'));
            if (tableComponent && tableComponent.fetchPlans) {
                await tableComponent.fetchPlans(page);
            }
        }
    });

    Alpine.data('multipleTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,

        async init() {
            await this.fetchPlans(1);

            // Event Delegation for Delete Buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const planId = e.target.closest('.delete-btn').dataset.id;
                    this.deletePlan(planId);
                }
                if (e.target.closest('.update-btn')) {
                    const planId = e.target.closest('.update-btn').dataset.id;
                    this.updatePlan(planId);
                }
                if (e.target.closest('.toggle-active-btn')) {
                    const planId = e.target.closest('.toggle-active-btn').dataset.id;
                    const isActive = e.target.closest('.toggle-active-btn').dataset.active === '1';
                    this.toggleActive(planId, isActive);
                }
                // Pagination event handling
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchPlans(page);
                }
            });
        },

        async fetchPlans(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication token is missing. Please log in.');
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getPlans(page);
                this.tableData = data.data || [];
                this.paginationMeta = data.meta || {};

                if (!this.tableData || this.tableData.length === 0) {
                    loadingIndicator.showEmptyState();
                } else {
                    this.populateTable();
                    loadingIndicator.hideTableLoader();
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        populateTable() {
            if (this.datatable1) {
                this.datatable1.destroy();
            }

            const mappedData = this.tableData.map((plan, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(plan.name),
                this.formatText(plan.price),
                this.formatText(plan.car_limite),
                this.formatText(plan.count_day),
                this.formatActiveStatus(plan.is_active),
                this.getActionButtons(plan.id, plan.name, plan.price, plan.car_limite, plan.count_day, plan.is_active)
            ]);

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        '#',
                        Alpine.store('i18n').t('name'),
                        Alpine.store('i18n').t('price'),
                        Alpine.store('i18n').t('car_limit'),
                        Alpine.store('i18n').t('days_count'),
                        Alpine.store('i18n').t('status'),
                        '<div class="text-center">' + Alpine.store('i18n').t('actions') + '</div>'
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: this.paginationMeta.per_page,
                perPageSelect: [10, 20, 30, 50, 100],
                columns: [{ select: 0, sort: 'asc' }],
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
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary" data-page="${this.paginationMeta.current_page - 1}">
                    ${Alpine.store('i18n').t('previous')}
                </button>`;
            }

            const startPage = Math.max(1, this.paginationMeta.current_page - 2);
            const endPage = Math.min(this.paginationMeta.last_page, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary' : 'btn-outline-primary'}" data-page="${i}">
                    ${i}
                </button>`;
            }

            if (this.paginationMeta.current_page < this.paginationMeta.last_page) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary" data-page="${this.paginationMeta.current_page + 1}">
                    ${Alpine.store('i18n').t('next')}
                </button>`;
            }

            paginationHTML += '</nav></div>';
            return paginationHTML;
        },

        formatText(text) {
            if (!text) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            return `<span class="text-sm font-normal text-gray-900 dark:text-white">${String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
        },
        formatActiveStatus(isActive) {
            if (isActive == 1) {
                return `<span class="badge badge-success">${Alpine.store('i18n').t('active')}</span>`;
            } else {
                return `<span class="badge badge-danger">${Alpine.store('i18n').t('inactive')}</span>`;
            }
        },

        getActionButtons(planId, name, price, car_limite, count_day, isActive) {
            return `
                <div class="flex items-center gap-1">
                    <button class="update-btn table-action-btn btn btn-warning btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" 
                            data-id="${planId}"
                            data-name="${name}"
                            data-price="${price}"
                            data-car_limite="${car_limite}"
                            data-count_day="${count_day}"
                            title="${Alpine.store('i18n').t('update')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('update')}</span>
                    </button>
                    <button class="toggle-active-btn table-action-btn btn btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90 ${isActive == 1 ? 'btn-danger' : 'btn-success'}" 
                            data-id="${planId}"
                            data-active="${isActive}"
                            title="${isActive == 1 ? Alpine.store('i18n').t('deactivate') : Alpine.store('i18n').t('activate')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            ${isActive == 1 
                                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'
                                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
                            }
                        </svg>
                        <span class="text-xs">${isActive == 1 ? Alpine.store('i18n').t('deactivate') : Alpine.store('i18n').t('activate')}</span>
                    </button>
                </div>`;
        },


        async toggleActive(planId, isActive) {
            try {
                loadingIndicator.show();

                const updateData = {
                    is_active: isActive ? 0 : 1,
                };

                const result = await ApiService.updatePlan(planId, updateData);

                coloredToast('success', Alpine.store('i18n').t('plan_status_changed'));
                await this.fetchPlans();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_toggle'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async updatePlan(planId) {
            const btn = document.querySelector(`.update-btn[data-id="${planId}"]`);
            Alpine.store('global').sharedData.name = btn.dataset.name;
            Alpine.store('global').sharedData.price = btn.dataset.price;
            Alpine.store('global').sharedData.car_limite = btn.dataset.car_limite;
            Alpine.store('global').sharedData.count_day = btn.dataset.count_day;

            const updateConfirmed = await new Promise((resolve) => {
                Alpine.store('planUpdateModal').openModal(planId, () => {
                    resolve(true);
                });
            });

            if (!updateConfirmed) return;

            try {
                loadingIndicator.show();

                const updateData = {
                    name: Alpine.store('global').sharedData.name,
                    price: parseFloat(Alpine.store('global').sharedData.price),
                    car_limite: parseInt(Alpine.store('global').sharedData.car_limite),
                    count_day: parseInt(Alpine.store('global').sharedData.count_day),
                };

                await ApiService.updatePlan(planId, updateData);
                coloredToast('success', Alpine.store('i18n').t('plan_updated_success'));
                await this.fetchPlans();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update'));
            } finally {
                loadingIndicator.hide();
            }
        },


        async deletePlan(planId) {
            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(planId, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();
                await ApiService.deletePlan(planId);
                coloredToast('success', Alpine.store('i18n').t('plan_deleted_success'));

                await this.fetchPlans();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_delete'));
            } finally {
                loadingIndicator.hide();
            }
        },

        getPaginationIcon(type) {
            const icons = {
                first: '<svg...></svg>',
                last: '<svg...></svg>',
                prev: '<svg...></svg>',
                next: '<svg...></svg>',
            };
            return icons[type];
        },

        showSuccess(message) {
            alert(message);
        },

        showError(message) {
            alert(message);
        },
    }));

    Alpine.data('Add_Plan', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        name: '',
        price: '',
        car_limite: '',
        count_day: '',
        isSubmitting: false,

        async Add_Plan() {
            try {
                this.isSubmitting = true;
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_missing'));

                if (!this.name || this.name.trim() === '') {
                    throw new Error(Alpine.store('i18n').t('plan_name_empty'));
                }

                const formData = new FormData();
                formData.append('name', this.name.trim());
                formData.append('price', this.price);
                formData.append('car_limite', this.car_limite);
                formData.append('count_day', this.count_day);

                await ApiService.addPlan(formData);

                // Reset form
                this.name = '';
                this.price = '';
                this.car_limite = '';
                this.count_day = '';

                coloredToast('success', Alpine.store('i18n').t('plan_added_success'));

                // Refresh plans list
                await Alpine.store('planTable').refreshTable();


            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_add'));
            } finally {
                this.isSubmitting = false;
                loadingIndicator.hide();
            }
        },
    }));

    coloredToast = (color, message) => {
        const toast = window.Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            animation: false,
            customClass: {
                popup: `color-${color}`,
            },
        });
        toast.fire({
            title: message,
        });
    };
});
