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
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
        },

    };

    Alpine.data('subscriptionsTable', () => ({
        subscriptions: {},
        currentFilter: 'pending',
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        users: [],
        plans: [],
        filters: {
            status: '',
            user_id: '',
            plan_id: '',
            start_date: '',
            end_date: '',
        },

        async init() {
                        await this.fetchSubscriptions();

            await this.fetchUsers();
            await this.fetchPlans();
        },
        async fetchUsers() {
            try {

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/user/get_all?per_page=999`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_to_fetch_users'));
                const data = await response.json();
                
                this.users = data.data.data.filter((u) => u.type === '0');
            } catch (error) {
                coloredToast('error', error.message);
            }
        },
        async fetchPlans() {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/index`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_to_fetch_plans'));
                const data = await response.json();
                this.plans = data.data;
            } catch (error) {
                coloredToast('error', error.message);
            }
        },
        async fetchSubscriptions() {
            try {
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('error', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const filters = {};
                if (this.filters.status) filters.status = this.filters.status;
                if (this.filters.user_id) filters.user_id = this.filters.user_id;
                if (this.filters.plan_id) filters.plan_id = this.filters.plan_id;
                if (this.filters.start_date) filters.start_date = this.filters.start_date;
                if (this.filters.end_date) filters.end_date = this.filters.end_date;

                const data = await ApiService.getSubscriptions(this.currentPage, filters);
                this.subscriptions = data.data;

                loadingIndicator.hideTableLoader();
            } catch (error) {
                coloredToast('error', error.message || Alpine.store('i18n').t('failed_to_fetch_subscriptions'));
            }
        },
        changeFilter(filter) {
            this.currentFilter = filter;
            this.currentPage = 1;
            this.fetchSubscriptions();
        },

        nextPage() {
            if (this.currentPage < this.subscriptions.last_page) {
                this.currentPage++;
                this.fetchSubscriptions();
            }
        },

        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.fetchSubscriptions();
            }
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('not_available');
            const date = new Date(dateString);
            return date.toLocaleDateString();
        },

        async markAsPaid(subscriptionId) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('approve_subscription_confirm'),
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_approve'),
                });

                if (!isConfirmed.isConfirmed) return;

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/subscribe/mark_as_paid/${subscriptionId}`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_to_approve_subscription'));
                }

                await this.fetchSubscriptions();
                Swal.fire(Alpine.store('i18n').t('approved'),
                    Alpine.store('i18n').t('subscription_approved_success'), 'success');
            } catch (error) {
                Swal.fire(
                    Alpine.store('i18n').t('error'),
                    error.message || Alpine.store('i18n').t('failed_to_approve_subscription'),
                    'error'
                );
            }
        },
    }));
});
