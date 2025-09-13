let map, editMap;
let marker, editMarker;
let geocoder;
let autocomplete, editAutocomplete;
let mapInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 10; // Reduced attempts for faster failure

function initMap(mapElementId, editMapElementId, component, modalComponent) {
    if (mapInitialized) return;

    initAttempts++;

    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        if (initAttempts >= MAX_INIT_ATTEMPTS) {
            console.error('Google Maps API failed to load after multiple attempts');
            showMapError(mapElementId, editMapElementId);
            return;
        }
        setTimeout(() => initMap(mapElementId, editMapElementId, component, modalComponent), 300);
        return;
    }

    try {
        mapInitialized = true;
        geocoder = new google.maps.Geocoder();
        const defaultCenter = { lat: 24.7136, lng: 46.6753 }; // Riyadh

        // Initialize main map
        const mapElement = document.getElementById(mapElementId);
        if (mapElement) {
            map = new google.maps.Map(mapElement, {
                center: defaultCenter,
                zoom: 10,
                mapTypeControl: false,
                streetViewControl: false
            });

            marker = new google.maps.Marker({
                map: map,
                draggable: true,
                animation: google.maps.Animation.DROP,
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
                    }
                });
            }

            map.addListener('click', (e) => {
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

        // Initialize edit map
        const editMapElement = document.getElementById(editMapElementId);
        if (editMapElement) {
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

                    if (modalComponent && modalComponent.stationData) {
                        modalComponent.stationData.lat = place.geometry.location.lat();
                        modalComponent.stationData.lang = place.geometry.location.lng();
                    }
                });
            }

            editMap.addListener('click', (e) => {
                placeMarkerAndPanTo(e.latLng, editMap, editMarker, 'edit-pac-input');
                if (modalComponent && modalComponent.stationData) {
                    modalComponent.stationData.lat = e.latLng.lat();
                    modalComponent.stationData.lang = e.latLng.lng();
                }
            });

            editMarker.addListener('dragend', () => {
                const position = editMarker.getPosition();
                if (modalComponent && modalComponent.stationData) {
                    modalComponent.stationData.lat = position.lat();
                    modalComponent.stationData.lang = position.lng();
                }
                placeMarkerAndPanTo(position, editMap, editMarker, 'edit-pac-input');
            });
        }
    } catch (error) {
        console.error('Error in initMap:', error);
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
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        initMap(mapElementId, editMapElementId, component, modalComponent);
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => initMap(mapElementId, editMapElementId, component, modalComponent);
    script.onerror = () => {
        console.error('Failed to load Google Maps API');
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
            document.getElementById('tableLoading')?.classList.remove('hidden');
            document.getElementById('stationsDataTable')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('stationsDataTable')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('stationsDataTable')?.classList.add('hidden');
            document.getElementById('tableLoading')?.classList.add('hidden');
        }
    };

    Alpine.store('stationsTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="stationsTable"]'));
            if (tableComponent && tableComponent.fetchStations) {
                await tableComponent.fetchStations(tableComponent.currentPage);
            }
        },
        openEditModal: function (station) {
            const modalComponent = Alpine.$data(document.querySelector('[x-data="{ open: false, stationData: {} }"]'));
            if (modalComponent) {
                modalComponent.stationData = { ...station };
                modalComponent.open = true;
                setTimeout(() => {
                    if (station.lat && station.lang && editMap && editMarker) {
                        const position = new google.maps.LatLng(parseFloat(station.lat), parseFloat(station.lang));
                        placeMarkerAndPanTo(position, editMap, editMarker, 'edit-pac-input');
                        geocoder.geocode({ 'location': position }, (results, status) => {
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

    Alpine.data('stationsTable', () => ({
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
            const addStationComponent = Alpine.$data(document.querySelector('[x-data="Add_Station"]'));
            const modalComponent = Alpine.$data(document.querySelector('[x-data="{ open: false, stationData: {} }"]'));
            loadGoogleMapsAPI('map', 'edit-map', addStationComponent, modalComponent);
            await this.fetchStations(1);

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
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchStations(page);
                }
            });
        },

        async fetchStations(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = parseInt(page);

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const queryParams = new URLSearchParams({ page, per_page: 10 });
                const response = await fetch(`${this.apiBaseUrl}/api/admin/stations/get_all?${queryParams.toString()}`, {
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
                if (Array.isArray(data.data.data)) {
                    this.tableData = data.data.data;
                    this.paginationMeta = {
                        current_page: data.data.current_page || 1,
                        last_page: data.data.last_page || 1,
                        per_page: data.data.per_page || 10,
                        total: data.data.total || 0,
                        from: data.data.from || 0,
                        to: data.data.to || 0,
                        links: data.data.links || []
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
                console.error('Error fetching stations:', error);
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

            const mappedData = this.tableData.map((station, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
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

        getActionButtons(stationId) {
            return `
                <div class="flex items-center justify-center gap-1">
                    <button class="btn update-btn btn-warning btn-sm rounded-md px-3 py-1" data-id="${stationId}">
                        ${Alpine.store('i18n').t('edit')}
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn rounded-md px-3 py-1" data-id="${stationId}">
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

            if (!deleteConfirmed.isConfirmed) return;

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
                await this.fetchStations(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('error_delete_station'));
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

    Alpine.data('Add_Station', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        name: '',
        lat: '',
        lang: '',

        async Add_Station() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_missing'));

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
                    const errorMsg = result.message || Object.values(result.errors || {}).flat().join('\n') || Alpine.store('i18n').t('error_create_station');
                    throw new Error(errorMsg);
                }

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
