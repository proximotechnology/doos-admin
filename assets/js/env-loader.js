/**
 * Environment Variable Loader
 * 
 * This script loads environment variables from a .env file
 * and makes them available to the application via window.ENV
 * 
 * Usage: Include this script before config.js in your HTML files
 */

(function() {
    'use strict';

    // Default environment variables (fallback values)
    const defaultEnv = {
        VITE_BASE_URL_RENTER: 'https://api.doosdoostest.com',
        VITE_BASE_URL_UBER: 'https://api.doosdoos.com/api/v1',
        VITE_API_ENDPOINT_LOGIN: '/api/login',
        VITE_PUSHER_APP_KEY: '0c6840048793ecd5b54f',
        VITE_PUSHER_CLUSTER: 'mt1',
        VITE_PUSHER_CHANNEL_PREFIX: 'chat-private-channel',
        VITE_GOOGLE_MAPS_API_KEY: 'AIzaSyC5eqWELYeuHhL0gLu4BVHjbksnLlKA2uI',
        VITE_SITE_URL: 'https://admin.doosdoostest.com',
        VITE_SITE_NAME: 'Doos Admin Dashboard',
        VITE_ENV: 'production',
        VITE_DEBUG: 'false'
    };

    // Try to load from .env file via fetch (for development)
    // In production, these should be set via build process or server-side injection
    let envVars = { ...defaultEnv };

    // Method 1: Check for inline script with env vars (server-side injection)
    const envScript = document.querySelector('script[type="application/env"]');
    if (envScript) {
        try {
            const injectedEnv = JSON.parse(envScript.textContent);
            envVars = { ...defaultEnv, ...injectedEnv };
        } catch (e) {
            // Silently handle parsing error
        }
    }

    // Method 2: Check for meta tags (alternative injection method)
    const envMeta = document.querySelector('meta[name="env-config"]');
    if (envMeta) {
        try {
            const injectedEnv = JSON.parse(envMeta.getAttribute('content'));
            envVars = { ...defaultEnv, ...injectedEnv };
        } catch (e) {
            // Silently handle parsing error
        }
    }

    // Method 3: Check localStorage (for development/testing)
    if (typeof Storage !== 'undefined') {
        const storedEnv = localStorage.getItem('app_env');
        if (storedEnv) {
            try {
                const parsedEnv = JSON.parse(storedEnv);
                envVars = { ...defaultEnv, ...parsedEnv };
            } catch (e) {
                // Silently handle parsing error
            }
        }
    }

    // Expose environment variables to window
    window.ENV = {
        // API URLs
        BASE_URL_RENTER: envVars.VITE_BASE_URL_RENTER || defaultEnv.VITE_BASE_URL_RENTER,
        BASE_URL_UBER: envVars.VITE_BASE_URL_UBER || defaultEnv.VITE_BASE_URL_UBER,
        
        // API Endpoints
        API_ENDPOINT_LOGIN: envVars.VITE_API_ENDPOINT_LOGIN || defaultEnv.VITE_API_ENDPOINT_LOGIN,
        
        // Pusher Configuration
        PUSHER_APP_KEY: envVars.VITE_PUSHER_APP_KEY || defaultEnv.VITE_PUSHER_APP_KEY,
        PUSHER_CLUSTER: envVars.VITE_PUSHER_CLUSTER || defaultEnv.VITE_PUSHER_CLUSTER,
        PUSHER_CHANNEL_PREFIX: envVars.VITE_PUSHER_CHANNEL_PREFIX || defaultEnv.VITE_PUSHER_CHANNEL_PREFIX,
        
        // Google Maps
        GOOGLE_MAPS_API_KEY: envVars.VITE_GOOGLE_MAPS_API_KEY || defaultEnv.VITE_GOOGLE_MAPS_API_KEY,
        
        // Site Configuration
        SITE_URL: envVars.VITE_SITE_URL || defaultEnv.VITE_SITE_URL,
        SITE_NAME: envVars.VITE_SITE_NAME || defaultEnv.VITE_SITE_NAME,
        
        // Environment
        ENV: envVars.VITE_ENV || defaultEnv.VITE_ENV,
        DEBUG: envVars.VITE_DEBUG === 'true' || envVars.VITE_DEBUG === true,
        
        // Helper method to get all env vars
        getAll: function() {
            return envVars;
        },
        
        // Helper method to set env vars (for development)
        set: function(key, value) {
            envVars[key] = value;
            if (typeof Storage !== 'undefined') {
                localStorage.setItem('app_env', JSON.stringify(envVars));
            }
            // Update window.ENV
            this[key] = value;
        }
    };

    // Log environment info in debug mode
    if (window.ENV.DEBUG) {
    }
})();

