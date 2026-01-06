// ============================================
// DASHBOARD - Enhanced Server List & Stats
// ============================================

(function() {
  'use strict';

  // Fetch and display servers
  async function loadServers(showRefreshingMessage = false) {
    try {
      if (showRefreshingMessage) {
        showRefreshing();
      }

      console.log('Fetching user data from /auth/me...');
      const response = await fetch('/auth/me');

      console.log('Response status:', response.status);

      if (!response.ok) {
        console.error('Not authenticated, redirecting to login');
        window.location.href = '/auth/login';
        return;
      }

      const user = await response.json();
      console.log('User data received:', user);
      console.log('Debug info:', user.debugInfo);

      // Load user info
      displayUserInfo(user);

      // Check if user.guilds exists
      if (!user.guilds || !Array.isArray(user.guilds)) {
        console.error('No guilds data found:', user.guilds);
        console.error('Debug info:', user.debugInfo);
        showEmptyState(user.debugInfo);
        hideLoading();
        return;
      }

      console.log('Total guilds:', user.guilds.length);

      // Filter manageable guilds - backend already filters, so use all guilds
      const manageableGuilds = user.guilds;

      console.log('Manageable guilds:', manageableGuilds.length);
      console.log('First guild:', manageableGuilds[0]);

      if (manageableGuilds.length === 0) {
        console.log('No manageable guilds, showing empty state');
        showEmptyState(user.debugInfo);
        hideLoading();
        return;
      }

      console.log('About to render servers...');
      renderServers(manageableGuilds);
      console.log('About to update stats...');
      updateStats(manageableGuilds);
      console.log('About to hide loading...');
      hideLoading();
      console.log('loadServers completed successfully');
    } catch (error) {
      console.error('Error loading servers:', error);
      hideLoading();
      showError(error.message);
    }
  }

  // Refresh guilds from Discord
  async function refreshGuilds() {
    try {
      showRefreshing();
      console.log('Refreshing guilds from Discord...');

      const response = await fetch('/auth/refresh-guilds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to refresh guilds:', errorData);

        if (errorData.reason === 'missing_token') {
          showError('Please log out and log back in to refresh your server list');
          return;
        }

        if (errorData.reason === 'timeout') {
          showError('Discord is taking too long to respond. Please try again in a moment.');
          return;
        }

        showError(`Failed to refresh: ${errorData.error}`);
        return;
      }

      const data = await response.json();
      console.log('Guilds refreshed successfully:', data);

      // Reload the dashboard
      await loadServers(false);

      // Show success message
      showSuccessMessage(`Successfully refreshed! Found ${data.manageableGuilds} manageable server(s).`);
    } catch (error) {
      console.error('Error refreshing guilds:', error);
      showError('Failed to refresh guilds. Please try again.');
    }
  }

  // Show refreshing state
  function showRefreshing() {
    const serverList = document.getElementById('server-list');
    if (!serverList) return;

    serverList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Refreshing servers from Discord...</p>
      </div>
    `;
  }

  // Show success message
  function showSuccessMessage(message) {
    const container = document.createElement('div');
    container.className = 'success-toast';
    container.textContent = message;
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success-bg, #10b981);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(container);

    setTimeout(() => {
      container.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => container.remove(), 300);
    }, 3000);
  }

  // Display user info
  function displayUserInfo(user) {
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`;

    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = `<img src="${avatarUrl}" alt="${user.username}" style="width: 100%; height: 100%; border-radius: 50%;">`;
    }

    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.username;

    const tagEl = document.getElementById('user-tag');
    if (tagEl) tagEl.textContent = `#${user.discriminator || '0000'}`;
  }

  // Render server cards with modern design
  function renderServers(guilds) {
    console.log('renderServers called with', guilds.length, 'guilds');
    const serverList = document.getElementById('server-list');
    if (!serverList) {
      console.error('server-list element not found!');
      return;
    }

    try {
      const cards = guilds.map(guild => {
        console.log('Creating card for guild:', guild.name, guild.id);
        return createServerCard(guild);
      }).join('');

      console.log('Generated HTML length:', cards.length);
      serverList.innerHTML = cards;
      console.log('Server list updated, cards in DOM:', document.querySelectorAll('.server-card').length);

      // Show server list and hide empty state
      serverList.style.display = '';
      const emptyState = document.getElementById('empty-state');
      if (emptyState) emptyState.style.display = 'none';

      // Add click handlers
      document.querySelectorAll('.server-card').forEach(card => {
        card.addEventListener('click', function(e) {
          const button = e.target.closest('.server-card__action');
          if (button) {
            // Button clicked - navigate to guild page
            e.stopPropagation();
            const guildId = button.getAttribute('data-guild-id');
            window.location.href = `/guild/${guildId}`;
          } else {
            // Card clicked (but not button) - also navigate
            const guildId = this.getAttribute('data-guild-id');
            window.location.href = `/guild/${guildId}`;
          }
        });
      });
    } catch (error) {
      console.error('Error rendering servers:', error);
      throw error;
    }
  }

  // Create modern server card HTML
  function createServerCard(guild) {
    const iconUrl = guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
      : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%235865F2" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".35em" font-size="48" fill="white" font-family="Arial"%3E${guild.name.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E';

    // Check if bot is in server (this would need to come from API)
    const hasBot = true; // Assume bot is present for now
    const statusClass = hasBot ? 'server-card--active' : 'server-card--available';
    const statusBadgeClass = hasBot ? 'status-badge--active' : 'status-badge--warning';

    return `
      <div class="server-card ${statusClass}" data-guild-id="${guild.id}">
        <div class="server-card__header">
          <div class="server-card__icon">
            <img src="${iconUrl}" alt="${escapeHtml(guild.name)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%235865F2%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
            ${hasBot ? '<div class="server-card__status-dot"></div>' : ''}
          </div>
          <div class="server-card__info">
            <h3 class="server-card__name">${escapeHtml(guild.name)}</h3>
            <div class="server-card__meta">
              <span class="server-card__members">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Members
              </span>
            </div>
          </div>
        </div>

        <div class="server-card__footer">
          <span class="status-badge ${statusBadgeClass}">
            <span class="status-badge__dot"></span>
            <span>${hasBot ? 'Active' : 'Add Bot'}</span>
          </span>
          <button class="btn btn-sm btn-primary server-card__action" data-guild-id="${guild.id}">
            Manage
          </button>
        </div>
      </div>
    `;
  }

  // Update dashboard stats
  function updateStats(guilds) {
    const total = guilds.length;
    const active = guilds.length; // Assume all are active
    const manageable = guilds.length;
    const protectedCount = 0; // Would need to fetch from API

    const totalEl = document.getElementById('total-servers');
    const activeEl = document.getElementById('active-servers');
    const manageableEl = document.getElementById('manageable-servers');
    const protectedEl = document.getElementById('protected-servers');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (manageableEl) manageableEl.textContent = manageable;
    if (protectedEl) protectedEl.textContent = protectedCount;
  }

  // Show empty state with diagnostic info
  function showEmptyState(debugInfo) {
    console.log('showEmptyState called with debugInfo:', debugInfo);
    const serverList = document.getElementById('server-list');
    const emptyState = document.getElementById('empty-state');

    if (serverList) serverList.style.display = 'none';

    // If we have the empty-state element, use it
    if (emptyState) {
      emptyState.style.display = 'block';
      return;
    }

    // Otherwise create a detailed empty state
    if (serverList) {
      let diagnosticText = '';
      if (debugInfo) {
        if (!debugInfo.hasGuildsData) {
          diagnosticText = `
            <div class="diagnostic-info">
              <strong>Issue Detected:</strong> No server data loaded from Discord.<br>
              This usually happens if:<br>
              • Discord API timed out during login<br>
              • Network connection issues during authentication<br>
              <br>
              <strong>Solution:</strong> Click the "Refresh Servers" button below or log out and log back in.
            </div>
          `;
        } else if (debugInfo.totalGuilds > 0 && debugInfo.manageableCount === 0) {
          diagnosticText = `
            <div class="diagnostic-info">
              <strong>Issue Detected:</strong> You have ${debugInfo.totalGuilds} server(s) but no "Manage Server" permission.<br>
              <br>
              <strong>Solution:</strong> Ask a server administrator to grant you the "Manage Server" permission.
            </div>
          `;
        }
      }

      serverList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <h3 class="empty-state__title">No Servers Found</h3>
          <p class="empty-state__description">
            We couldn't find any servers where you have management permissions.
          </p>
          ${diagnosticText}
          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
            <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
            <button class="btn btn-secondary" id="refresh-guilds-btn">Refresh Servers</button>
          </div>
        </div>
      `;

      // Add click handler for refresh button
      const refreshBtn = document.getElementById('refresh-guilds-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshGuilds);
      }
    }
  }

  // Hide loading state
  function hideLoading() {
    const loadingEl = document.querySelector('.server-loading');
    if (loadingEl) loadingEl.style.display = 'none';
  }

  // Show error with custom message
  function showError(message) {
    const serverList = document.getElementById('server-list');
    if (!serverList) return;

    const errorMessage = message || 'There was an error loading your servers. Please try refreshing the page.';

    serverList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 class="empty-state__title">Error Loading Servers</h3>
        <p class="empty-state__description">
          ${escapeHtml(errorMessage)}
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
          <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
          <button class="btn btn-secondary" id="refresh-after-error-btn">Refresh Servers</button>
        </div>
      </div>
    `;

    // Add click handler for refresh button
    const refreshBtn = document.getElementById('refresh-after-error-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refreshGuilds);
    }
  }

  // Setup search functionality
  function setupSearch() {
    const searchInput = document.getElementById('server-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      const serverCards = document.querySelectorAll('.server-card');

      serverCards.forEach(card => {
        const name = card.querySelector('.server-card__name').textContent.toLowerCase();
        card.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }

  // Setup filter functionality
  function setupFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');

    filterTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const filter = this.getAttribute('data-filter');

        // Update active tab
        filterTabs.forEach(t => t.classList.remove('filter-tab--active'));
        this.classList.add('filter-tab--active');

        // Filter server cards
        const serverCards = document.querySelectorAll('.server-card');
        serverCards.forEach(card => {
          const hasBot = card.classList.contains('server-card--active');

          switch (filter) {
            case 'all':
              card.style.display = '';
              break;
            case 'managed':
              card.style.display = hasBot ? '' : 'none';
              break;
            case 'available':
              card.style.display = hasBot ? '' : 'none';
              break;
          }
        });
      });
    });
  }

  // Utility: Escape HTML
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize dashboard
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    loadServers();
    setupSearch();
    setupFilters();
    updateBotInviteLink();
    setupRefreshButton();
  }

  // Setup refresh button in header
  function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-servers-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refreshGuilds);
    }
  }

  // Expose refreshGuilds globally for inline onclick handlers
  window.refreshGuilds = refreshGuilds;

  // Update bot invite link with actual client ID
  async function updateBotInviteLink() {
    try {
      const response = await fetch('/api/client-id');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch client ID:', response.status, errorText);
        return;
      }

      const data = await response.json();

      if (data.clientId) {
        const inviteLinks = document.querySelectorAll('a[href*="YOUR_CLIENT_ID"]');
        inviteLinks.forEach(inviteLink => {
          const currentHref = inviteLink.getAttribute('href');
          const newHref = currentHref.replace(/YOUR_CLIENT_ID/g, data.clientId);
          inviteLink.setAttribute('href', newHref);
        });
      }
    } catch (error) {
      console.error('Error fetching client ID:', error);
    }
  }
})();

