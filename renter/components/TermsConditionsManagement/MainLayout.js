/**
 * Terms & Conditions Management MainLayout
 * 
 * Uses ComponentLoader for efficient component loading.
 */

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

document.addEventListener('DOMContentLoaded', async function () {
    // Wait for ComponentLoader to be available
    async function waitForComponentLoader() {
        return new Promise((resolve) => {
            if (window.ComponentLoader && typeof window.ComponentLoader.loadStandardLayout === 'function') {
                resolve(window.ComponentLoader);
                return;
            }
            const checkInterval = setInterval(() => {
                if (window.ComponentLoader && typeof window.ComponentLoader.loadStandardLayout === 'function') {
                    clearInterval(checkInterval);
                    resolve(window.ComponentLoader);
                }
            }, 50);
            // Fallback timeout
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(null);
            }, 5000);
        });
    }

    const loader = await waitForComponentLoader();
    
    if (loader) {
        // Use ComponentLoader to load standard layout
        await loader.loadStandardLayout({
            header: { path: 'components/Header/Header.html', container: 'header-container' },
            sidebar: { path: 'components/Sidebar/Sidebar.html', container: 'sidebar-container' },
            themeCustomizer: { path: 'components/ThemeCustomizer/ThemeCustomizer.html', container: 'theme-customizer-container' },
            main: { path: 'components/TermsConditionsManagement/TermsConditionsManagement.html', container: 'terms-conditions-management-container', loadScript: false }
        });
        
        // Wait for main component and scripts to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
            // Load Update Modal only (Create form is now in the page)
            try {
                const modalsContainer = document.getElementById('terms-conditions-modals-container');
                if (!modalsContainer) {
                    return;
                }
                
                // Load Update Modal
                const updateModalResponse = await fetch('components/TermsConditionsManagement/Modals/UpdateModal.html');
                if (updateModalResponse.ok) {
                    let updateModalHtml = await updateModalResponse.text();
                    // Extract body content if it's a full HTML document
                    if (updateModalHtml.includes('<body')) {
                        const bodyMatch = updateModalHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                        if (bodyMatch && bodyMatch[1]) {
                            updateModalHtml = bodyMatch[1].trim();
                        }
                    }
                    // Remove DOCTYPE, html, head tags
                    updateModalHtml = updateModalHtml.replace(/<!DOCTYPE[^>]*>/gi, '');
                    updateModalHtml = updateModalHtml.replace(/<html[^>]*>/gi, '');
                    updateModalHtml = updateModalHtml.replace(/<\/html>/gi, '');
                    updateModalHtml = updateModalHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
                    updateModalHtml = updateModalHtml.replace(/<body[^>]*>/gi, '');
                    updateModalHtml = updateModalHtml.replace(/<\/body>/gi, '');
                    updateModalHtml = updateModalHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                    
                    modalsContainer.innerHTML += updateModalHtml;
                }
                
                // Wait for DOM to update
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Initialize Alpine.js on modals container after loading
                if (modalsContainer && typeof Alpine !== 'undefined') {
                    Alpine.initTree(modalsContainer);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                // Silently handle error
            }
    } else {
        // Fallback
        loadComponentFallback('components/Header/Header.html', 'header-container');
        loadComponentFallback('components/Sidebar/Sidebar.html', 'sidebar-container');
        loadComponentFallback('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
        loadComponentFallback('components/TermsConditionsManagement/TermsConditionsManagement.html', 'terms-conditions-management-container');
    }
});

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

