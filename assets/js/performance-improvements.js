/**
 * Performance Improvements Script
 * Enhances site performance and user experience
 */

(function() {
    'use strict';

    // ===== Lazy Loading Images =====
    function initLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            images.forEach(img => img.classList.add('loaded'));
        }
    }

    // ===== Debounce Function for Search/Filter =====
    window.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // ===== Throttle Function for Scroll Events =====
    window.throttle = function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    // ===== Optimize Table Rendering =====
    window.optimizeTableRendering = function() {
        // Use requestAnimationFrame for smooth rendering
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            if (table.rows.length > 100) {
                // Add virtual scrolling hint
                table.setAttribute('data-large-table', 'true');
            }
        });
    };

    // ===== Preload Critical Resources =====
    function preloadCriticalResources() {
        const criticalPaths = [
            'components/Header/Header.html',
            'components/Sidebar/Sidebar.html'
        ];

        criticalPaths.forEach(path => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = path;
            document.head.appendChild(link);
        });
    }

    // ===== Cache API Responses in Memory =====
    window.ApiCache = (function() {
        const cache = new Map();
        const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

        return {
            set: function(key, data) {
                cache.set(key, {
                    data: data,
                    timestamp: Date.now()
                });
            },
            get: function(key) {
                const cached = cache.get(key);
                if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
                    return cached.data;
                }
                cache.delete(key);
                return null;
            },
            clear: function() {
                cache.clear();
            },
            invalidate: function(pattern) {
                // Remove cache entries matching pattern
                for (let [key, value] of cache.entries()) {
                    if (key.includes(pattern)) {
                        cache.delete(key);
                    }
                }
            }
        };
    })();

    // ===== Auto-clear Cache on Logout =====
    window.addEventListener('beforeunload', () => {
        const isLoggingOut = sessionStorage.getItem('isLoggingOut');
        if (isLoggingOut === 'true') {
            window.ApiCache.clear();
            sessionStorage.removeItem('isLoggingOut');
        }
    });

    // ===== Detect Slow Network and Adjust =====
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection && connection.effectiveType) {
            const slowNetworkTypes = ['slow-2g', '2g'];
            if (slowNetworkTypes.includes(connection.effectiveType)) {
                // Reduce image quality for slow connections
                document.documentElement.classList.add('slow-network');
            }
        }
    }

    // ===== Reduce Animations on Low-End Devices =====
    function detectLowEndDevice() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const cores = navigator.hardwareConcurrency || 2;
        const memory = navigator.deviceMemory || 4;

        if (isMobile && (cores <= 4 || memory <= 2)) {
            document.documentElement.classList.add('low-end-device');
        }
    }

    // ===== Initialize All Performance Optimizations =====
    function initPerformanceOptimizations() {
        initLazyLoading();
        preloadCriticalResources();
        detectLowEndDevice();
        
        // Re-initialize lazy loading on DOM changes
        const observer = new MutationObserver(debounce(() => {
            initLazyLoading();
        }, 500));

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ===== Run on Load =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPerformanceOptimizations);
    } else {
        initPerformanceOptimizations();
    }

    // ===== Expose utilities globally =====
    window.PerformanceUtils = {
        debounce: window.debounce,
        throttle: window.throttle,
        optimizeTableRendering: window.optimizeTableRendering,
        ApiCache: window.ApiCache
    };

})();

