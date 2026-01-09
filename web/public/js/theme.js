// ============================================
// THEME MANAGEMENT - Dark/Light Mode Toggle
// ============================================

(function() {
  'use strict';

  // Get saved theme from localStorage or default to dark
  const getTheme = () => {
    const saved = localStorage.getItem('mitchbot-theme');
    return saved || 'dark';
  };

  // Set theme on document
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mitchbot-theme', theme);

    // Update theme toggle icon
    const toggleIcon = document.querySelector('.theme-toggle__icon');
    if (toggleIcon) {
      toggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  };

  // Initialize theme on page load
  const initTheme = () => {
    const theme = getTheme();
    setTheme(theme);
  };

  // Toggle between dark and light themes
  const toggleTheme = () => {
    const current = getTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Initialize theme immediately
  initTheme();

  // Set up theme toggle button on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
      }
    });
  } else {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleTheme);
    }
  }

  // Sidebar toggle for guild page
  document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('guild-sidebar');

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
          if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('open');
          }
        }
      });
    }

    // Guild sidebar navigation
    const sidebarLinks = document.querySelectorAll('.guild-sidebar__link');
    const sections = document.querySelectorAll('.guild-section');

    sidebarLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();

        const sectionId = link.getAttribute('data-section');

        // Update active link
        sidebarLinks.forEach(l => l.classList.remove('guild-sidebar__link--active'));
        link.classList.add('guild-sidebar__link--active');

        // Show corresponding section
        sections.forEach(s => {
          if (s.id === `section-${sectionId}`) {
            s.classList.add('guild-section--active');
            // Scroll to top of section smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            s.classList.remove('guild-section--active');
          }
        });

        // Close sidebar on mobile
        if (window.innerWidth <= 1024 && sidebar) {
          sidebar.classList.remove('open');
        }
      });
    });
  });

  // Smooth scroll for anchor links
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        // Skip if href was changed to a full URL (like analytics link)
        if (href.startsWith('/') || href.includes('://')) return;

        e.preventDefault();
        try {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        } catch (e) {
          // Invalid selector, skip smooth scroll
          console.warn('Invalid selector for smooth scroll:', href);
        }
      });
    });
  });

  // Progressive disclosure
  document.addEventListener('DOMContentLoaded', () => {
    const disclosures = document.querySelectorAll('[data-disclosure]');

    disclosures.forEach(disclosure => {
      const trigger = disclosure.querySelector('[data-disclosure-trigger]');
      const content = disclosure.querySelector('[data-disclosure-content]');

      if (trigger && content) {
        trigger.addEventListener('click', () => {
          const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

          trigger.setAttribute('aria-expanded', !isExpanded);

          if (isExpanded) {
            content.hidden = true;
            trigger.querySelector('span:first-child').textContent = 'Show advanced options';
          } else {
            content.hidden = false;
            trigger.querySelector('span:first-child').textContent = 'Hide advanced options';
          }
        });
      }
    });
  });

  // Filter tabs
  document.addEventListener('DOMContentLoaded', () => {
    const filterTabs = document.querySelectorAll('.filter-tab');

    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.getAttribute('data-filter');

        // Update active tab
        filterTabs.forEach(t => t.classList.remove('filter-tab--active'));
        tab.classList.add('filter-tab--active');

        // Apply filter logic here (would be implemented in dashboard.js)
        console.log('Filter:', filter);
      });
    });
  });
})();
