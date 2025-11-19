document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        },
        showTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const permissionsTableContainer = document.getElementById('permissionsTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (permissionsTableContainer) permissionsTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const permissionsTableContainer = document.getElementById('permissionsTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (permissionsTableContainer) permissionsTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const permissionsTableContainer = document.getElementById('permissionsTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (permissionsTableContainer) permissionsTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

    Alpine.data('permissionTable', () => ({
        tableData: [],
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            await this.fetchPermissions();
        },

        async fetchPermissions() {
            try {
                loadingIndicator.showTableLoader();

                const data = await ApiService.getPermissions();
                if (data.status && data.data && Array.isArray(data.data)) {
                    this.tableData = data.data || [];

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

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((permission, index) => [
                `<span class="text-sm font-medium text-gray-900 dark:text-white">${index + 1}</span>`,
                `<div class="flex items-center gap-2">
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">${this.formatText(permission.name)}</span>
                </div>`,
                `<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">${this.formatText(permission.guard_name)}</span>`,
                `<span class="text-sm text-gray-600 dark:text-gray-400">${this.formatDate(permission.created_at)}</span>`,
            ]);

            this.datatable = new simpleDatatables.DataTable('#permissionsTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('permission_name'),
                        Alpine.store('i18n').t('guard_name'),
                        Alpine.store('i18n').t('created_at'),
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPageSelect: [10, 20, 30, 50, 100],
                firstLast: true,

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
                    bottom: '{info}{select}{pager}',
                },
            });
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
        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message,
                confirmButtonText: Alpine.store('i18n').t('ok'),
                customClass: { htmlContainer: 'text-right' }
            });
        }
    }));

    function coloredToast(color, message) {
        const toast = Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: { popup: `color-${color}` },
        });
        toast.fire({ title: message });
    }
});
