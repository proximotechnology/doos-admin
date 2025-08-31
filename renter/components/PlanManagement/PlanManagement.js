document.addEventListener('alpine:init', () => {
    // دالة مساعدة لعرض وإخفاء مؤشر التحميل
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

        // جلب بيانات الخطط من API مع دعم التقسيم الصفحي
        async fetchPlans(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication token is missing. Please log in.');
                    window.location.href = 'renter/auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/index?page=${page}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                this.tableData = data.data;
                this.paginationMeta = data.meta;

                if (this.tableData.length === 0) {
                    loadingIndicator.showEmptyState();
                } else {
                    this.populateTable();
                    loadingIndicator.hideTableLoader();
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        // تعبئة الجدول بالبيانات مع إضافة التقسيم الصفحي
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

        // توليد واجهة التقسيم الصفحي
        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2">';

            // زر الصفحة السابقة
            if (this.paginationMeta.current_page > 1) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary" data-page="${this.paginationMeta.current_page - 1}">
                    ${Alpine.store('i18n').t('previous')}
                </button>`;
            }

            // أرقام الصفحات
            const startPage = Math.max(1, this.paginationMeta.current_page - 2);
            const endPage = Math.min(this.paginationMeta.last_page, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary' : 'btn-outline-primary'}" data-page="${i}">
                    ${i}
                </button>`;
            }

            // زر الصفحة التالية
            if (this.paginationMeta.current_page < this.paginationMeta.last_page) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary" data-page="${this.paginationMeta.current_page + 1}">
                    ${Alpine.store('i18n').t('next')}
                </button>`;
            }

            paginationHTML += '</nav></div>';
            return paginationHTML;
        },

        formatText(text) {
            return text || 'N/A';
        },
        formatActiveStatus(isActive) {
            return isActive == 1
                ? '<span class="badge bg-success">' + Alpine.store('i18n').t('active') + '</span>'
                : '<span class="badge bg-danger">' + Alpine.store('i18n').t('inactive') + '</span>';
        },

        // أزرار الإجراءات
        getActionButtons(planId, name, price, car_limite, count_day, isActive) {
            return `
    <div class="flex items-center  gap-1">
        <button class="btn update-btn btn-warning rounded-pill" 
                data-id="${planId}"
                data-name="${name}"
                data-price="${price}"
                data-car_limite="${car_limite}"
                data-count_day="${count_day}">
            ${Alpine.store('i18n').t('update')}
        </button>
        
        
        <button class="btn toggle-active-btn ${isActive == 1 ? 'btn-outline-warning' : 'btn-outline-success'} rounded-pill px-3" 
                data-id="${planId}"
                data-active="${isActive}"
                title="${isActive == 1 ? Alpine.store('i18n').t('deactivate') : Alpine.store('i18n').t('activate')}">
            <i class="bi ${isActive == 1 ? 'bi-x-circle' : 'bi-check-circle'} me-1"></i> 
            ${isActive == 1 ? Alpine.store('i18n').t('deactivate') : Alpine.store('i18n').t('activate')}
        </button>
    </div>`;
        },


        // تبديل حالة النشاط باستخدام نفس رابط التحديث
        async toggleActive(planId, isActive) {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    loadingIndicator.hide();
                    return;
                }

                // إرسال is_active فقط كجزء من البيانات
                const updateData = {
                    is_active: isActive ? 0 : 1,
                };

                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/update/${planId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(updateData),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                coloredToast('success', Alpine.store('i18n').t('plan_status_changed'));
                await this.fetchPlans(); // إعادة تحميل البيانات
            } catch (error) {
                console.error('Toggle active error:', error);
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
                Alpine.store('updateModal').openModal(planId, () => {
                    resolve(true);
                });
            });

            if (!updateConfirmed) return;

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    loadingIndicator.hide();
                    return;
                }

                // تحويل البيانات إلى JSON بدلاً من FormData
                const updateData = {
                    name: Alpine.store('global').sharedData.name,
                    price: parseFloat(Alpine.store('global').sharedData.price),
                    car_limite: parseInt(Alpine.store('global').sharedData.car_limite),
                    count_day: parseInt(Alpine.store('global').sharedData.count_day),
                };

                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/update/${planId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(updateData),
                });

                // تحقق من الاستجابة بشكل أدق
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result) {
                    coloredToast('success', Alpine.store('i18n').t('plan_updated_success'));
                    await this.fetchPlans(); // إعادة تحميل البيانات
                } else {
                    coloredToast('warning', result.message || 'Update completed but server returned failure');
                }
            } catch (error) {
                console.error('Update error:', error);
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update'));
            } finally {
                loadingIndicator.hide();
            }
        },


        // حذف الخطة
        async deletePlan(planId) {
            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(planId, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/delete/${planId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_to_delete'));
                coloredToast('success', Alpine.store('i18n').t('plan_deleted_success'));

                await this.fetchPlans();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_delete'));
            } finally {
                loadingIndicator.hide();
            }
        },

        // بقية الدوال المساعدة...
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

                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/store`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || Alpine.store('i18n').t('failed_to_add'));
                }

                const result = await response.json();

                // Reset form
                this.name = '';
                this.price = '';
                this.car_limite = '';
                this.count_day = '';

                coloredToast('success', Alpine.store('i18n').t('plan_added_success'));

                // Refresh plans list
                await Alpine.store('planTable').refreshTable();


            } catch (error) {
                console.error('Error adding plan:', error);
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
