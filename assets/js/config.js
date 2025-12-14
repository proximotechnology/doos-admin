// config.js
// This file uses environment variables loaded from env-loader.js
// Make sure env-loader.js is loaded before this file

window.API_CONFIG = {
    // Use environment variables if available, otherwise fallback to defaults
    BASE_URL_Renter: window.ENV?.BASE_URL_RENTER || 'https://api.doosdoostest.com',
    BASE_URL_Uber: window.ENV?.BASE_URL_UBER || 'https://api.doosdoos.com/api/v1',

    ENDPOINTS: {
        LOGIN: window.ENV?.API_ENDPOINT_LOGIN || '/api/login',
    },

    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },

    // Pusher Configuration
    PUSHER: {
        APP_KEY: window.ENV?.PUSHER_APP_KEY || '300f5928f422763f16ed',
        CLUSTER: window.ENV?.PUSHER_CLUSTER || 'mt1',
        CHANNEL_PREFIX: window.ENV?.PUSHER_CHANNEL_PREFIX || 'chat-private-channel',
        TICKET_CHANNEL_PREFIX: window.ENV?.PUSHER_TICKET_CHANNEL_PREFIX || 'admin',
        TICKET_APP_KEY: window.ENV?.PUSHER_TICKET_APP_KEY || '992cf05af72bfbe2f2e8',
        TICKET_EVENT: 'chat.ticket',
    },

    // Google Maps
    GOOGLE_MAPS_API_KEY: window.ENV?.GOOGLE_MAPS_API_KEY || 'AIzaSyC5eqWELYeuHhL0gLu4BVHjbksnLlKA2uI',

    // Site Configuration
    SITE_URL: window.ENV?.SITE_URL || 'https://admin.doosdoostest.com',
    SITE_NAME: window.ENV?.SITE_NAME || 'Doos Admin Dashboard',

    // Environment
    ENV: window.ENV?.ENV || 'production',
    DEBUG: window.ENV?.DEBUG || false,
};
