// Wait for DOM and dependencies to be ready
(function() {
    'use strict';
    
    // Wait for Alpine and API_CONFIG to be available
    function waitForDependencies(callback) {
        if (typeof Alpine !== 'undefined' && typeof API_CONFIG !== 'undefined') {
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
    
    // Safe i18n translation helper
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
            // Check if Google Maps API is already loaded
            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                callback();
                return;
            }

            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
            if (existingScript) {
                // Script is loading, wait for it
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
                    const i18n = Alpine.store('i18n');
                    const message = i18n && i18n.t ? i18n.t('failed_to_load_map') : 'Failed to load map';
                    coloredToast('danger', message);
                });
                return;
            }

            // Load Google Maps API
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
            script.async = true;
            script.defer = true;
            script.onload = callback;
            script.onerror = function () {
                const i18n = Alpine.store('i18n');
                const message = i18n && i18n.t ? i18n.t('failed_to_load_map') : 'Failed to load map';
                coloredToast('danger', message);
            };
            document.head.appendChild(script);
        }

        Alpine.data('carDetails', () => ({
            car: null,
            carId: null,
            isLoading: true,
            error: null,
            selectedImageIndex: 0,

            getImageCount() {
                return this.car && this.car.car_image ? this.car.car_image.length : 0;
            },

            getMainImageHeight() {
                const imageCount = this.getImageCount();
                if (imageCount === 0 || imageCount === 1) {
                    return 'min-h-[600px] lg:min-h-[700px]';
                } else if (imageCount <= 4) {
                    return 'min-h-[500px] lg:min-h-[600px]';
                } else if (imageCount <= 8) {
                    return 'min-h-[450px] lg:min-h-[550px]';
                } else {
                    return 'min-h-[400px] lg:min-h-[500px]';
                }
            },

            getThumbnailGridCols() {
                const imageCount = this.getImageCount();
                if (imageCount <= 4) {
                    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2';
                } else if (imageCount <= 8) {
                    return 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-4';
                } else {
                    return 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-4';
                }
            },

            async init() {
                // Get car ID from URL
                const urlParams = new URLSearchParams(window.location.search);
                this.carId = urlParams.get('id') || urlParams.get('carId');
                
                if (!this.carId) {
                    this.error = Alpine.store('i18n').t('car_id_missing') || 'Car ID is missing';
                    this.isLoading = false;
                    return;
                }

                await this.fetchCarDetails();
            },

            async fetchCarDetails() {
                try {
                    this.isLoading = true;
                    this.error = null;
                    loadingIndicator.show();

                    const token = localStorage.getItem('authToken');
                    if (!token) {
                        coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                        window.location.href = 'auth-boxed-signin.html';
                        return;
                    }

                    const data = await ApiService.getCarDetails(this.carId);
                    
                    // Handle different response structures
                    let car = null;
                    if (data && (data.status === true || data.status === 'success')) {
                        car = data.data || data.car || data;
                    } else if (data && data.data) {
                        car = data.data;
                    } else {
                        car = data;
                    }

                    if (!car || !car.id) {
                        throw new Error(Alpine.store('i18n').t('car_not_found') || 'Car not found');
                    }

                    this.car = car;

                    // Initialize maps after data is loaded
                    await this.$nextTick();
                    setTimeout(() => {
                        this.initMaps();
                    }, 500);
                } catch (error) {
                    console.error('Error fetching car details:', error);
                    this.error = error.message || Alpine.store('i18n').t('failed_to_load_car_details');
                    coloredToast('danger', this.error);
                } finally {
                    this.isLoading = false;
                    loadingIndicator.hide();
                }
            },

            initMaps() {
                if (!this.car) return;

                // Load Google Maps API once for both maps
                const hasPickupLocation = !isNaN(parseFloat(this.car.lat)) && !isNaN(parseFloat(this.car.lang));
                const hasReturnLocation = !isNaN(parseFloat(this.car.lat_return)) && !isNaN(parseFloat(this.car.lang_return));

                if (!hasPickupLocation && !hasReturnLocation) return;

                loadGoogleMapsAPI(() => {
                    // Initialize pickup location map
                    if (hasPickupLocation) {
                        const lat = parseFloat(this.car.lat);
                        const lng = parseFloat(this.car.lang);
                        setTimeout(() => {
                            this.initMap(lat, lng);
                        }, 100);
                    }

                    // Initialize return location map
                    if (hasReturnLocation) {
                        const latReturn = parseFloat(this.car.lat_return);
                        const lngReturn = parseFloat(this.car.lang_return);
                        setTimeout(() => {
                            this.initReturnMap(latReturn, lngReturn);
                        }, 150);
                    }
                });
            },

            initMap(lat, lng) {
                const mapElement = document.getElementById('car-location-map');
                if (!mapElement || !window.google || !window.google.maps) {
                    console.warn('Map element or Google Maps API not ready for pickup location');
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
                        title: Alpine.store('i18n').t('car_location') || 'Car Location',
                        icon: {
                            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                            scaledSize: new google.maps.Size(40, 40)
                        }
                    });

                    // Ensure map renders correctly after a delay
                    setTimeout(() => {
                        google.maps.event.trigger(map, 'resize');
                        map.setCenter({ lat, lng });
                    }, 300);
                } catch (error) {
                    console.error('Error initializing pickup location map:', error);
                }
            },

            initReturnMap(lat, lng) {
                const mapElement = document.getElementById('car-return-map');
                if (!mapElement || !window.google || !window.google.maps) {
                    console.warn('Map element or Google Maps API not ready for return location');
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
                        title: Alpine.store('i18n').t('return_location') || 'Return Location',
                        icon: {
                            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                            scaledSize: new google.maps.Size(40, 40)
                        }
                    });

                    // Ensure map renders correctly after a delay
                    setTimeout(() => {
                        google.maps.event.trigger(map, 'resize');
                        map.setCenter({ lat, lng });
                    }, 300);
                } catch (error) {
                    console.error('Error initializing return location map:', error);
                }
            },

            formatPrice(price, car = null) {
                if (!price) return Alpine.store('i18n').t('na');
                
                if (car && car.season_pricing_info && car.season_pricing_info.has_season_pricing) {
                    const finalPrice = parseFloat(car.season_pricing_info.final_price || price);
                    return `${finalPrice.toFixed(2)} ${Alpine.store('i18n').t('currency')}`;
                }
                
                return `${parseFloat(price).toFixed(2)} ${Alpine.store('i18n').t('currency')}`;
            },

            formatAnswerTime(timeAnswer) {
                if (!timeAnswer && timeAnswer !== 0) return Alpine.store('i18n').t('na');
                const time = parseFloat(timeAnswer);
                if (isNaN(time)) return Alpine.store('i18n').t('na');
                
                if (time === 0) {
                    return Alpine.store('i18n').t('no_limit') || 'No Limit';
                }
                
                if (time < 24) {
                    return `${time} ${time === 1 ? (Alpine.store('i18n').t('hour') || 'Hour') : (Alpine.store('i18n').t('hours') || 'Hours')}`;
                } else {
                    const days = Math.floor(time / 24);
                    return `${days} ${days === 1 ? (Alpine.store('i18n').t('day') || 'Day') : (Alpine.store('i18n').t('days') || 'Days')}`;
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

            formatDiscountInfo(discountInfo) {
                if (!discountInfo || !discountInfo.has_discount) {
                    return null;
                }

                const discountAmount = discountInfo.discount_amount || 0;
                const discountType = discountInfo.discount_type || 'fixed';
                const originalPrice = discountInfo.original_price || 0;
                const finalPrice = discountInfo.final_price || 0;
                
                const discountText = discountType === 'percentage' 
                    ? `${discountAmount}%`
                    : `${discountAmount} ${Alpine.store('i18n').t('currency') || 'AED'}`;

                return {
                    discountText,
                    originalPrice: parseFloat(originalPrice).toFixed(2),
                    finalPrice: parseFloat(finalPrice).toFixed(2)
                };
            },

            goBack() {
                window.history.back();
            },

            selectImage(index) {
                this.selectedImageIndex = index;
            },

            getMainImage() {
                if (!this.car || !this.car.car_image || this.car.car_image.length === 0) {
                    return null;
                }
                return this.car.car_image[this.selectedImageIndex]?.image || this.car.car_image[0].image;
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

            shouldDisplayField(key, value) {
                // Don't display fields with 'id' in the key
                if (key.toLowerCase().includes('id')) {
                    return false;
                }
                // Exclude fields that are already displayed in other sections
                const excludedFields = [
                    'make', 'brand', 'model', 'years', 'status', 'price', 'number', 'vin',
                    'description', 'car_image', 'owner', 'lat', 'lang', 'lat_return', 'lang_return',
                    'address', 'address_return', 'number_license', 'state', 'min_day_trip', 
                    'max_day_trip', 'advanced_notice', 'time_answer', 'discount_info', 'season_pricing_info',
                    'cars_features', 'additional_photos', 'created_at', 'updated_at',
                    'is_rented', 'driver_available', 'available_fuel', 'fuel_capacity', 
                    'commission_rate', 'favorites_count', 'is_favorite', 'trip_count', 
                    'count_rating', 'avg_rating', 'image_license', 'description_condition'
                ];
                if (excludedFields.includes(key.toLowerCase())) {
                    return false;
                }
                // Check if value has content
                return this.hasValue(value);
            },

            formatFieldName(key) {
                // Convert snake_case to Title Case
                return key
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            },

            isImageUrl(value) {
                if (typeof value !== 'string') return false;
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
                const imagePatterns = ['image', 'img', 'photo', 'picture', 'cdn', 'cloudinary', 's3', 'storage'];
                const lowerValue = value.toLowerCase();
                return imageExtensions.some(ext => lowerValue.includes(ext)) || 
                       imagePatterns.some(pattern => lowerValue.includes(pattern)) ||
                       /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(value);
            },

            formatFieldValue(value, isNested = false) {
                if (value === null || value === undefined) {
                    return 'N/A';
                }
                if (typeof value === 'boolean') {
                    return value ? 'Yes' : 'No';
                }
                if (typeof value === 'number') {
                    return value.toString();
                }
                if (typeof value === 'string') {
                    if (this.isImageUrl(value)) {
                        return 'IMAGE_URL'; // Special marker for images
                    }
                    return value;
                }
                if (typeof value === 'object' && !Array.isArray(value)) {
                    // Return special marker for objects - will be handled in template
                    return 'OBJECT';
                }
                if (Array.isArray(value)) {
                    if (value.length === 0) return 'N/A';
                    // Check if array contains images
                    const hasImages = value.some(item => 
                        (typeof item === 'string' && this.isImageUrl(item)) ||
                        (typeof item === 'object' && item.image && this.isImageUrl(item.image))
                    );
                    if (hasImages) {
                        return 'IMAGE_ARRAY'; // Special marker for image arrays
                    }
                    return 'ARRAY';
                }
                return String(value);
            },

            getObjectFields(obj) {
                if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                    return [];
                }
                return Object.entries(obj)
                    .filter(([k, v]) => this.shouldDisplayField(k, v))
                    .map(([k, v]) => ({
                        key: k,
                        value: v,
                        formattedKey: this.formatFieldName(k),
                        type: this.getFieldType(v)
                    }));
            },

            getFieldType(value) {
                if (value === null || value === undefined) return 'null';
                if (typeof value === 'boolean') return 'boolean';
                if (typeof value === 'number') return 'number';
                if (typeof value === 'string') {
                    if (this.isImageUrl(value)) return 'image';
                    return 'string';
                }
                if (Array.isArray(value)) {
                    const hasImages = value.some(item => 
                        (typeof item === 'string' && this.isImageUrl(item)) ||
                        (typeof item === 'object' && item.image && this.isImageUrl(item.image))
                    );
                    return hasImages ? 'image_array' : 'array';
                }
                if (typeof value === 'object') return 'object';
                return 'unknown';
            },

            getFeatureIcon(key) {
                const iconMap = {
                    'transmission': 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
                    'mileage': 'M13 10V3L4 14h7v7l9-11h-7z',
                    'door': 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
                    'seat': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
                    'condition': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                    'seatbelt': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                    'additional': 'M12 6v6m0 0v6m0-6h6m-6 0H6'
                };

                const lowerKey = key.toLowerCase();
                for (const [keyPattern, path] of Object.entries(iconMap)) {
                    if (lowerKey.includes(keyPattern)) {
                        return path;
                    }
                }
                return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Default icon
            },

            formatFeatureValue(value) {
                if (value === null || value === undefined || value === '') return 'N/A';
                if (typeof value === 'boolean' || value === 0 || value === 1) {
                    const boolValue = value === true || value === 1 || value === '1';
                    return boolValue;
                }
                if (Array.isArray(value)) {
                    return value.join(', ');
                }
                return value;
            },

            isFeatureEnabled(value) {
                return value === true || value === 1 || value === '1';
            }
        }));
    }

    waitForDependencies(registerComponent);
})();

