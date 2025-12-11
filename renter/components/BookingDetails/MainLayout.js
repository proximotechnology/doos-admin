/**
 * BookingDetails MainLayout
 * 
 * Uses ComponentLoader for efficient component loading.
 * Loads Header, Sidebar, ThemeCustomizer, and BookingDetails component.
 */

// Function to wait for ComponentLoader to be available
function waitForComponentLoader(maxAttempts = 50, interval = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkLoader = () => {
            attempts++;
            const loader = window.ComponentLoader;
            
            if (loader && typeof loader.loadStandardLayout === 'function') {
                resolve(loader);
            } else if (attempts >= maxAttempts) {
                reject(new Error('ComponentLoader not available after ' + maxAttempts + ' attempts'));
            } else {
                setTimeout(checkLoader, interval);
            }
        };
        
        checkLoader();
    });
}

// Wait for Alpine to be fully initialized before loading components
document.addEventListener('alpine:initialized', async function () {
    // Small delay to ensure all Alpine components are registered
    setTimeout(async () => {
        // Try to use ComponentLoader, fallback to old method if not available
        waitForComponentLoader()
            .then(async loader => {
                // Use ComponentLoader to load standard layout + BookingDetails component
                // Note: Component scripts are already loaded in BookingDetails.html, so we only load HTML
                await loader.loadStandardLayout([
                    { 
                        url: 'components/BookingDetails/BookingDetails.html', 
                        containerId: 'booking-details-container',
                        options: { 
                            loadScript: false  // Script already loaded in BookingDetails.html
                        }
                    },
                    { 
                        url: 'components/BookingDetails/Modals/UpdateExceptionStatusModal.html', 
                        containerId: 'update-exception-status-modal-container',
                        options: { 
                            loadScript: false  // Script already loaded in BookingDetails.html
                        }
                    }
                ]);
            })
            .catch(error => {
                // Fallback to old method
                loadComponentFallback('components/Header/Header.html', 'header-container');
                loadComponentFallback('components/Sidebar/Sidebar.html', 'sidebar-container');
                loadComponentFallback('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
                loadComponentFallback('components/BookingDetails/BookingDetails.html', 'booking-details-container');
            });
    }, 100);
});

// Fallback function if ComponentLoader is not available
async function loadComponentFallback(url, containerId) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = data;
        }
    } catch (error) {
        // Silently handle error
    }
}

