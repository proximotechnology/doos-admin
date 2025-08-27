document.addEventListener('DOMContentLoaded', function () {
    loadComponent('components/Header/Header.html', 'header-container');
    loadComponent('components/Sidebar/Sidebar.html', 'sidebar-container');
    loadComponent('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
    loadComponent('components/DriverPrice/DriverPrice.html', 'driverprice-management-container');
});

function loadComponent(url, containerId) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(containerId).innerHTML = data;
        })
        .catch(error => console.error('Error loading component:', error));
}
