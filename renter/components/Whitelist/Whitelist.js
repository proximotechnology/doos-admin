
let map, editMap;
let marker, editMarker;
let geocoder;
let autocomplete, editAutocomplete;
let mapInitialized = false;
let editMapInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 20; // Increased attempts to allow more time for API loading

function initMap(mapElementId, editMapElementId, component, modalComponent) {
    initAttempts++;

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        if (initAttempts >= MAX_INIT_ATTEMPTS) {
            console.error('Google Maps API failed to load after', MAX_INIT_ATTEMPTS, 'attempts');
            showMapError(mapElementId, editMapElementId);
            return;
        }
        setTimeout(() => initMap(mapElementId, editMapElementId, component, modalComponent), 500);
        return;
    }

    // Check if map element exists
    const mapElement = document.getElementById(mapElementId);
    if (!mapElement) {
        console.warn(`Map element with ID "${mapElementId}" not found. Retrying...`);
        if (initAttempts < MAX_INIT_ATTEMPTS) {
            setTimeout(() => initMap(mapElementId, editMapElementId, component, modalComponent), 300);
        }
        return;
    }

    // Prevent re-initialization
    if (mapInitialized && mapElementId === 'map') return;
    if (editMapInitialized && editMapElementId === 'edit-map') return;

    try {
        geocoder = geocoder || new google.maps.Geocoder();
        const defaultCenter = { lat: 24.7136, lng: 46.6753 }; // Riyadh

        // Initialize main map
        if (mapElementId === 'map' && !mapInitialized) {
            mapInitialized = true;
            const mapElement = document.getElementById(mapElementId);
            if (mapElement) {
                // Ensure map element has proper dimensions
                if (mapElement.offsetHeight === 0 || mapElement.offsetWidth === 0) {
                    mapElement.style.height = '500px';
                    mapElement.style.width = '100%';
                }
                map = new google.maps.Map(mapElement, {
                    center: defaultCenter,
                    zoom: 10,
                    mapTypeControl: false,
                    streetViewControl: false
                });
                // Trigger resize after a short delay to ensure map renders correctly
                setTimeout(() => {
                    if (map) {
                        google.maps.event.trigger(map, 'resize');
                        map.setCenter(defaultCenter);
                    }
                }, 100);

                marker = new google.maps.Marker({
                    map: map,
                    draggable: true,
                    animation: google.maps.Animation.DROP,
                    visible: false, // Initially hidden until user clicks or searches
                });

                const input = document.getElementById('pac-input');
                if (input) {
                    autocomplete = new google.maps.places.Autocomplete(input);
                    autocomplete.bindTo('bounds', map);

                    autocomplete.addListener('place_changed', () => {
                        const place = autocomplete.getPlace();
                        if (!place.geometry) {
                            coloredToast('danger', Alpine.store('i18n').t('no_details_available') + ': ' + place.name);
                            return;
                        }

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
                            component.address = place.formatted_address || input.value;
                        }
                    });
                }

                map.addListener('click', (e) => {
                    // Show marker when user clicks on map
                    if (marker) {
                        marker.setVisible(true);
                        marker.setPosition(e.latLng);
                        map.panTo(e.latLng);
                    }
                    placeMarkerAndPanTo(e.latLng, map, marker, 'pac-input');
                    if (component) {
                        component.lat = e.latLng.lat();
                        component.lang = e.latLng.lng();
                        // Update address from geocoder
                        if (geocoder) {
                            geocoder.geocode({ 'location': e.latLng }, (results, status) => {
                                if (status === 'OK' && results[0] && component) {
                                    component.address = results[0].formatted_address;
                                    const input = document.getElementById('pac-input');
                                    if (input) {
                                        input.value = results[0].formatted_address;
                                    }
                                }
                            });
                        }
                    }
                });

                marker.addListener('dragend', () => {
                    const position = marker.getPosition();
                    if (component) {
                        component.lat = position.lat();
                        component.lang = position.lng();
                        // Update address from geocoder
                        if (geocoder) {
                            geocoder.geocode({ 'location': position }, (results, status) => {
                                if (status === 'OK' && results[0] && component) {
                                    component.address = results[0].formatted_address;
                                    const input = document.getElementById('pac-input');
                                    if (input) {
                                        input.value = results[0].formatted_address;
                                    }
                                }
                            });
                        }
                    }
                    placeMarkerAndPanTo(position, map, marker, 'pac-input');
                });
            }
        }

        // Initialize edit map
        if (editMapElementId === 'edit-map' && !editMapInitialized) {
            const editMapElement = document.getElementById(editMapElementId);
            if (editMapElement) {
                editMapInitialized = true;
                // Ensure map element has proper dimensions
                if (editMapElement.offsetHeight === 0 || editMapElement.offsetWidth === 0) {
                    editMapElement.style.height = '500px';
                    editMapElement.style.width = '100%';
                }
                editMap = new google.maps.Map(editMapElement, {
                    center: defaultCenter,
                    zoom: 10,
                    mapTypeControl: false,
                    streetViewControl: false
                });
                // Trigger resize after a short delay to ensure map renders correctly
                setTimeout(() => {
                    if (editMap) {
                        google.maps.event.trigger(editMap, 'resize');
                        editMap.setCenter(defaultCenter);
                    }
                }, 100);

                editMarker = new google.maps.Marker({
                    map: editMap,
                    draggable: true,
                    animation: google.maps.Animation.DROP,
                    visible: false, // Initially hidden until user clicks or searches
                });

                const editInput = document.getElementById('edit-pac-input');
                if (editInput) {
                    editAutocomplete = new google.maps.places.Autocomplete(editInput);
                    editAutocomplete.bindTo('bounds', editMap);

                    editAutocomplete.addListener('place_changed', () => {
                        const place = editAutocomplete.getPlace();
                        if (!place.geometry) {
                            coloredToast('danger', Alpine.store('i18n').t('no_details_available') + ': ' + place.name);
                            return;
                        }

                        if (place.geometry.viewport) {
                            editMap.fitBounds(place.geometry.viewport);
                        } else {
                            editMap.setCenter(place.geometry.location);
                            editMap.setZoom(17);
                        }

                        editMarker.setPosition(place.geometry.location);
                        editMarker.setVisible(true);

                        if (modalComponent && modalComponent.whiteLocationData) {
                            modalComponent.whiteLocationData.lat = place.geometry.location.lat();
                            modalComponent.whiteLocationData.lang = place.geometry.location.lng();
                            modalComponent.whiteLocationData.address = place.formatted_address || editInput.value;
                        }
                    });
                }

                editMap.addListener('click', (e) => {
                    // Show marker when user clicks on map
                    if (editMarker) {
                        editMarker.setVisible(true);
                        editMarker.setPosition(e.latLng);
                        editMap.panTo(e.latLng);
                    }
                    placeMarkerAndPanTo(e.latLng, editMap, editMarker, 'edit-pac-input');
                    if (modalComponent && modalComponent.whiteLocationData) {
                        modalComponent.whiteLocationData.lat = e.latLng.lat();
                        modalComponent.whiteLocationData.lang = e.latLng.lng();
                    }
                });

                editMarker.addListener('dragend', () => {
                    const position = editMarker.getPosition();
                    if (modalComponent && modalComponent.whiteLocationData) {
                        modalComponent.whiteLocationData.lat = position.lat();
                        modalComponent.whiteLocationData.lang = position.lng();
                    }
                    placeMarkerAndPanTo(position, editMap, editMarker, 'edit-pac-input');
                });
            }
        }
    } catch (error) {
        showMapError(mapElementId, editMapElementId);
    }
}

