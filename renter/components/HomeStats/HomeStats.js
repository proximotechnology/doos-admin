// Wait for DOM and dependencies to be ready
(function() {
    'use strict';
    
    // Wait for Alpine and API_CONFIG to be available
    function waitForDependencies(callback) {
        if (typeof Alpine !== 'undefined' && typeof API_CONFIG !== 'undefined' && typeof ApiService !== 'undefined') {
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
    
    function registerAlpineComponent() {
        Alpine.data('homeStats', () => ({
            isLoading: true,
            stats: {
                users: { total: 0, active: 0, inactive: 0 },
                cars: { total: 0, active: 0, pending: 0, rejected: 0 },
                bookings: { total: 0 },
                revenue: { total: 0 }
            },
            usersChart: null,
            carsChart: null,
            isDark: false,

            async init() {
                // Get theme state
                this.isDark = this.$store.app.theme === 'dark' || this.$store.app.isDarkMode;
                
                // Watch for theme changes
                this.$watch('$store.app.theme', () => {
                    this.isDark = this.$store.app.theme === 'dark' || this.$store.app.isDarkMode;
                    this.updateChartsTheme();
                });

                await this.fetchHomeStats();
            },

            async fetchHomeStats() {
                try {
                    this.isLoading = true;
                    const response = await ApiService.getHomeStats();
                    
                    if (response.status && response.data) {
                        // Ensure all user stats are properly parsed
                        const usersData = response.data.users || {};
                        this.stats = {
                            users: {
                                total: parseInt(usersData.total || 0),
                                active: parseInt(usersData.active || 0),
                                inactive: parseInt(usersData.inactive || 0)
                            },
                            cars: response.data.cars || { total: 0, active: 0, pending: 0, rejected: 0 },
                            bookings: response.data.bookings || { total: 0 },
                            revenue: response.data.revenue || { total: 0 }
                        };
                        
                        // Debug: Log user stats
                        console.log('User Stats:', this.stats.users);
                        
                        // Initialize charts after data is loaded
                        setTimeout(() => {
                            this.initCharts();
                        }, 300);
                    }
                } catch (error) {
                    console.error('Error fetching home stats:', error);
                    this.showErrorToast(error.message || 'Failed to load statistics');
                } finally {
                    this.isLoading = false;
                }
            },

            initCharts() {
                this.initUsersChart();
                this.initCarsChart();
            },

            initUsersChart() {
                if (!this.$refs.usersChart) return;

                // Destroy existing chart
                if (this.usersChart) {
                    this.usersChart.destroy();
                }

                const activeUsers = parseInt(this.stats.users?.active || 0);
                const inactiveUsers = parseInt(this.stats.users?.inactive || 0);
                const totalUsers = parseInt(this.stats.users?.total || 0);

                // Ensure we have valid data
                const seriesData = [activeUsers, inactiveUsers];
                
                // If both are 0, show at least minimal values to display the chart
                if (activeUsers === 0 && inactiveUsers === 0) {
                    seriesData[0] = 1;
                    seriesData[1] = 0;
                }

                const options = {
                    series: seriesData,
                    chart: {
                        type: 'donut',
                        height: 300,
                        fontFamily: 'Nunito, sans-serif',
                        toolbar: {
                            show: false
                        }
                    },
                    labels: [
                        this.$store.i18n.t('active_users'),
                        this.$store.i18n.t('inactive_users')
                    ],
                    colors: ['#00ab55', '#e7515a'],
                    dataLabels: {
                        enabled: true,
                        formatter: function (val, opts) {
                            const seriesIndex = opts.seriesIndex;
                            const value = seriesData[seriesIndex];
                            const total = seriesData.reduce((a, b) => a + b, 0);
                            if (total === 0) return '0%';
                            return ((value / total) * 100).toFixed(1) + '%';
                        }
                    },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '70%',
                                labels: {
                                    show: true,
                                    name: {
                                        show: true,
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: this.isDark ? '#bfc9d4' : '#3b3f5c'
                                    },
                                    value: {
                                        show: true,
                                        fontSize: '20px',
                                        fontWeight: 700,
                                        color: this.isDark ? '#bfc9d4' : '#3b3f5c',
                                        formatter: function (val) {
                                            return val;
                                        }
                                    },
                                    total: {
                                        show: true,
                                        label: this.$store.i18n.t('total_users'),
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: this.isDark ? '#bfc9d4' : '#3b3f5c',
                                        formatter: () => {
                                            return totalUsers;
                                        }
                                    }
                                }
                            }
                        }
                    },
                    legend: {
                        show: true,
                        position: 'bottom',
                        horizontalAlign: 'center',
                        fontSize: '14px',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 500,
                        labels: {
                            colors: this.isDark ? '#bfc9d4' : '#3b3f5c'
                        },
                        formatter: function (seriesName, opts) {
                            const value = seriesData[opts.seriesIndex];
                            return seriesName + ': ' + value;
                        }
                    },
                    tooltip: {
                        theme: this.isDark ? 'dark' : 'light',
                        y: {
                            formatter: function (val, opts) {
                                const seriesIndex = opts.seriesIndex;
                                const value = seriesData[seriesIndex];
                                const total = seriesData.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                return value + ' (' + percentage + '%)';
                            }
                        }
                    }
                };

                this.usersChart = new ApexCharts(this.$refs.usersChart, options);
                this.usersChart.render();
            },

            initCarsChart() {
                if (!this.$refs.carsChart) return;

                // Destroy existing chart
                if (this.carsChart) {
                    this.carsChart.destroy();
                }

                const options = {
                    series: [
                        {
                            name: this.$store.i18n.t('cars'),
                            data: [
                                this.stats.cars?.active || 0,
                                this.stats.cars?.pending || 0,
                                this.stats.cars?.rejected || 0
                            ]
                        }
                    ],
                    chart: {
                        type: 'bar',
                        height: 300,
                        fontFamily: 'Nunito, sans-serif',
                        toolbar: {
                            show: false
                        }
                    },
                    colors: ['#00ab55', '#e2a03f', '#e7515a'],
                    plotOptions: {
                        bar: {
                            horizontal: false,
                            columnWidth: '55%',
                            borderRadius: 8,
                            dataLabels: {
                                position: 'top'
                            }
                        }
                    },
                    dataLabels: {
                        enabled: true,
                        offsetY: -20,
                        style: {
                            fontSize: '12px',
                            colors: [this.isDark ? '#bfc9d4' : '#3b3f5c']
                        }
                    },
                    xaxis: {
                        categories: [
                            this.$store.i18n.t('active_cars'),
                            this.$store.i18n.t('pending_cars'),
                            this.$store.i18n.t('rejected_cars')
                        ],
                        labels: {
                            style: {
                                colors: this.isDark ? '#bfc9d4' : '#3b3f5c',
                                fontSize: '12px',
                                fontFamily: 'Nunito, sans-serif'
                            }
                        }
                    },
                    yaxis: {
                        labels: {
                            style: {
                                colors: this.isDark ? '#bfc9d4' : '#3b3f5c',
                                fontSize: '12px',
                                fontFamily: 'Nunito, sans-serif'
                            }
                        }
                    },
                    grid: {
                        borderColor: this.isDark ? '#191e3a' : '#e0e6ed',
                        strokeDashArray: 4
                    },
                    tooltip: {
                        theme: this.isDark ? 'dark' : 'light',
                        y: {
                            formatter: function (val) {
                                return val;
                            }
                        }
                    }
                };

                this.carsChart = new ApexCharts(this.$refs.carsChart, options);
                this.carsChart.render();
            },

            updateChartsTheme() {
                if (this.usersChart) {
                    this.initUsersChart();
                }
                if (this.carsChart) {
                    this.initCarsChart();
                }
            },

            calculatePercentage(partial, total) {
                return total > 0 ? Math.round((partial / total) * 100) : 0;
            },

            formatCurrency(amount) {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2
                }).format(amount);
            },

            showErrorToast(message) {
                if (window.Swal) {
                    const toast = window.Swal.mixin({
                        toast: true,
                        position: 'bottom-start',
                        showConfirmButton: false,
                        timer: 3000,
                        showCloseButton: true,
                        customClass: {
                            popup: 'color-danger',
                        },
                    });
                    toast.fire({
                        title: message,
                    });
                }
            }
        }));
    }

    // Start registration
    registerComponent();
})();

