// Google Maps variables
let map, mapReturn;
let marker, markerReturn;
let geocoder;
let autocomplete, autocompleteReturn;
let mapInitialized = false;
let mapReturnInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 20;

function initMap(mapElementId, returnMapElementId, component) {
    initAttempts++;
    
    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        if (initAttempts >= MAX_INIT_ATTEMPTS) {
            showMapError(mapElementId, returnMapElementId);
            return;
        }
        setTimeout(() => initMap(mapElementId, returnMapElementId, component), 500);
        return;
    }

    // Check if map element exists
    const mapElement = document.getElementById(mapElementId);
    if (!mapElement) {
        setTimeout(() => initMap(mapElementId, returnMapElementId, component), 300);
        return;
    }

    // Prevent re-initialization
    if (mapInitialized && mapElementId === 'map') return;
    if (mapReturnInitialized && returnMapElementId === 'map-return') return;

    try {
        geocoder = geocoder || new google.maps.Geocoder();
        const defaultCenter = { lat: 24.7136, lng: 46.6753 }; // Riyadh

        // Initialize main map
        if (mapElementId === 'map' && !mapInitialized) {
            mapInitialized = true;
            mapElement.style.height = '500px';
            mapElement.style.width = '100%';
            mapElement.style.minHeight = '500px';
            
            map = new google.maps.Map(mapElement, {
                center: defaultCenter,
                zoom: 10,
                mapTypeControl: false,
                streetViewControl: false
            });

            setTimeout(() => {
                if (map) {
                    google.maps.event.trigger(map, 'resize');
                    map.setCenter(defaultCenter);
                }
            }, 200);

            marker = new google.maps.Marker({
                map: map,
                draggable: true,
                animation: google.maps.Animation.DROP,
                visible: false,
            });

            const input = document.getElementById('pac-input');
            if (input) {
                autocomplete = new google.maps.places.Autocomplete(input);
                autocomplete.bindTo('bounds', map);

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry) return;

                    if (place.geometry.viewport) {
                        map.fitBounds(place.geometry.viewport);
                    } else {
                        map.setCenter(place.geometry.location);
                        map.setZoom(17);
                    }

                    marker.setPosition(place.geometry.location);
                    marker.setVisible(true);

                    if (component) {
                        component.lat = place.geometry.location.lat();
                        component.lang = place.geometry.location.lng();
                        component.address = place.formatted_address;
                    }
                });
            }

            map.addListener('click', (e) => {
                if (marker) {
                    marker.setVisible(true);
                    marker.setPosition(e.latLng);
                    map.panTo(e.latLng);
                }
                placeMarkerAndPanTo(e.latLng, map, marker, 'pac-input');
                if (component) {
                    component.lat = e.latLng.lat();
                    component.lang = e.latLng.lng();
                }
            });

            marker.addListener('dragend', () => {
                const position = marker.getPosition();
                if (component) {
                    component.lat = position.lat();
                    component.lang = position.lng();
                }
                placeMarkerAndPanTo(position, map, marker, 'pac-input');
            });
        }

        // Initialize return map
        if (returnMapElementId === 'map-return' && !mapReturnInitialized) {
            const returnMapElement = document.getElementById(returnMapElementId);
            if (returnMapElement) {
                mapReturnInitialized = true;
                returnMapElement.style.height = '500px';
                returnMapElement.style.width = '100%';
                returnMapElement.style.minHeight = '500px';
                
                mapReturn = new google.maps.Map(returnMapElement, {
                    center: defaultCenter,
                    zoom: 10,
                    mapTypeControl: false,
                    streetViewControl: false
                });

                setTimeout(() => {
                    if (mapReturn) {
                        google.maps.event.trigger(mapReturn, 'resize');
                        mapReturn.setCenter(defaultCenter);
                    }
                }, 200);

                markerReturn = new google.maps.Marker({
                    map: mapReturn,
                    draggable: true,
                    animation: google.maps.Animation.DROP,
                    visible: false,
                });

                const returnInput = document.getElementById('pac-input-return');
                if (returnInput) {
                    autocompleteReturn = new google.maps.places.Autocomplete(returnInput);
                    autocompleteReturn.bindTo('bounds', mapReturn);

                    autocompleteReturn.addListener('place_changed', () => {
                        const place = autocompleteReturn.getPlace();
                        if (!place.geometry) return;

                        if (place.geometry.viewport) {
                            mapReturn.fitBounds(place.geometry.viewport);
                        } else {
                            mapReturn.setCenter(place.geometry.location);
                            mapReturn.setZoom(17);
                        }

                        markerReturn.setPosition(place.geometry.location);
                        markerReturn.setVisible(true);

                        if (component) {
                            component.lat_return = place.geometry.location.lat();
                            component.lang_return = place.geometry.location.lng();
                            component.address_return = place.formatted_address;
                        }
                    });
                }

                mapReturn.addListener('click', (e) => {
                    if (markerReturn) {
                        markerReturn.setVisible(true);
                        markerReturn.setPosition(e.latLng);
                        mapReturn.panTo(e.latLng);
                    }
                    placeMarkerAndPanTo(e.latLng, mapReturn, markerReturn, 'pac-input-return');
                    if (component) {
                        component.lat_return = e.latLng.lat();
                        component.lang_return = e.latLng.lng();
                    }
                });

                markerReturn.addListener('dragend', () => {
                    const position = markerReturn.getPosition();
                    if (component) {
                        component.lat_return = position.lat();
                        component.lang_return = position.lng();
                    }
                    placeMarkerAndPanTo(position, mapReturn, markerReturn, 'pac-input-return');
                });
            }
        }
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

