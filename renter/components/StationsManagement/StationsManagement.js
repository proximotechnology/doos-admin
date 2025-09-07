let map, editMap;
let marker, editMarker;
let geocoder;
let autocomplete, editAutocomplete;
let mapInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 20; // Limit retry attempts

function initMap() {
    if (mapInitialized) return;

    initAttempts++;

    // Check if Google Maps API is fully loaded
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {

        if (initAttempts >= MAX_INIT_ATTEMPTS) {
            console.error('Google Maps API failed to load after multiple attempts');
            showMapError();
            return;
        }

        setTimeout(initMap, 300);
        return;
    }

    try {
        mapInitialized = true;

        geocoder = new google.maps.Geocoder();

        // Default center (you can change this to your preferred location)
        const defaultCenter = { lat: 24.7136, lng: 46.6753 }; // Riyadh coordinates

        // Initialize main map
        map = new google.maps.Map(document.getElementById('map'), {
            center: defaultCenter,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false
        });

        // Initialize edit map
        editMap = new google.maps.Map(document.getElementById('edit-map'), {
            center: defaultCenter,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false
        });

        // Initialize autocomplete for main form
        const input = document.getElementById('pac-input');
        if (input) {
            autocomplete = new google.maps.places.Autocomplete(input);
            autocomplete.bindTo('bounds', map);
        }

        // Initialize autocomplete for edit form
        const editInput = document.getElementById('edit-pac-input');
        if (editInput) {
            editAutocomplete = new google.maps.places.Autocomplete(editInput);
            editAutocomplete.bindTo('bounds', editMap);
        }

        // Create initial marker for main map
        marker = new google.maps.Marker({
            map: map,
            draggable: true,
            animation: google.maps.Animation.DROP,
        });

        // Create initial marker for edit map
        editMarker = new google.maps.Marker({
            map: editMap,
            draggable: true,
            animation: google.maps.Animation.DROP,
        });

        // Setup autocomplete for main form
        if (autocomplete) {
            autocomplete.addListener('place_changed', function () {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    window.alert("No details available for: " + place.name);
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

                // Update Alpine.js data
                const component = Alpine.$data(document.querySelector('[x-data="Add_Station"]'));
                if (component) {
                    component.lat = place.geometry.location.lat();
                    component.lang = place.geometry.location.lng();
                }
            });
        }

        // Setup autocomplete for edit form
        if (editAutocomplete) {
            editAutocomplete.addListener('place_changed', function () {
                const place = editAutocomplete.getPlace();
                if (!place.geometry) {
                    window.alert("No details available for: " + place.name);
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

                // Update Alpine.js data
                const modalComponent = Alpine.$data(document.querySelector('[x-data="{ open: false, stationData: {} }"]'));
                if (modalComponent && modalComponent.stationData) {
                    modalComponent.stationData.lat = place.geometry.location.lat();
                    modalComponent.stationData.lang = place.geometry.location.lng();
                }
            });
        }

        // Add click listener to main map
        map.addListener('click', function (e) {
            placeMarkerAndPanTo(e.latLng, map, marker);

            // Update Alpine.js data
            const component = Alpine.$data(document.querySelector('[x-data="Add_Station"]'));
            if (component) {
                component.lat = e.latLng.lat();
                component.lang = e.latLng.lng();
            }
        });

        // Add click listener to edit map
        editMap.addListener('click', function (e) {
            placeMarkerAndPanTo(e.latLng, editMap, editMarker);

            // Update Alpine.js data
            const modalComponent = Alpine.$data(document.querySelector('[x-data="{ open: false, stationData: {} }"]'));
            if (modalComponent && modalComponent.stationData) {
                modalComponent.stationData.lat = e.latLng.lat();
                modalComponent.stationData.lang = e.latLng.lng();
            }
        });

        // Add dragend listener to markers
        marker.addListener('dragend', function () {
            const position = marker.getPosition();

            // Update Alpine.js data
            const component = Alpine.$data(document.querySelector('[x-data="Add_Station"]'));
            if (component) {
                component.lat = position.lat();
                component.lang = position.lng();
            }
        });

        editMarker.addListener('dragend', function () {
            const position = editMarker.getPosition();

            // Update Alpine.js data
            const modalComponent = Alpine.$data(document.querySelector('[x-data="{ open: false, stationData: {} }"]'));
            if (modalComponent && modalComponent.stationData) {
                modalComponent.stationData.lat = position.lat();
                modalComponent.stationData.lang = position.lng();
            }
        });

    } catch (error) {
        console.error('Error in initMap:', error);
        showMapError();
    }
}

function showMapError() {
    // Show error message to user
    const mapContainers = document.querySelectorAll('#map, #edit-map');
    mapContainers.forEach(container => {
        if (container) {
            container.innerHTML = `
                <div class="p-4 bg-danger-100 text-danger-500 rounded-md">
                    <strong>Error:</strong> Google Maps failed to load. 
                    Please check your internet connection and try again.
                </div>
            `;
        }
    });
}

function placeMarkerAndPanTo(latLng, map, marker) {
    if (!marker || !map) return;

    marker.setPosition(latLng);
    map.panTo(latLng);

    // Reverse geocode to get address
    if (geocoder) {
        geocoder.geocode({ 'location': latLng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    const input = map === window.map ?
                        document.getElementById('pac-input') :
                        document.getElementById('edit-pac-input');
                    if (input) {
                        input.value = results[0].formatted_address;
                    }
                }
            }
        });
    }
}