// Add server card CSS dynamically if needed
(function() {
  if (document.getElementById('server-card-styles')) return;

  const style = document.createElement('style');
  style.id = 'server-card-styles';
  style.textContent = `
    .server-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
      cursor: pointer;
      transition: all var(--transition-base);
      position: relative;
      overflow: hidden;
    }
    .server-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--brand-primary), transparent);
      opacity: 0;
      transition: opacity var(--transition-base);
    }
    .server-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
      border-color: var(--brand-primary);
    }
    .server-card:hover::before {
      opacity: 1;
    }
    .server-card--active {
      border-left: 3px solid var(--success-border);
    }
    .server-card--available {
      border-left: 3px solid var(--warning-border);
    }
    .server-card__header {
      display: flex;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .server-card__icon {
      position: relative;
      width: 64px;
      height: 64px;
      border-radius: var(--radius-xl);
      overflow: hidden;
      flex-shrink: 0;
      background: var(--bg-tertiary);
    }
    .server-card__icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .server-card__status-dot {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      background: var(--success-border);
      border: 2px solid var(--bg-elevated);
      border-radius: 50%;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .server-card__info {
      flex: 1;
      min-width: 0;
    }
    .server-card__name {
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      margin-bottom: var(--space-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .server-card__meta {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }
    .server-card__members {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .server-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: var(--space-6);
      border-top: 1px solid var(--border-color-light);
    }
  `;
  document.head.appendChild(style);
})();