function placeMarkerAndPanTo(latLng, map, marker, inputId) {
    if (!marker || !map) return;

    marker.setPosition(latLng);
    map.panTo(latLng);

    if (geocoder) {
        geocoder.geocode({ 'location': latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = results[0].formatted_address;
                }
            }
        });
    }
}

document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
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

    Alpine.data('Update_Car', () => ({
        // Car ID from URL
        carId: null,
        
        // Basic Information
        brand_id: '',
        model_id: '',
        year_id: '',
        price: '',
        description: '',
        user_id: '',
        
        // Car Details
        vin: '',
        number_license: '',
        description_condition: '',
        advanced_notice: '',
        time_answer: '',
        min_day_trip: '',
        max_day_trip: '',
        
        // Location
        lat: '',
        lang: '',
        address: '',
        
        // Return Location
        lat_return: '',
        lang_return: '',
        address_return: '',
        
        // Images
        images: [],
        image_license: null,
        additional_photos: [],
        currentCarImages: [],
        currentLicenseImage: null,
        currentAdditionalPhotos: [],
        
        // Fuel
        fuel_capacity: '',
        available_fuel: '',
        
        // Features
        features: {
            transmission: 'automatic',
            mechanical_condition: '',
            all_have_seatbelts: '1',
            num_of_door: '',
            num_of_seat: '',
            mileage_range: '',
            additional_features: ['']
        },
        
        // User selection
        selectedUser: null,
        
        // Company
        company: {
            legal_name: '',
            id_employees: '',
            is_under_vat: '0',
            vat_num: '',
            zip_code: '',
            country: '',
            address_1: '',
            address_2: '',
            city: '',
            image: null
        },
        
        // Optional (for creating new brand/model/year)
        brand_name: '',
        model_name: '',
        year_value: '',
        
        // Dropdowns
        brands: [],
        models: [],
        years: [],
        users: [],
        
        // State
        isSubmitting: false,
        isLoading: true,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;
            
            // Get car ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const pathParts = window.location.pathname.split('/');
            const updateCarIndex = pathParts.findIndex(part => part === 'updateCar');
            
            if (updateCarIndex !== -1 && pathParts[updateCarIndex + 1]) {
                this.carId = parseInt(pathParts[updateCarIndex + 1]);
            } else if (urlParams.get('id')) {
                this.carId = parseInt(urlParams.get('id'));
            }
            
            if (!this.carId) {
                coloredToast('danger', Alpine.store('i18n').t('car_id_required') || 'Car ID is required');
                setTimeout(() => {
                    window.location.href = 'Car.html';
                }, 2000);
                return;
            }
            
            await Promise.all([
                this.fetchBrands(),
                this.fetchUsers(),
                this.fetchCarDetails()
            ]);
            
            // Load Google Maps API and initialize maps
            loadGoogleMapsAPI('map', 'map-return', this);
            this.isLoading = false;
        },
        
        async fetchCarDetails() {
            try {
                loadingIndicator.show();
                const result = await ApiService.getCarDetails(this.carId);
                
                let car = null;
                if (result && (result.status === true || result.status === 'success')) {
                    car = result.data || result.car || result;
                } else if (result && result.data) {
                    car = result.data;
                } else {
                    car = result;
                }
                
                if (!car) {
                    throw new Error(Alpine.store('i18n').t('car_not_found') || 'Car not found');
                }
                
                // Populate form fields
                this.brand_id = car.brand_id || car.brand?.id || '';
                this.model_id = car.car_model_id || car.model?.id || '';
                this.year_id = car.model_year_id || car.years?.id || '';
                this.price = car.price || '';
                this.description = car.description || '';
                this.user_id = car.owner_id || car.user_id || '';
                
                this.vin = car.vin || '';
                this.number_license = car.number_license || '';
                this.description_condition = car.description_condition || '';
                this.advanced_notice = car.advanced_notice || '';
                this.time_answer = car.time_answer || '';
                this.min_day_trip = car.min_day_trip || '';
                this.max_day_trip = car.max_day_trip || '';
                
                this.lat = car.lat || '';
                this.lang = car.lang || '';
                this.address = car.address || '';
                
                this.lat_return = car.lat_return || '';
                this.lang_return = car.lang_return || '';
                this.address_return = car.address_return || '';
                
                // Current images
                if (car.car_image && Array.isArray(car.car_image)) {
                    this.currentCarImages = car.car_image.map(img => img.image || img);
                }
                if (car.image_license) {
                    this.currentLicenseImage = car.image_license;
                }
                if (car.additional_photos && Array.isArray(car.additional_photos)) {
                    this.currentAdditionalPhotos = car.additional_photos.map(photo => photo.image || photo);
                }
                
                this.fuel_capacity = car.fuel_capacity || '';
                this.available_fuel = car.available_fuel || '';
                
                // Features
                if (car.cars_features) {
                    this.features.transmission = car.cars_features.transmission || 'automatic';
                    this.features.mechanical_condition = car.cars_features.mechanical_condition || '';
                    this.features.all_have_seatbelts = car.cars_features.all_have_seatbelts || '1';
                    this.features.num_of_door = car.cars_features.num_of_door || '';
                    this.features.num_of_seat = car.cars_features.num_of_seat || '';
                    this.features.mileage_range = car.cars_features.mileage_range || '';
                    if (car.cars_features.additional_features && Array.isArray(car.cars_features.additional_features)) {
                        this.features.additional_features = car.cars_features.additional_features.length > 0 
                            ? car.cars_features.additional_features 
                            : [''];
                    }
                }
                
                // User
                if (car.owner) {
                    this.selectedUser = car.owner;
                }
                
                // Company
                if (car.company) {
                    this.company = { ...this.company, ...car.company };
                }
                
                // Fetch models and years after setting brand_id and model_id
                if (this.brand_id) {
                    await this.fetchModels();
                    if (this.model_id) {
                        await this.fetchYears();
                    }
                }
                
                // Initialize maps with car location
                setTimeout(() => {
                    if (this.lat && this.lang && map) {
                        const position = { lat: parseFloat(this.lat), lng: parseFloat(this.lang) };
                        marker.setPosition(position);
                        marker.setVisible(true);
                        map.setCenter(position);
                        map.setZoom(15);
                    }
                    if (this.lat_return && this.lang_return && mapReturn) {
                        const returnPosition = { lat: parseFloat(this.lat_return), lng: parseFloat(this.lang_return) };
                        markerReturn.setPosition(returnPosition);
                        markerReturn.setVisible(true);
                        mapReturn.setCenter(returnPosition);
                        mapReturn.setZoom(15);
                    }
                }, 1000);
                
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_load_car_details') || 'Failed to load car details');
                setTimeout(() => {
                    window.location.href = 'Car.html';
                }, 2000);
            } finally {
                loadingIndicator.hide();
            }
        },
        
        removeCurrentImage(index) {
            this.currentCarImages.splice(index, 1);
        },
        
        removeCurrentAdditionalPhoto(index) {
            this.currentAdditionalPhotos.splice(index, 1);
        },

        async fetchBrands() {
            try {
                const result = await ApiService.getBrands(1, { per_page: 1000 });
                this.brands = result.data.data || [];
            } catch (error) {
                coloredToast('danger', error.message);
            }
        },

        async fetchModels() {
            try {
                if (!this.brand_id) {
                    this.models = [];
                    this.years = [];
                    this.model_id = '';
                    this.year_id = '';
                    return;
                }
                const result = await ApiService.getModels(1, { per_page: 1000, brand_id: this.brand_id });
                this.models = result.data.data || [];
            } catch (error) {
                coloredToast('danger', error.message);
            }
        },

        async fetchYears() {
            try {
                if (!this.model_id) {
                    this.years = [];
                    this.year_id = '';
                    return;
                }
                const result = await ApiService.getModelDetails(this.model_id);
                this.years = result.data.years || result.data.year_models || [];
            } catch (error) {
                coloredToast('danger', error.message);
            }
        },

        async fetchUsers() {
            try {
                const result = await ApiService.getUsers(1, { per_page: 1000 });
                this.users = (result.data.data || []).filter(u => u.type === '0');
            } catch (error) {
                coloredToast('danger', error.message);
            }
        },
        
        selectUser(user) {
            this.selectedUser = user;
            this.user_id = user.id;
        },

        onBrandChange() {
            this.model_id = '';
            this.year_id = '';
            this.models = [];
            this.years = [];
            if (this.brand_id) {
                this.fetchModels();
            }
        },

        onModelChange() {
            this.year_id = '';
            this.years = [];
            if (this.model_id) {
                this.fetchYears();
            }
        },

        handleImages(event) {
            this.images = Array.from(event.target.files);
        },

        handleLicenseImage(event) {
            this.image_license = event.target.files[0];
        },

        handleAdditionalPhotos(event) {
            this.additional_photos = Array.from(event.target.files);
        },

        handleCompanyImage(event) {
            this.company.image = event.target.files[0];
        },

        addAdditionalFeature() {
            this.features.additional_features.push('');
        },

        removeAdditionalFeature(index) {
            if (this.features.additional_features.length > 1) {
                this.features.additional_features.splice(index, 1);
            }
        },

        async updateCar() {
            try {
                this.isSubmitting = true;
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                if (!this.carId) {
                    throw new Error(Alpine.store('i18n').t('car_id_required') || 'Car ID is required');
                }

                // Basic validation
                if (!this.brand_id || !this.model_id || !this.year_id || !this.price || !this.user_id) {
                    throw new Error(Alpine.store('i18n').t('fill_required_fields'));
                }

                if (!this.lat || !this.lang || !this.address) {
                    throw new Error(Alpine.store('i18n').t('location_required') || 'Location is required');
                }

                // Images validation - at least one image (current or new)
                if (this.images.length === 0 && (!this.currentCarImages || this.currentCarImages.length === 0)) {
                    throw new Error(Alpine.store('i18n').t('images_required') || 'At least one car image is required');
                }
                
                // VIN validation
                if (this.vin && this.vin.length !== 17) {
                    throw new Error(Alpine.store('i18n').t('vin_must_be_17_characters') || 'VIN must be exactly 17 characters');
                }
                
                // License number validation
                if (this.number_license && this.number_license.length !== 17) {
                    throw new Error(Alpine.store('i18n').t('license_must_be_17_characters') || 'License number must be exactly 17 characters');
                }
                
                // Advanced notice validation
                if (this.advanced_notice && this.advanced_notice.length > 10) {
                    throw new Error(Alpine.store('i18n').t('advanced_notice_max_10_characters') || 'Advanced notice must not exceed 10 characters');
                }
                
                // Available fuel validation
                if (this.available_fuel && parseFloat(this.available_fuel) > 26) {
                    throw new Error(Alpine.store('i18n').t('available_fuel_max_26') || 'Available fuel must be less than or equal to 26');
                }
                
                // Mechanical condition validation
                const validMechanicalConditions = ['excellent', 'good', 'fair', 'poor'];
                if (this.features.mechanical_condition && !validMechanicalConditions.includes(this.features.mechanical_condition)) {
                    throw new Error(Alpine.store('i18n').t('invalid_mechanical_condition') || 'Invalid mechanical condition selected');
                }

                const formData = new FormData();

                // Basic Information
                formData.append('brand_id', this.brand_id);
                formData.append('model_id', this.model_id);
                formData.append('year_id', this.year_id);
                formData.append('price', this.price);
                if (this.description) formData.append('description', this.description);
                formData.append('user_id', this.user_id);

                // Location
                formData.append('lat', this.lat);
                formData.append('lang', this.lang);
                formData.append('address', this.address);

                // Return Location
                if (this.lat_return) formData.append('lat_return', this.lat_return);
                if (this.lang_return) formData.append('lang_return', this.lang_return);
                if (this.address_return) formData.append('address_return', this.address_return);

                // Car Details
                formData.append('vin', this.vin);
                formData.append('number_license', this.number_license);
                if (this.description_condition) formData.append('description_condition', this.description_condition);
                if (this.advanced_notice) formData.append('advanced_notice', this.advanced_notice);
                if (this.time_answer) formData.append('time_answer', this.time_answer);
                formData.append('min_day_trip', this.min_day_trip);
                formData.append('max_day_trip', this.max_day_trip);

                // Images
                this.images.forEach((image) => {
                    formData.append('images[]', image);
                });
                if (this.image_license) formData.append('image_license', this.image_license);
                this.additional_photos.forEach((photo) => {
                    formData.append('additional_photos[]', photo);
                });

                // Fuel
                if (this.fuel_capacity) formData.append('fuel_capacity', this.fuel_capacity);
                if (this.available_fuel) formData.append('available_fuel', this.available_fuel);

                // Features
                if (this.features.transmission) formData.append('features[transmission]', this.features.transmission);
                if (this.features.mechanical_condition && this.features.mechanical_condition.trim()) {
                    formData.append('features[mechanical_condition]', this.features.mechanical_condition);
                }
                if (this.features.all_have_seatbelts) formData.append('features[all_have_seatbelts]', this.features.all_have_seatbelts);
                if (this.features.num_of_door) formData.append('features[num_of_door]', this.features.num_of_door);
                if (this.features.num_of_seat) formData.append('features[num_of_seat]', this.features.num_of_seat);
                if (this.features.mileage_range) formData.append('features[mileage_range]', this.features.mileage_range);
                this.features.additional_features.forEach((feature, index) => {
                    if (feature && feature.trim()) {
                        formData.append(`features[additional_features][${index}]`, feature.trim());
                    }
                });

                // Company
                if (this.company.legal_name) formData.append('company[legal_name]', this.company.legal_name);
                if (this.company.id_employees) formData.append('company[id_employees]', this.company.id_employees);
                if (this.company.is_under_vat) formData.append('company[is_under_vat]', this.company.is_under_vat);
                if (this.company.vat_num) formData.append('company[vat_num]', this.company.vat_num);
                if (this.company.zip_code) formData.append('company[zip_code]', this.company.zip_code);
                if (this.company.country) formData.append('company[country]', this.company.country);
                if (this.company.address_1) formData.append('company[address_1]', this.company.address_1);
                if (this.company.address_2) formData.append('company[address_2]', this.company.address_2);
                if (this.company.city) formData.append('company[city]', this.company.city);
                if (this.company.image) formData.append('company[image]', this.company.image);

                // Optional (for creating new)
                if (this.brand_name) formData.append('brand_name', this.brand_name);
                if (this.model_name) formData.append('model_name', this.model_name);
                if (this.year_value) formData.append('year_value', this.year_value);

                await ApiService.updateCar(this.carId, formData);

                coloredToast('success', Alpine.store('i18n').t('car_updated_success') || 'Car updated successfully');
                
                // Redirect to cars page after 1 second
                setTimeout(() => {
                    window.location.href = 'Car.html';
                }, 1000);

            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_car') || 'Failed to update car');
            } finally {
                this.isSubmitting = false;
                loadingIndicator.hide();
            }
        }
    }));
});

