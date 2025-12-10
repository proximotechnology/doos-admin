(function() {
    'use strict';
    
    function waitForDependencies(callback) {
        if (typeof Alpine !== 'undefined' && typeof API_CONFIG !== 'undefined') {
            callback();
        } else {
            setTimeout(() => waitForDependencies(callback), 50);
        }
    }
    
    function registerComponent() {
        if (typeof Alpine !== 'undefined' && Alpine.store) {
            registerAlpineComponent();
        } else {
            document.addEventListener('alpine:init', registerAlpineComponent, { once: true });
        }
    }
    
    function t(key) {
        const i18n = Alpine.store('i18n');
        return (i18n && i18n.t) ? i18n.t(key) : key;
    }
    
    function registerAlpineComponent() {
        const loadingIndicator = {
            show: function () {
                const el = document.getElementById('loadingIndicator');
                if (el) el.classList.remove('hidden');
            },
            hide: function () {
                const el = document.getElementById('loadingIndicator');
                if (el) el.classList.add('hidden');
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

        function loadGoogleMapsAPI(callback) {
            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                callback();
                return;
            }

            const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
            if (existingScript) {
                if (existingScript.onload) {
                    const originalOnload = existingScript.onload;
                    existingScript.onload = function() {
                        originalOnload();
                        callback();
                    };
                } else {
                    existingScript.addEventListener('load', callback);
                }
                existingScript.addEventListener('error', function () {
                    coloredToast('danger', t('failed_to_load_map'));
                });
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
            script.async = true;
            script.defer = true;
            script.onload = callback;
            script.onerror = function () {
                coloredToast('danger', t('failed_to_load_map'));
            };
            document.head.appendChild(script);
        }

        Alpine.data('bookingDetails', () => ({
            booking: null,
            bookingId: null,
            isLoading: true,
            error: null,
            feesData: [],
            discountsData: null,
            seasonPricingData: null,

            async init() {
                const pathParts = window.location.pathname.split('/');
                const bookingIndex = pathParts.findIndex(part => part === 'booking_details');
                if (bookingIndex !== -1 && pathParts[bookingIndex + 1]) {
                    this.bookingId = pathParts[bookingIndex + 1];
                } else {
                    const urlParams = new URLSearchParams(window.location.search);
                    this.bookingId = urlParams.get('id') || urlParams.get('bookingId');
                }
                
                if (!this.bookingId) {
                    this.error = t('booking_id_missing') || 'Booking ID is missing';
                    this.isLoading = false;
                    return;
                }

                await this.fetchBookingDetails();
            },

            async fetchBookingDetails() {
                try {
                    this.isLoading = true;
                    this.error = null;
                    loadingIndicator.show();

                    const token = localStorage.getItem('authToken');
                    if (!token) {
                        coloredToast('danger', t('auth_token_missing'));
                        window.location.href = 'auth-boxed-signin.html';
                        return;
                    }

                    const data = await ApiService.getBookingDetails(this.bookingId);
                    
                    let booking = null;
                    if (data && (data.status === true || data.status === 'success')) {
                        booking = data.data || data.booking || data;
                    } else if (data && data.data) {
                        booking = data.data;
                    } else {
                        booking = data;
                    }

                    if (!booking || !booking.id) {
                        throw new Error(t('booking_not_found') || 'Booking not found');
                    }

                    if (booking.fees_data) {
                        try {
                            booking.fees_data = typeof booking.fees_data === 'string' 
                                ? JSON.parse(booking.fees_data) 
                                : booking.fees_data;
                            booking.fees_data = Array.isArray(booking.fees_data) 
                                ? booking.fees_data.filter(fee => fee.success === true) 
                                : [];
                        } catch (e) {
                            console.warn('Failed to parse fees_data:', e);
                            booking.fees_data = [];
                        }
                    }

                    if (booking.discounts_data) {
                        try {
                            booking.discounts_data = typeof booking.discounts_data === 'string' 
                                ? JSON.parse(booking.discounts_data) 
                                : booking.discounts_data;
                        } catch (e) {
                            console.warn('Failed to parse discounts_data:', e);
                        }
                    }

                    if (booking.season_pricing_data) {
                        try {
                            booking.season_pricing_data = typeof booking.season_pricing_data === 'string' 
                                ? JSON.parse(booking.season_pricing_data) 
                                : booking.season_pricing_data;
                        } catch (e) {
                            console.warn('Failed to parse season_pricing_data:', e);
                        }
                    }

                    if (booking.contract && booking.contract.contract_items) {
                        try {
                            booking.contract.contract_items = typeof booking.contract.contract_items === 'string' 
                                ? JSON.parse(booking.contract.contract_items) 
                                : booking.contract.contract_items;
                        } catch (e) {
                            console.warn('Failed to parse contract_items:', e);
                            booking.contract.contract_items = [];
                        }
                    }

                    if (booking.booking_exceptions && Array.isArray(booking.booking_exceptions)) {
                        booking.booking_exceptions = booking.booking_exceptions.map(exception => {
                            if (exception.issue_type && Array.isArray(exception.issue_type)) {
                                exception.issue_type = exception.issue_type.join(', ');
                            }
                            return exception;
                        });
                    }

                    if (!booking.contract) {
                        booking.contract = null;
                    }

                    if (booking.car_details && !booking.car) {
                        booking.car = booking.car_details;
                    }

                    this.booking = booking;

                    await this.$nextTick();
                    setTimeout(() => {
                        this.initMaps();
                    }, 1000);
                } catch (error) {
                    console.error('Error fetching booking details:', error);
                    this.error = error.message || t('failed_to_load_booking_details');
                    coloredToast('danger', this.error);
                } finally {
                    this.isLoading = false;
                    loadingIndicator.hide();
                }
            },

            initMaps() {
                if (!this.booking) return;

                const hasPickupLocation = !isNaN(parseFloat(this.booking.lat)) && !isNaN(parseFloat(this.booking.lang));
                const hasReturnLocation = !isNaN(parseFloat(this.booking.lat_return)) && !isNaN(parseFloat(this.booking.lang_return));

                if (!hasPickupLocation && !hasReturnLocation) return;

                loadGoogleMapsAPI(() => {
                    setTimeout(() => {
                        if (hasPickupLocation) {
                            const lat = parseFloat(this.booking.lat);
                            const lng = parseFloat(this.booking.lang);
                            this.initMap(lat, lng, 'pickup');
                        }

                        if (hasReturnLocation) {
                            const latReturn = parseFloat(this.booking.lat_return);
                            const lngReturn = parseFloat(this.booking.lang_return);
                            setTimeout(() => {
                                this.initMap(latReturn, lngReturn, 'return');
                            }, 200);
                        }
                    }, 300);
                });
            },

            initMap(lat, lng, type) {
                const mapId = type === 'pickup' ? 'pickup-map' : 'return-map';
                const mapElement = document.getElementById(mapId);
                if (!mapElement) {
                    console.warn(`Map element not found: ${mapId}`);
                    return;
                }
                if (!window.google || !window.google.maps) {
                    console.warn(`Google Maps API not ready for ${type} location`);
                    setTimeout(() => this.initMap(lat, lng, type), 500);
                    return;
                }

                try {
                    const map = new google.maps.Map(mapElement, {
                        zoom: 15,
                        center: { lat, lng },
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: true
                    });

                    new google.maps.Marker({
                        position: { lat, lng },
                        map: map,
                        title: type === 'pickup' ? (t('pickup_location') || 'Pickup Location') : (t('return_location') || 'Return Location'),
                        icon: {
                            url: type === 'pickup' 
                                ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                            scaledSize: new google.maps.Size(40, 40)
                        }
                    });

                    setTimeout(() => {
                        google.maps.event.trigger(map, 'resize');
                        map.setCenter({ lat, lng });
                    }, 300);
                } catch (error) {
                    console.error(`Error initializing ${type} location map:`, error);
                }
            },

            formatDate(dateString) {
                if (!dateString) return 'N/A';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (e) {
                    return dateString;
                }
            },

            formatTime(timeString) {
                if (!timeString) return 'N/A';
                try {
                    const [hours, minutes, seconds] = timeString.split(':');
                    return `${hours}:${minutes}`;
                } catch (e) {
                    return timeString;
                }
            },

            formatPrice(price) {
                if (!price) return 'N/A';
                return `${parseFloat(price).toFixed(2)} ${t('currency') || 'AED'}`;
            },

            hasValue(value) {
                if (value === null || value === undefined || value === '') {
                    return false;
                }
                if (typeof value === 'string' && value.trim() === '') {
                    return false;
                }
                if (Array.isArray(value) && value.length === 0) {
                    return false;
                }
                if (typeof value === 'object' && Object.keys(value).length === 0) {
                    return false;
                }
                return true;
            },


            getStatusBadgeClass(status) {
                const statusLower = (status || '').toLowerCase();
                if (statusLower === 'completed') return 'bg-success';
                if (statusLower === 'cancelled') return 'bg-danger';
                if (statusLower === 'pending') return 'bg-warning';
                if (statusLower === 'active' || statusLower === 'in_progress') return 'bg-info';
                return 'bg-gray-500';
            },

            formatBookingStatus(status) {
                if (!status) return t('na') || 'N/A';
                const statuses = {
                    'confirm': t('confirmed') || 'Confirmed',
                    'confirmed': t('confirmed') || 'Confirmed',
                    'pending': t('pending') || 'Pending',
                    'cancelled': t('cancelled') || 'Cancelled',
                    'completed': t('completed') || 'Completed',
                    'picked_up': t('picked_up') || 'Picked Up',
                    'returned': t('returned') || 'Returned'
                };
                return statuses[status.toLowerCase()] || status;
            },

            formatPaymentMethod(method) {
                if (!method) return t('na') || 'N/A';
                const methods = {
                    'montypay': 'MontyPay',
                    'cash': t('cash') || 'Cash',
                    'card': t('card') || 'Card'
                };
                return methods[method.toLowerCase()] || method;
            },

            formatExceptionStatus(status) {
                if (!status) return t('na') || 'N/A';
                const statuses = {
                    'pending': t('pending') || 'Pending',
                    'resolved': t('resolved') || 'Resolved',
                    'completed': t('completed') || 'Completed',
                    'rejected': t('rejected') || 'Rejected',
                    'failed': t('failed') || 'Failed',
                    'in_progress': t('in_progress') || 'In Progress',
                    'processing': t('processing') || 'Processing'
                };
                return statuses[status.toLowerCase()] || status;
            },

            getObjectFields(obj, excludeIdAndUpdated = true, customExclusions = []) {
                if (!obj || typeof obj !== 'object') return [];
                
                const excludedKeys = [
                    'user_id', 'car_id', 'created_at', 'completed_at',
                    'date_from', 'date_end', 'time_from', 'time_return',
                    'total_price', 'final_price', 'fee_percentage', 'insurancePrice',
                    'is_paid', 'with_driver', 'has_representative', 'repres_status',
                    'status', 'payment_method', 'address', 'address_return',
                    'lat', 'lang', 'lat_return', 'lang_return',
                    'fees_data', 'discounts_data', 'season_pricing_data',
                    'picked_up_image', 'returned_image', 'car', 'user', 'contract',
                    'booking_exceptions', 'cancellation_images', 'cancel_order_status',
                    'insurance', 'frontend_cancel_url', 'frontend_success_url',
                    'fuel_fee_litres', 'total_after_coupon', 'is_notify', 'is_notify_return',
                    'is_cancell_picked_up', 'payment', 'car_details', 'order_booking_id',
                    'cars_id', 'make_id', 'car_model_id', 'model_year_id', 'brand_id',
                    'user_plan_id', 'insurance_id', 'name', 'email', 'phone', 'country',
                    'city', 'current_address', 'brand', 'model', 'years', 'owner',
                    'plate_number', 'vin', 'fuel_capacity'
                ];
                
                excludedKeys.push(...customExclusions);
                
                if (excludeIdAndUpdated) {
                    excludedKeys.push('id', 'updated_at');
                }
                
                const fields = [];
                
                for (const key in obj) {
                    if (excludedKeys.includes(key)) continue;
                    if (key.startsWith('_')) continue;
                    
                    const value = obj[key];
                    
                    if (value === null || value === undefined || value === '') continue;
                    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
                    if (Array.isArray(value) && value.length === 0) continue;
                    
                    let fieldType = 'text';
                    let displayValue = value;
                    
                    if (Array.isArray(value)) {
                        if (value.length > 0 && typeof value[0] === 'object' && (value[0].image_path || value[0].url || value[0].image)) {
                            fieldType = 'image_array';
                            displayValue = value;
                        } else {
                            fieldType = 'array';
                            displayValue = value.join(', ');
                        }
                    } else if (typeof value === 'object' && value !== null) {
                        if (value.image_path || value.url || value.image) {
                            fieldType = 'image';
                            displayValue = value.image_path || value.url || value.image;
                        } else {
                            continue;
                        }
                    } else if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                        if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
                            fieldType = 'image';
                            displayValue = value;
                        }
                    } else if (typeof value === 'boolean') {
                        displayValue = value ? t('yes') || 'Yes' : t('no') || 'No';
                    }
                    
                    const formattedKey = key
                        .replace(/_/g, ' ')
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .trim();
                    
                    fields.push({
                        key: key,
                        formattedKey: formattedKey,
                        value: displayValue,
                        type: fieldType
                    });
                }
                
                return fields;
            },

            getUserBasicFields(user) {
                if (!user) return [];
                const basicFields = ['name', 'email', 'phone', 'country', 'city', 'current_address'];
                return basicFields.filter(key => user[key] && user[key] !== null && user[key] !== '');
            },

            formatRepresStatus(status) {
                if (status === '0' || status === 0) return t('not_assigned') || 'Not Assigned';
                if (status === '1' || status === 1) return t('assigned') || 'Assigned';
                if (status === '2' || status === 2) return t('completed') || 'Completed';
                return status;
            },

            formatBoolean(value) {
                if (value === '1' || value === 1 || value === true) return t('yes') || 'Yes';
                if (value === '0' || value === 0 || value === false) return t('no') || 'No';
                return value;
            },

            goBack() {
                window.history.back();
            }
        }));
    }

    waitForDependencies(registerComponent);
})();