function showMapError(mapElementId, editMapElementId) {
    const mapContainers = [document.getElementById(mapElementId), document.getElementById(editMapElementId)];
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

function loadGoogleMapsAPI(mapElementId, editMapElementId, component, modalComponent) {
    // Check if API_CONFIG is available
    if (typeof API_CONFIG === 'undefined' || !API_CONFIG.GOOGLE_MAPS_API_KEY) {
        showMapError(mapElementId, editMapElementId);
        return;
    }

    // Check if Google Maps is already loaded
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        // Wait a bit to ensure DOM is ready
        setTimeout(() => {
            initMap(mapElementId, editMapElementId, component, modalComponent);
        }, 100);
        return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
        // Script is loading, wait for it
        existingScript.addEventListener('load', () => {
            setTimeout(() => {
                initMap(mapElementId, editMapElementId, component, modalComponent);
            }, 100);
        });
        existingScript.addEventListener('error', () => {
            showMapError(mapElementId, editMapElementId);
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
            initMap(mapElementId, editMapElementId, component, modalComponent);
        }, 100);
    };
    script.onerror = (error) => {
        showMapError(mapElementId, editMapElementId);
    };
    document.head.appendChild(script);
}

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
            const whiteLocationsTableContainer = document.getElementById('whiteLocationsTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (whiteLocationsTableContainer) whiteLocationsTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const whiteLocationsTableContainer = document.getElementById('whiteLocationsTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (whiteLocationsTableContainer) whiteLocationsTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const whiteLocationsTableContainer = document.getElementById('whiteLocationsTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (whiteLocationsTableContainer) whiteLocationsTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

    Alpine.store('whiteLocationsTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="whiteLocationsTable"]'));
            if (tableComponent && tableComponent.fetchWhiteLocations) {
                await tableComponent.fetchWhiteLocations(tableComponent.currentPage);
            }
        },
        openEditModal: function (whiteLocation) {
            try {
                const modalElement = document.getElementById('editWhiteLocationModal');
                if (!modalElement) {
                    console.error('Edit modal element not found');
                    return;
                }
                
                const modalComponent = Alpine.$data(modalElement);
                if (!modalComponent) {
                    console.error('Modal component not found');
                    return;
                }
                
                modalComponent.whiteLocationData = { ...whiteLocation };
                modalComponent.open = true;
                
                // Initialize edit map when modal opens
                setTimeout(() => {
                    const editMapElement = document.getElementById('edit-map');
                    if (editMapElement) {
                        // Ensure map element has proper dimensions
                        editMapElement.style.height = '300px';
                        editMapElement.style.width = '100%';
                        editMapElement.style.minHeight = '300px';
                        editMapElement.style.maxHeight = '300px';
                        
                        // Initialize edit map if not already initialized
                        if (!editMapInitialized && typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                            editMapInitialized = true;
                            const defaultCenter = { lat: 24.7136, lng: 46.6753 };
                            
                            editMap = new google.maps.Map(editMapElement, {
                                center: defaultCenter,
                                zoom: 10,
                                mapTypeControl: false,
                                streetViewControl: false
                            });
                            
                            editMarker = new google.maps.Marker({
                                map: editMap,
                                draggable: true,
                                animation: google.maps.Animation.DROP,
                                visible: false,
                            });
                            
                            const editInput = document.getElementById('edit-pac-input');
                            if (editInput) {
                                editAutocomplete = new google.maps.places.Autocomplete(editInput);
                                editAutocomplete.bindTo('bounds', editMap);
                                
                                editAutocomplete.addListener('place_changed', () => {
                                    const place = editAutocomplete.getPlace();
                                    if (!place.geometry) return;
                                    
                                    if (place.geometry.viewport) {
                                        editMap.fitBounds(place.geometry.viewport);
                                    } else {
                                        editMap.setCenter(place.geometry.location);
                                        editMap.setZoom(17);
                                    }
                                    
                                    editMarker.setPosition(place.geometry.location);
                                    editMarker.setVisible(true);
                                    
                                    if (modalComponent && modalComponent.whiteLocationData) {
                                        modalComponent.whiteLocationData.lat = place.geometry.location.lat();
                                        modalComponent.whiteLocationData.lang = place.geometry.location.lng();
                                        modalComponent.whiteLocationData.address = place.formatted_address || editInput.value;
                                    }
                                });
                            }
                            
                            editMap.addListener('click', (e) => {
                                if (editMarker) {
                                    editMarker.setVisible(true);
                                    editMarker.setPosition(e.latLng);
                                    editMap.panTo(e.latLng);
                                }
                                placeMarkerAndPanTo(e.latLng, editMap, editMarker, 'edit-pac-input');
                                if (modalComponent && modalComponent.whiteLocationData) {
                                    modalComponent.whiteLocationData.lat = e.latLng.lat();
                                    modalComponent.whiteLocationData.lang = e.latLng.lng();
                                }
                            });
                            
                            editMarker.addListener('dragend', () => {
                                const position = editMarker.getPosition();
                                if (modalComponent && modalComponent.whiteLocationData) {
                                    modalComponent.whiteLocationData.lat = position.lat();
                                    modalComponent.whiteLocationData.lang = position.lng();
                                }
                                placeMarkerAndPanTo(position, editMap, editMarker, 'edit-pac-input');
                            });
                            
                            setTimeout(() => {
                                if (editMap) {
                                    google.maps.event.trigger(editMap, 'resize');
                                }
                            }, 200);
                        }
                        
                        // Wait for map to be ready and set location
                        setTimeout(() => {
                            if (whiteLocation.lat && whiteLocation.lang && editMap && editMarker) {
                                const position = new google.maps.LatLng(parseFloat(whiteLocation.lat), parseFloat(whiteLocation.lang));
                                placeMarkerAndPanTo(position, editMap, editMarker, 'edit-pac-input');
                                if (geocoder) {
                                    geocoder.geocode({ 'location': position }, (results, status) => {
                                        if (status === 'OK' && results[0]) {
                                            const editInput = document.getElementById('edit-pac-input');
                                            if (editInput) {
                                                editInput.value = results[0].formatted_address;
                                            }
                                        }
                                    });
                                }
                            }
                        }, 500);
                    }
                }, 200);
            } catch (error) {
                console.error('Error opening edit modal:', error);
                coloredToast('danger', 'Failed to open edit modal');
            }
        },
        updateWhiteLocation: async function (whiteLocationId) {
            try {
                const modalElement = document.getElementById('editWhiteLocationModal');
                if (!modalElement) {
                    coloredToast('danger', 'Modal not found');
                    return;
                }
                
                const modalComponent = Alpine.$data(modalElement);
                if (!modalComponent) {
                    coloredToast('danger', 'Modal component not found');
                    return;
                }

                modalComponent.isUpdating = true;
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const data = await ApiService.updateWhiteLocation(whiteLocationId, {
                    address: modalComponent.whiteLocationData.address,
                    lat: modalComponent.whiteLocationData.lat,
                    lang: modalComponent.whiteLocationData.lang,
                });

                coloredToast('success', Alpine.store('i18n').t('white_location_updated_success'));
                modalComponent.open = false;
                await this.refreshTable();
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
                const modalElement = document.getElementById('editWhiteLocationModal');
                if (modalElement) {
                    const modalComponent = Alpine.$data(modalElement);
                    if (modalComponent) {
                        modalComponent.isUpdating = false;
                    }
                }
            }
        },
        confirmDeleteWhiteLocation: async function (whiteLocationId) {
            try {
                const tableComponent = Alpine.$data(document.querySelector('[x-data="whiteLocationsTable"]'));
                if (tableComponent && tableComponent.confirmDeleteWhiteLocation) {
                    await tableComponent.confirmDeleteWhiteLocation(whiteLocationId);
                } else {
                    // Fallback: delete directly from store
                    loadingIndicator.show();
                    await ApiService.deleteWhiteLocation(whiteLocationId);
                    coloredToast('success', Alpine.store('i18n').t('white_location_deleted_success'));
                    await this.refreshTable();
                    loadingIndicator.hide();
                }
            } catch (error) {
                loadingIndicator.hide();
                coloredToast('danger', error.message || Alpine.store('i18n').t('error_delete_white_location'));
            }
        }
    });

    Alpine.data('whiteLocationsTable', () => ({
        tableData: [],
        paginationMeta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
            from: 0,
            to: 0,
            links: []
        },
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,

        async init() {
            await this.fetchWhiteLocations(1);
            
            // Wait for component to be loaded before initializing maps
            setTimeout(() => {
                try {
                    const addWhiteLocationElement = document.querySelector('[x-data="Add_White_Location"]');
                    const addWhiteLocationComponent = addWhiteLocationElement ? Alpine.$data(addWhiteLocationElement) : null;
                    
                    const modalElement = document.getElementById('editWhiteLocationModal');
                    const modalComponent = modalElement ? Alpine.$data(modalElement) : null;
                    
                    if (addWhiteLocationComponent) {
                        loadGoogleMapsAPI('map', 'edit-map', addWhiteLocationComponent, modalComponent);
                    }
                } catch (error) {
                    console.error('Error initializing maps in table init:', error);
                }
            }, 500);

            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const whiteLocationId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteWhiteLocation(whiteLocationId);
                }
                if (e.target.closest('.update-btn')) {
                    const whiteLocationId = e.target.closest('.update-btn').dataset.id;
                    const whiteLocation = this.tableData.find(s => s.id == whiteLocationId);
                    if (whiteLocation) {
                        Alpine.store('whiteLocationsTable').openEditModal(whiteLocation);
                    }
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchWhiteLocations(page);
                }
            });
        },

        async fetchWhiteLocations(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = parseInt(page);

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getWhiteLocations(page);
                if (data.success && Array.isArray(data.data)) {
                    this.tableData = data.data;
                    this.paginationMeta = {
                        current_page: data.pagination?.current_page || 1,
                        last_page: data.pagination?.last_page || 1,
                        per_page: data.pagination?.per_page || 10,
                        total: data.pagination?.total || 0,
                        from: data.pagination?.from || 0,
                        to: data.pagination?.to || 0,
                        links: []
                    };

                    if (this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2 rtl:space-x-reverse">';

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

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((whiteLocation, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(whiteLocation.address),
                this.formatCoordinates(whiteLocation.lat, whiteLocation.lang),
                this.getLocationLink(whiteLocation.lat, whiteLocation.lang),
                this.getActionButtons(whiteLocation.id),
            ]);

            const tableElement = document.getElementById('whiteLocationsDataTable');
            if (!tableElement) {
                console.error('Table element not found');
                loadingIndicator.showEmptyState();
                return;
            }
            this.datatable = new simpleDatatables.DataTable(tableElement, {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('address'),
                        Alpine.store('i18n').t('coordinates'),
                        Alpine.store('i18n').t('location'),
                        `<div class="text-center">${Alpine.store('i18n').t('actions')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
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
                    bottom: this.generatePaginationHTML() + '{info}{select}{pager}',
                },
            });
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        formatCoordinates(lat, lang) {
            return `Lat: ${lat ? parseFloat(lat).toFixed(6) : 'N/A'}<br>Lng: ${lang ? parseFloat(lang).toFixed(6) : 'N/A'}`;
        },

        getLocationLink(lat, lang) {
            if (!lat || !lang) return Alpine.store('i18n').t('na');
            return `
                <a href="https://maps.google.com/?q=${lat},${lang}" target="_blank" class="flex items-center text-primary hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span x-text="$store.i18n.t('view_on_map')"></span>
                </a>`;
        },

        getActionButtons(whiteLocationId) {
            return `
                <div class="flex items-center justify-center gap-2">
                    <button 
                        class="update-btn flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-1.5 text-warning transition-all hover:bg-warning/20 hover:shadow-md" 
                        data-id="${whiteLocationId}"
                        title="${Alpine.store('i18n').t('edit_white_location')}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span class="text-xs font-medium">${Alpine.store('i18n').t('edit')}</span>
                    </button>
                    <button 
                        class="delete-btn flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-danger transition-all hover:bg-danger/20 hover:shadow-md" 
                        data-id="${whiteLocationId}"
                        title="${Alpine.store('i18n').t('delete_white_location')}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span class="text-xs font-medium">${Alpine.store('i18n').t('delete')}</span>
                    </button>
                </div>`;
        },

        async deleteWhiteLocation(whiteLocationId) {
            try {
                const whiteLocation = this.tableData.find(s => s.id == whiteLocationId);
                if (!whiteLocation) return;

                // Open delete modal
                const deleteModalElement = document.getElementById('deleteWhiteLocationModal');
                if (deleteModalElement) {
                    const modalData = Alpine.$data(deleteModalElement);
                    if (modalData) {
                        modalData.whiteLocationId = whiteLocationId;
                        modalData.whiteLocationAddress = whiteLocation.address || '';
                        modalData.open = true;
                    }
                } else {
                    console.error('Delete modal element not found');
                    // Fallback to SweetAlert2 if modal not found
                    const deleteConfirmed = await Swal.fire({
                        title: Alpine.store('i18n').t('delete_confirm_title'),
                        text: Alpine.store('i18n').t('delete_confirm_text'),
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: Alpine.store('i18n').t('delete_confirm_button'),
                        cancelButtonText: Alpine.store('i18n').t('cancel')
                    });

                    if (deleteConfirmed.isConfirmed) {
                        await this.confirmDeleteWhiteLocation(whiteLocationId);
                    }
                }
            } catch (error) {
                console.error('Error opening delete modal:', error);
                coloredToast('danger', 'Failed to open delete modal');
            }
        },
        
        async confirmDeleteWhiteLocation(whiteLocationId) {
            try {
                loadingIndicator.show();
                await ApiService.deleteWhiteLocation(whiteLocationId);
                coloredToast('success', Alpine.store('i18n').t('white_location_deleted_success'));
                await this.fetchWhiteLocations(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('error_delete_white_location'));
            } finally {
                loadingIndicator.hide();
            }
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message
            });
        },

        getPaginationIcon(type) {
            const icons = {
                first: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>',
                last: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>',
                prev: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
                next: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
            };
            return icons[type];
        }
    }));

    Alpine.data('Add_White_Location', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        address: '',
        lat: '',
        lang: '',

        init() {
            // Initialize map after component is ready
            this.$nextTick(() => {
                // Wait for DOM to be ready and API_CONFIG to be available
                const checkAndInit = () => {
                    const mapElement = document.getElementById('map');
                    if (mapElement && typeof API_CONFIG !== 'undefined' && API_CONFIG.GOOGLE_MAPS_API_KEY) {
                        try {
                            const addWhiteLocationElement = document.querySelector('[x-data="Add_White_Location"]');
                            const component = addWhiteLocationElement ? Alpine.$data(addWhiteLocationElement) : null;
                            
                            const modalElement = document.getElementById('editWhiteLocationModal');
                            const modalComponent = modalElement ? Alpine.$data(modalElement) : null;
                            
                            if (component) {
                                loadGoogleMapsAPI('map', 'edit-map', component, modalComponent);
                            }
                        } catch (error) {
                            console.error('Error initializing map:', error);
                            // Retry after a short delay
                            setTimeout(checkAndInit, 200);
                        }
                    } else {
                        // Retry after a short delay
                        setTimeout(checkAndInit, 200);
                    }
                };
                setTimeout(checkAndInit, 500);
            });
        },

        async Add_White_Location() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_missing'));

                await ApiService.addWhiteLocation({
                    address: this.address,
                    lat: this.lat,
                    lang: this.lang,
                });

                this.address = '';
                this.lat = '';
                this.lang = '';
                document.getElementById('pac-input').value = '';
                if (marker) marker.setPosition(null);

                coloredToast('success', Alpine.store('i18n').t('white_location_added_success'));
                await Alpine.store('whiteLocationsTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        }
    }));

    function coloredToast(color, message) {
        const icon = color === 'success' ? 'success' : 'error';
        Swal.fire({
            toast: true,
            position: 'bottom-start',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            customClass: { popup: `color-${color}` },
        });
    }
});