function showMapError(mapElementId, returnMapElementId) {
    const mapContainers = [document.getElementById(mapElementId), document.getElementById(returnMapElementId)];
    mapContainers.forEach(container => {
        if (container) {
            container.innerHTML = `
                <div class="p-4 bg-red-100 text-red-500 rounded-md">
                    <strong x-text="$store.i18n.t('error')"></strong>: 
                    <span x-text="$store.i18n.t('failed_to_load_map')"></span>
                </div>
            `;
        }
    });
}

function loadGoogleMapsAPI(mapElementId, returnMapElementId, component) {
    // Check if Google Maps API is already loaded
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        setTimeout(() => {
            initMap(mapElementId, returnMapElementId, component);
        }, 100);
        return;
    }

    // Check if API_CONFIG is available
    if (typeof API_CONFIG === 'undefined' || !API_CONFIG.GOOGLE_MAPS_API_KEY) {
        setTimeout(() => {
            loadGoogleMapsAPI(mapElementId, returnMapElementId, component);
        }, 200);
        return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
        // Script is loading, wait for it
        existingScript.addEventListener('load', () => {
            setTimeout(() => {
                initMap(mapElementId, returnMapElementId, component);
            }, 100);
        });
        existingScript.addEventListener('error', () => {
            showMapError(mapElementId, returnMapElementId);
        });
        return;
    }

    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
        // Wait a bit to ensure everything is ready
        setTimeout(() => {
            initMap(mapElementId, returnMapElementId, component);
        }, 100);
    };
    script.onerror = (error) => {
        showMapError(mapElementId, returnMapElementId);
    };
    document.head.appendChild(script);
}

