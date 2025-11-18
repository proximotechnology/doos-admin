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
            main: { path: 'components/RoleManagement/RoleManagement.html', container: 'role-management-container', loadScript: false }
        });

        // Load modals
        await loader.load('components/RoleManagement/Modals/UpdateModal.html', 'update-modal-container', { loadScript: false });
        await loader.load('components/RoleManagement/Modals/DeleteModal.html', 'delete-modal-container', { loadScript: false });
        await loader.load('components/RoleManagement/Modals/PermissionsModal.html', 'permissions-modal-container', { loadScript: false });
    } else {
        // Fallback to old method
        console.error('ComponentLoader not available, using fallback');
    }
});