function loadGoogleMapsAPI() {
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        initMap();
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onerror = function () {
        console.error('Failed to load Google Maps API');
        showMapError();
    };
    document.head.appendChild(script);
}

// Initialize when Alpine is ready
document.addEventListener('alpine:init', () => {
    // Start trying to initialize the map

    // Rest of your Alpine initialization code...
    if (!Alpine.store('i18n').t('select_location')) {
        Alpine.store('i18n').t('select_location', 'Select Location on Map');
    }
    if (!Alpine.store('i18n').t('search_location')) {
        Alpine.store('i18n').t('search_location', 'Search for a location...');
    }

    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
        },
        showTableLoader: function () {
            document.getElementById('tableLoading').classList.remove('hidden');
            document.getElementById('stationsDataTable').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('stationsDataTable').classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('stationsDataTable').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
        }
    };

    // Store for shared functions
    Alpine.store('stationsTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="stationsTable"]'));
            if (tableComponent && tableComponent.fetchStations) {
                await tableComponent.fetchStations();
            }
        },

        openEditModal: function (station) {
            const modalComponent = Alpine.$data(document.querySelector('[x-data="{ open: false, stationData: {} }"]'));
            if (modalComponent) {
                modalComponent.stationData = { ...station };
                modalComponent.open = true;

                // Set map position when modal opens
                setTimeout(() => {
                    if (station.lat && station.lang) {
                        const position = new google.maps.LatLng(parseFloat(station.lat), parseFloat(station.lang));
                        placeMarkerAndPanTo(position, editMap, editMarker);

                        // Geocode to get address
                        geocoder.geocode({ 'location': position }, function (results, status) {
                            if (status === 'OK' && results[0]) {
                                document.getElementById('edit-pac-input').value = results[0].formatted_address;
                            }
                        });
                    }
                }, 300);
            }
        },

        updateStation: async function (stationId) {
            try {
                loadingIndicator.show();

                const modalComponent = Alpine.$data(document.querySelector('[x-data="{ open: false, stationData: {} }"]'));
                if (!modalComponent) return;

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${API_CONFIG.BASE_URL_Renter}/api/admin/stations/update/${stationId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: modalComponent.stationData.name,
                        lat: modalComponent.stationData.lat,
                        lang: modalComponent.stationData.lang,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || Alpine.store('i18n').t('failed_update_station'));
                }

                coloredToast('success', Alpine.store('i18n').t('station_updated_success'));
                modalComponent.open = false;
                await this.refreshTable();
            } catch (error) {
                console.error('Error updating station:', error);
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        }
    });

    // Stations table component
    Alpine.data('stationsTable', () => ({
        tableData: [],
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        async init() {
            await this.fetchStations();
            loadGoogleMapsAPI();
            // Event Delegation for Delete Buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const stationId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteStation(stationId);
                }
                if (e.target.closest('.update-btn')) {
                    const stationId = e.target.closest('.update-btn').dataset.id;
                    const station = this.tableData.find(s => s.id == stationId);
                    if (station) {
                        Alpine.store('stationsTable').openEditModal(station);
                    }
                }
            });
        },

        async fetchStations() {
            try {
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/stations/get_all`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_fetch_stations'));
                }

                const data = await response.json();
                this.tableData = data.data || [];

                if (this.tableData.length === 0) {
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
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((station, index) => [
                this.formatText(index + 1),
                this.formatText(station.name),
                this.formatCoordinates(station.lat, station.lang),
                this.getLocationLink(station.lat, station.lang),
                this.getActionButtons(station.id),
            ]);

            this.datatable = new simpleDatatables.DataTable('#stationsDataTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
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
                    bottom: '{info}{select}{pager}',
                },
            });
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        formatCoordinates(lat, lang) {
            return `Lat: ${lat || 'N/A'}<br>Lng: ${lang || 'N/A'}`;
        },

        getLocationLink(lat, lang) {
            if (!lat || !lang) return Alpine.store('i18n').t('na');

            return `
                        <a href="https://maps.google.com/?q=${lat},${lang}" target="_blank" class="flex items-center text-primary hover:underline">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="mr-1 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            <span x-text="$store.i18n.t('view_on_map')"></span>
                        </a>`;
        },

        getActionButtons(stationId) {
            return `
                        <div class="flex items-center justify-center gap-1">
                            <button class="btn update-btn btn-warning" data-id="${stationId}">
                                ${Alpine.store('i18n').t('edit')}
                            </button>

                            <button class="btn btn-sm btn-danger delete-btn ml-2" data-id="${stationId}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path opacity="0.5" d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path d="M18.8334 8.5L18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path opacity="0.5" d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path opacity="0.5" d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                            </button>
                </div>`;
        },

        async deleteStation(stationId) {
            const deleteConfirmed = await new Promise((resolve) => {
                Swal.fire({
                    title: Alpine.store('i18n').t('delete_confirm_title'),
                    text: Alpine.store('i18n').t('delete_confirm_text'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('delete_confirm_button'),
                }).then((result) => {
                    resolve(result.isConfirmed);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/stations/delete/${stationId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_delete_station'));

                coloredToast('success', Alpine.store('i18n').t('station_deleted_success'));
                await this.fetchStations();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('error_delete_station'));
            } finally {
                loadingIndicator.hide();
            }
        },

        getPaginationIcon(type) {
            const icons = {
                first: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>',
                last: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>',
                prev: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
                next: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
            };
            return icons[type];
        },
    }));

    // Add station form component
    Alpine.data('Add_Station', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        name: '',
        lat: '',
        lang: '',

        async Add_Station() {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const response = await fetch(`${this.apiBaseUrl}/api/admin/stations/store`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: this.name,
                        lat: this.lat,
                        lang: this.lang,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    const errorMsg =
                        result.message ||
                        Object.values(result.errors || {})
                            .flat()
                            .join('\n') ||
                        Alpine.store('i18n').t('error_create_station');
                    throw new Error(errorMsg);
                }

                // Reset form
                this.name = '';
                this.lat = '';
                this.lang = '';
                document.getElementById('pac-input').value = '';
                if (marker) marker.setPosition(null);

                coloredToast('success', Alpine.store('i18n').t('station_added_success'));
                await Alpine.store('stationsTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },
    }));

    // Toast notification function
    coloredToast = (color, message) => {
        const icon = color === 'success' ? 'success' : 'error';
        Swal.fire({
            toast: true,
            position: 'bottom-start',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            customClass: {
                popup: `color-${color}`,
            },
        });
    };
});

