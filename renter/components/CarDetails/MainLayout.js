/**
 * CarDetails MainLayout
 * 
 * Uses ComponentLoader for efficient component loading.
 * Loads Header, Sidebar, ThemeCustomizer, and CarDetails component.
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
                // Use ComponentLoader to load standard layout + CarDetails component
                // Note: Component scripts are already loaded in CarDetails.html, so we only load HTML
                await loader.loadStandardLayout([
                    { 
                        url: 'components/CarDetails/CarDetails.html', 
                        containerId: 'car-details-container',
                        options: { 
                            loadScript: false  // Script already loaded in CarDetails.html
                        }
                    }
                ]);
            })
            .catch(error => {
                // Fallback to old method
                loadComponentFallback('components/Header/Header.html', 'header-container');
                loadComponentFallback('components/Sidebar/Sidebar.html', 'sidebar-container');
                loadComponentFallback('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
                loadComponentFallback('components/CarDetails/CarDetails.html', 'car-details-container');
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

