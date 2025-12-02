async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
    }
}

async function initializePage() {
    await Promise.all([
        loadComponent('header', 'components/Header/Header.html'),
        loadComponent('sidebar', 'components/Sidebar/Sidebar.html'),
        loadComponent('theme-customizer', 'components/ThemeCustomizer/ThemeCustomizer.html'),
        loadComponent('insurance-management-content', 'components/InsuranceManagement/insurance-management.html')
    ]);
}

// Wait for Alpine to be fully initialized before loading components
document.addEventListener('alpine:initialized', function () {
    setTimeout(initializePage, 100);
});

