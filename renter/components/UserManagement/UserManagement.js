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
            document.getElementById('tableContent').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
        },
        showContent: function () {
            document.getElementById('tableContent').classList.remove('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('tableContent').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
        }
    };

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

    Alpine.data('usersTable', () => ({
        users: [],
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        get filteredUsers() {
            return this.users.filter((user) => user.type === '0');
        },

        async init() {
            await this.fetchUsers();
        },

        async fetchUsers() {
            try {
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('error', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'renter/auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/user/get_all`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_fetch_users'));
                }

                const data = await response.json();
                this.users = data.user || [];

                // إخفاء اللودر وإظهار المحتوى المناسب
                loadingIndicator.hideTableLoader();
                if (this.filteredUsers.length > 0) {
                    loadingIndicator.showContent();
                } else {
                    loadingIndicator.showEmptyState();
                }
            } catch (error) {
                coloredToast('error', error.message || Alpine.store('i18n').t('failed_fetch_users_try_again'));
                loadingIndicator.showEmptyState();
            }
        },

        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString();
        },

        async deleteUser(userId) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('delete_warning'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_delete'),
                });

                if (!isConfirmed.isConfirmed) return;

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/user/delete/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_delete_user'));
                }

                await this.fetchUsers();
                Swal.fire(Alpine.store('i18n').t('deleted'), Alpine.store('i18n').t('user_deleted_success'), 'success');
            } catch (error) {
                Swal.fire(Alpine.store('i18n').t('error'), error.message || Alpine.store('i18n').t('failed_delete_user'), 'error');
            }
        },
    }));
});

