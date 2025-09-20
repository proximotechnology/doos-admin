document.addEventListener('DOMContentLoaded', function () {
    loadComponent('components/Header/Header.html', 'header-container');
    loadComponent('components/Sidebar/Sidebar.html', 'sidebar-container');
    loadComponent('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
    loadComponent('components/TestimonialManagement/TestimonialManagement.html', 'testimonial-management-container');
    loadComponent('components/TestimonialManagement/Modals/UpdateModal.html', 'update-modal-container');
    loadComponent('components/TestimonialManagement/Modals/DeleteModal.html', 'delete-modal-container');
});

async function loadComponent(url, containerId) {
    await fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(containerId).innerHTML = data;
        })
        .catch(error => console.error('Error loading component:', error));
}
