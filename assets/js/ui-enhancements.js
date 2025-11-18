/**
 * UI Enhancements
 * Professional styling and animations for tables, modals, forms, and notifications
 */

(function() {
    'use strict';

    // Enhanced Toast/Notification System
    const Toast = {
        show(message, type = 'info', duration = 3000) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type} animate-fade-in`;
            
            const icons = {
                success: `<svg class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`,
                error: `<svg class="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`,
                warning: `<svg class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>`,
                info: `<svg class="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`
            };

            const title = type.charAt(0).toUpperCase() + type.slice(1);
            
            toast.innerHTML = `
                <div class="toast-icon">${icons[type] || icons.info}</div>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.remove()">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;

            // Position toast
            toast.style.top = '20px';
            toast.style.right = '20px';
            toast.style.position = 'fixed';
            toast.style.zIndex = '9999';
            toast.style.minWidth = '320px';
            toast.style.maxWidth = '420px';

            document.body.appendChild(toast);

            // Auto remove
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        success(message, duration) {
            this.show(message, 'success', duration);
        },

        error(message, duration) {
            this.show(message, 'error', duration);
        },

        warning(message, duration) {
            this.show(message, 'warning', duration);
        },

        info(message, duration) {
            this.show(message, 'info', duration);
        }
    };

    // Enhanced Modal System
    const Modal = {
        show(content, options = {}) {
            const {
                title = '',
                size = 'default',
                showClose = true,
                onClose = null
            } = options;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    this.close(overlay);
                    if (onClose) onClose();
                }
            };

            const container = document.createElement('div');
            container.className = `modal-container ${size === 'lg' ? 'modal-container-lg' : size === 'xl' ? 'modal-container-xl' : ''}`;

            container.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    ${showClose ? `<button class="modal-close" onclick="window.Modal.close(this.closest('.modal-overlay'))">
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>` : ''}
                </div>
                <div class="modal-body">${content}</div>
            `;

            overlay.appendChild(container);
            document.body.appendChild(overlay);

            // Animate in
            setTimeout(() => {
                container.style.transform = 'scale(1)';
                container.style.opacity = '1';
            }, 10);

            return overlay;
        },

        close(overlay) {
            if (!overlay) return;
            const container = overlay.querySelector('.modal-container');
            container.style.transform = 'scale(0.95)';
            container.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    };

    // Table Enhancements
    const TableEnhancer = {
        init() {
            // Add hover effects to tables
            document.querySelectorAll('table tbody tr').forEach(row => {
                row.addEventListener('mouseenter', function() {
                    this.style.transition = 'all 0.2s ease';
                });
            });

            // Enhance table actions
            document.querySelectorAll('.table-action-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    // Add ripple effect
                    const ripple = document.createElement('span');
                    ripple.style.position = 'absolute';
                    ripple.style.borderRadius = '50%';
                    ripple.style.background = 'rgba(255, 255, 255, 0.6)';
                    ripple.style.width = '20px';
                    ripple.style.height = '20px';
                    ripple.style.left = e.offsetX + 'px';
                    ripple.style.top = e.offsetY + 'px';
                    ripple.style.transform = 'scale(0)';
                    ripple.style.animation = 'ripple 0.6s ease-out';
                    ripple.style.pointerEvents = 'none';
                    
                    this.style.position = 'relative';
                    this.style.overflow = 'hidden';
                    this.appendChild(ripple);
                    
                    setTimeout(() => ripple.remove(), 600);
                });
            });
        }
    };

    // Form Enhancements
    const FormEnhancer = {
        init() {
            // Add floating labels
            document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
                if (input.value) {
                    input.classList.add('has-value');
                }
                
                input.addEventListener('focus', function() {
                    this.parentElement?.classList.add('focused');
                });
                
                input.addEventListener('blur', function() {
                    this.parentElement?.classList.remove('focused');
                    if (this.value) {
                        this.classList.add('has-value');
                    } else {
                        this.classList.remove('has-value');
                    }
                });
            });

            // Form validation styling
            document.querySelectorAll('form').forEach(form => {
                form.addEventListener('submit', function(e) {
                    const inputs = this.querySelectorAll('input[required], select[required], textarea[required]');
                    inputs.forEach(input => {
                        if (!input.value) {
                            input.classList.add('border-danger');
                            setTimeout(() => input.classList.remove('border-danger'), 3000);
                        }
                    });
                });
            });
        }
    };

    // Loading State Manager
    const LoadingManager = {
        show(target = document.body, message = 'Loading...') {
            const loader = document.createElement('div');
            loader.className = 'loading-overlay';
            loader.id = 'global-loader';
            loader.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner-large"></div>
                    <p class="mt-4 text-gray-700 dark:text-gray-300">${message}</p>
                </div>
            `;
            target.appendChild(loader);
        },

        hide() {
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 300);
            }
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            TableEnhancer.init();
            FormEnhancer.init();
        });
    } else {
        TableEnhancer.init();
        FormEnhancer.init();
    }

    // Expose to global scope
    window.Toast = Toast;
    window.Modal = Modal;
    window.LoadingManager = LoadingManager;

    // Enhanced coloredToast function (backward compatibility)
    if (typeof coloredToast === 'undefined') {
        window.coloredToast = function(color, message) {
            Toast.show(message, color === 'success' ? 'success' : color === 'danger' ? 'error' : color === 'warning' ? 'warning' : 'info');
        };
    } else {
        // Override existing coloredToast
        const originalColoredToast = window.coloredToast;
        window.coloredToast = function(color, message) {
            Toast.show(message, color === 'success' ? 'success' : color === 'danger' ? 'error' : color === 'warning' ? 'warning' : 'info');
            if (originalColoredToast) originalColoredToast(color, message);
        };
    }

    // Add ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
})();


