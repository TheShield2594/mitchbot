// ============================================
// MITCHBOT DASHBOARD - CLIENT-SIDE JAVASCRIPT
// ============================================

const guildId = window.location.pathname.split('/').pop();
let config = null;
let healthMonitor = null;

// ============================================
// FEATURE HEALTH MONITOR
// ============================================

class FeatureHealthMonitor {
  constructor(config) {
    this.config = config;
    this.features = [
      {
        id: 'automod',
        name: 'Automod',
        type: 'toggle',
        path: 'automod',
        key: 'enabled'
      },
      {
        id: 'wordfilter',
        name: 'Word Filter',
        type: 'list',
        path: 'automod.wordFilter',
        key: 'enabled',
        listKey: 'words'
      },
      {
        id: 'invitefilter',
        name: 'Invite Filter',
        type: 'toggle',
        path: 'automod.inviteFilter',
        key: 'enabled'
      },
      {
        id: 'linkfilter',
        name: 'Link Filter',
        type: 'list',
        path: 'automod.linkFilter',
        key: 'enabled',
        listKey: 'whitelist'
      },
      {
        id: 'spam',
        name: 'Spam Detection',
        type: 'toggle',
        path: 'automod.spam',
        key: 'enabled'
      },
      {
        id: 'mention-spam',
        name: 'Mention Spam',
        type: 'toggle',
        path: 'automod.mentionSpam',
        key: 'enabled'
      },
      {
        id: 'caps-spam',
        name: 'Caps Spam',
        type: 'toggle',
        path: 'automod.capsSpam',
        key: 'enabled'
      },
      {
        id: 'logging',
        name: 'Mod Logging',
        type: 'channel',
        path: 'logging',
        key: 'channelId'
      },
      {
        id: 'economy',
        name: 'Economy',
        type: 'toggle',
        path: 'economy',
        key: 'enabled'
      }
    ];
  }

  getFeatureData(feature) {
    const path = feature.path.split('.');
    let data = this.config;
    for (const key of path) {
      data = data[key];
      if (!data) return null;
    }
    return data;
  }

  calculateStatus(feature) {
    const data = this.getFeatureData(feature);
    if (!data) return 'inactive';

    // Check if feature is enabled
    const isEnabled = feature.key === 'channelId'
      ? !!data[feature.key]
      : data[feature.key] === true;

    if (!isEnabled) return 'inactive';

    // For list-based features, check if items exist
    if (feature.type === 'list') {
      const listData = data[feature.listKey];
      const blacklistData = data.blacklist || [];
      const totalItems = (Array.isArray(listData) ? listData.length : 0) +
                        (Array.isArray(blacklistData) ? blacklistData.length : 0);
      return totalItems > 0 ? 'active' : 'needs-setup';
    }

    // For channel-based features, check if channel is set
    if (feature.type === 'channel') {
      return data[feature.key] ? 'active' : 'needs-setup';
    }

    return 'active';
  }

  getStatusDetails(feature, data) {
    if (feature.type === 'list') {
      const listCount = Array.isArray(data[feature.listKey]) ? data[feature.listKey].length : 0;
      const blacklistCount = Array.isArray(data.blacklist) ? data.blacklist.length : 0;
      const total = listCount + blacklistCount;

      if (total === 0) return 'No items configured';
      if (feature.id === 'wordfilter') return `${listCount} word${listCount !== 1 ? 's' : ''} filtered`;
      if (feature.id === 'linkfilter') {
        const parts = [];
        if (listCount > 0) parts.push(`${listCount} whitelisted`);
        if (blacklistCount > 0) parts.push(`${blacklistCount} blacklisted`);
        return parts.join(', ');
      }
      return `${total} item${total !== 1 ? 's' : ''}`;
    }

    if (feature.type === 'channel') {
      return data[feature.key] ? `Logging to channel` : 'No channel set';
    }

    return 'Monitoring active';
  }

  getHealthSummary() {
    const summary = {
      active: [],
      needsSetup: [],
      inactive: []
    };

    this.features.forEach(feature => {
      const status = this.calculateStatus(feature);
      const data = this.getFeatureData(feature);

      const item = {
        id: feature.id,
        name: feature.name,
        details: status !== 'inactive' ? this.getStatusDetails(feature, data) : null
      };

      if (status === 'active') {
        summary.active.push(item);
      } else if (status === 'needs-setup') {
        summary.needsSetup.push(item);
      } else {
        summary.inactive.push(item);
      }
    });

    return summary;
  }

  updateUI() {
    const summary = this.getHealthSummary();

    // Update counts
    document.getElementById('health-count-active').textContent = summary.active.length;
    document.getElementById('health-count-warning').textContent = summary.needsSetup.length;
    document.getElementById('health-count-inactive').textContent = summary.inactive.length;

    // Update sections
    this.updateHealthSection('active', summary.active, '🟢');
    this.updateHealthSection('warning', summary.needsSetup, '🟡');
    this.updateHealthSection('inactive', summary.inactive, '⚪');

    // Update individual card states
    this.features.forEach(feature => {
      const status = this.calculateStatus(feature);
      this.updateCardState(feature.id, status);
      this.updateBadge(feature.id, status);
      this.updateWarnings(feature.id, status);
    });
  }

  updateHealthSection(type, items, icon) {
    const section = document.getElementById(`health-${type}-section`);
    const list = document.getElementById(`health-${type}-list`);

    if (items.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'health-section__item';

      const detailText = item.details ? ` - ${item.details}` : '';
      const actionText = type === 'warning' ? '<span class="health-section__item-action">→ Configure now</span>' : '';

      li.innerHTML = `
        <span class="health-section__item-bullet">•</span>
        <div>
          <strong>${item.name}</strong>${detailText}
          ${actionText}
        </div>
      `;

      // Make clickable to scroll to section
      if (type === 'warning') {
        const action = li.querySelector('.health-section__item-action');
        if (action) {
          action.addEventListener('click', () => {
            document.getElementById(`section-${item.id}`).scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          });
        }
      }

      list.appendChild(li);
    });
  }

  updateCardState(featureId, status) {
    const card = document.getElementById(`card-${featureId}`);
    if (!card) return;

    // Remove all state classes
    card.classList.remove('card--active', 'card--needs-setup', 'card--inactive');

    // Add appropriate state class
    if (status === 'active') {
      card.classList.add('card--active');
    } else if (status === 'needs-setup') {
      card.classList.add('card--needs-setup');
    } else {
      card.classList.add('card--inactive');
    }
  }

  updateBadge(featureId, status) {
    const badge = document.getElementById(`badge-${featureId}`);
    if (!badge) return;

    // Remove all badge classes
    badge.classList.remove('status-badge--active', 'status-badge--warning', 'status-badge--inactive');

    // Update badge content and class
    if (status === 'active') {
      badge.classList.add('status-badge--active');
      badge.innerHTML = '<span class="status-badge__dot"></span><span>Active</span>';
    } else if (status === 'needs-setup') {
      badge.classList.add('status-badge--warning');
      badge.innerHTML = '<span class="status-badge__dot"></span><span>Needs Setup</span>';
    } else {
      badge.classList.add('status-badge--inactive');
      badge.innerHTML = '<span class="status-badge__dot"></span><span>Disabled</span>';
    }
  }

  updateWarnings(featureId, status) {
    const warning = document.getElementById(`${featureId}-warning`);
    if (warning) {
      warning.style.display = status === 'needs-setup' ? 'flex' : 'none';
    }
  }

  updateSubtitles() {
    // Word filter subtitle
    const wordCount = this.config.automod.wordFilter.words.length;
    const wordSubtitle = document.getElementById('wordfilter-subtitle');
    if (wordSubtitle) {
      wordSubtitle.textContent = wordCount > 0
        ? `${wordCount} word${wordCount !== 1 ? 's' : ''} configured`
        : 'No words configured';
    }

    // Link filter subtitle
    const whitelistCount = this.config.automod.linkFilter.whitelist.length;
    const blacklistCount = this.config.automod.linkFilter.blacklist.length;
    const totalDomains = whitelistCount + blacklistCount;
    const linkSubtitle = document.getElementById('linkfilter-subtitle');
    if (linkSubtitle) {
      linkSubtitle.textContent = totalDomains > 0
        ? `${totalDomains} domain${totalDomains !== 1 ? 's' : ''} configured`
        : 'No domains configured';
    }
  }
}

// ============================================
// PROGRESSIVE DISCLOSURE
// ============================================

class ProgressiveDisclosure {
  constructor(element) {
    this.element = element;
    this.trigger = element.querySelector('[data-disclosure-trigger]');
    this.content = element.querySelector('[data-disclosure-content]');
    this.isExpanded = false;

    if (this.trigger && this.content) {
      this.init();
    }
  }

  init() {
    this.trigger.addEventListener('click', () => this.toggle());

    // Restore state from localStorage
    const savedState = localStorage.getItem(`disclosure-${this.trigger.id}`);
    if (savedState === 'expanded') {
      this.expand(false);
    }
  }

  toggle() {
    this.isExpanded ? this.collapse() : this.expand();
  }

  expand(animated = true) {
    this.isExpanded = true;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.trigger.querySelector('span:first-child').textContent = 'Hide advanced options';
    this.content.hidden = false;

    if (animated) {
      const height = this.content.scrollHeight;
      this.content.style.height = '0px';
      requestAnimationFrame(() => {
        this.content.style.height = `${height}px`;
        setTimeout(() => {
          this.content.style.height = 'auto';
        }, 350);
      });
    }

    if (this.trigger.id) {
      localStorage.setItem(`disclosure-${this.trigger.id}`, 'expanded');
    }
  }

  collapse() {
    this.isExpanded = false;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.querySelector('span:first-child').textContent = 'Show advanced options';

    const height = this.content.scrollHeight;
    this.content.style.height = `${height}px`;

    requestAnimationFrame(() => {
      this.content.style.height = '0px';
      setTimeout(() => {
        this.content.hidden = true;
        this.content.style.height = '';
      }, 350);
    });

    if (this.trigger.id) {
      localStorage.removeItem(`disclosure-${this.trigger.id}`);
    }
  }
}

// Initialize all disclosure widgets
function initializeDisclosures() {
  document.querySelectorAll('[data-disclosure]').forEach(el => {
    new ProgressiveDisclosure(el);
  });
}

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

function showToast(title, message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <div class="toast__icon">${icons[type] || icons.info}</div>
    <div class="toast__content">
      <div class="toast__title">${title}</div>
      ${message ? `<div class="toast__message">${message}</div>` : ''}
    </div>
    <button class="toast__close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ============================================
// ENHANCED SAVE FEEDBACK
// ============================================

class SaveButton {
  constructor(button, saveFunction) {
    this.button = button;
    this.saveFunction = saveFunction;
    this.originalText = button.textContent;
    this.originalClass = button.className;
  }

  async execute() {
    this.setLoading();

    try {
      await this.saveFunction();
      this.setSuccess();
      setTimeout(() => this.reset(), 2000);
    } catch (error) {
      this.setError();
      setTimeout(() => this.reset(), 3000);
      throw error;
    }
  }

  setLoading() {
    this.button.disabled = true;
    this.button.innerHTML = '<span class="spinner"></span> Saving...';
  }

  setSuccess() {
    this.button.className = 'btn btn-success';
    this.button.innerHTML = '✓ Saved';
    this.button.disabled = true;
  }

  setError() {
    this.button.disabled = false;
    this.button.className = 'btn btn-danger';
    this.button.innerHTML = '✕ Failed - Retry';
  }

  reset() {
    this.button.disabled = false;
    this.button.className = this.originalClass;
    this.button.textContent = this.originalText;
  }
}

// ============================================
// HEALTH OVERVIEW TOGGLE
// ============================================

function initializeHealthToggle() {
  const toggle = document.getElementById('health-toggle');
  const content = document.getElementById('health-content');
  let isExpanded = true;

  toggle.addEventListener('click', () => {
    isExpanded = !isExpanded;
    toggle.setAttribute('aria-expanded', isExpanded.toString());
    toggle.textContent = isExpanded ? 'Collapse' : 'Expand';
    content.style.display = isExpanded ? 'block' : 'none';
  });
}

// ============================================
// LOAD GUILD INFO
// ============================================

async function loadGuildInfo() {
  try {
    const [infoRes, configRes, economyRes] = await Promise.all([
      fetch(`/api/guild/${guildId}/info`),
      fetch(`/api/guild/${guildId}/config`),
      fetch(`/api/guild/${guildId}/economy/config`)
    ]);

    if (!infoRes.ok || !configRes.ok) {
      throw new Error('Failed to load guild data');
    }

    const info = await infoRes.json();
    const configData = await configRes.json();

    config = configData;

    // Add economy config to main config
    if (economyRes.ok) {
      config.economy = await economyRes.json();
    } else {
      // Default economy config if not available
      config.economy = {
        enabled: true,
        currencyName: 'coins',
        currencySymbol: '💰',
        dailyReward: 100,
        dailyCooldownHours: 24
      };
    }

    // Store roles and channels for later use
    config.roles = info.roles;
    config.channels = info.channels;

    // Set guild name
    document.getElementById('guild-name').textContent = info.name;

    // Populate log channel dropdown
    const logChannelSelect = document.getElementById('log-channel');
    logChannelSelect.innerHTML = '<option value="">None - Disable Logging</option>';
    info.channels.filter(c => c.type === 0).forEach(channel => {
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = `#${channel.name}`;
      if (config.logging.channelId === channel.id) {
        option.selected = true;
      }
      logChannelSelect.appendChild(option);
    });

    // Populate whitelist role dropdown
    const whitelistRoleSelect = document.getElementById('whitelist-role-select');
    if (whitelistRoleSelect) {
      whitelistRoleSelect.innerHTML = '<option value="">Select a role...</option>';
      info.roles.filter(r => r.id !== info.id).forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        whitelistRoleSelect.appendChild(option);
      });
    }

    // Populate whitelist channel dropdown
    const whitelistChannelSelect = document.getElementById('whitelist-channel-select');
    if (whitelistChannelSelect) {
      whitelistChannelSelect.innerHTML = '<option value="">Select a channel...</option>';
      info.channels.filter(c => c.type === 0).forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `#${channel.name}`;
        whitelistChannelSelect.appendChild(option);
      });
    }

    // Load automod config
    loadAutomodConfig();

    // Load economy config
    loadEconomyConfig();

    // Populate level role dropdown
    const levelRoleSelect = document.getElementById('level-role-role');
    if (levelRoleSelect) {
      levelRoleSelect.innerHTML = '<option value="">Select a role...</option>';
      info.roles.filter(r => r.id !== info.id).forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        levelRoleSelect.appendChild(option);
      });
    }

    // Load XP config
    loadXPConfig();

    // Initialize health monitor
    healthMonitor = new FeatureHealthMonitor(config);
    healthMonitor.updateUI();
    healthMonitor.updateSubtitles();

    // Load logs
    loadLogs();

    // Initialize birthday UI now that config is loaded
    initializeBirthdayUI();
  } catch (error) {
    console.error('Error loading guild info:', error);
    showToast('Error', 'Failed to load guild information', 'error');
  }
}

// ============================================
// LOAD AUTOMOD CONFIG
// ============================================

function loadAutomodConfig() {
  document.getElementById('automod-enabled').checked = config.automod.enabled;
  document.getElementById('wordfilter-enabled').checked = config.automod.wordFilter.enabled;
  document.getElementById('invitefilter-enabled').checked = config.automod.inviteFilter.enabled;
  document.getElementById('allow-own-server').checked = config.automod.inviteFilter.allowOwnServer;
  document.getElementById('linkfilter-enabled').checked = config.automod.linkFilter.enabled;
  document.getElementById('spam-enabled').checked = config.automod.spam.enabled;

  // Load action configurations
  document.getElementById('wordfilter-action').value = config.automod.wordFilter.action || 'delete';
  document.getElementById('invitefilter-action').value = config.automod.inviteFilter.action || 'delete';
  document.getElementById('linkfilter-action').value = config.automod.linkFilter.action || 'delete';
  document.getElementById('spam-action').value = config.automod.spam.action || 'timeout';

  // Load warning thresholds
  document.getElementById('wordfilter-threshold').value = config.automod.wordFilter.warnThreshold || 3;
  document.getElementById('invitefilter-threshold').value = config.automod.inviteFilter.warnThreshold || 3;
  document.getElementById('linkfilter-threshold').value = config.automod.linkFilter.warnThreshold || 3;

  // Load spam detection parameters
  document.getElementById('spam-timeout-duration').value = (config.automod.spam.timeoutDuration || 300000) / 60000; // Convert ms to minutes
  document.getElementById('spam-message-threshold').value = config.automod.spam.messageThreshold || 5;
  document.getElementById('spam-time-window').value = (config.automod.spam.timeWindow || 5000) / 1000; // Convert ms to seconds
  document.getElementById('spam-duplicate-threshold').value = config.automod.spam.duplicateThreshold || 3;

  // Load mention spam settings
  document.getElementById('mention-spam-enabled').checked = config.automod.mentionSpam?.enabled || false;
  document.getElementById('mention-spam-threshold').value = config.automod.mentionSpam?.threshold || 5;
  document.getElementById('mention-spam-action').value = config.automod.mentionSpam?.action || 'warn';
  document.getElementById('mention-spam-warn-threshold').value = config.automod.mentionSpam?.warnThreshold || 2;

  // Load caps spam settings
  document.getElementById('caps-spam-enabled').checked = config.automod.capsSpam?.enabled || false;
  document.getElementById('caps-spam-percentage').value = config.automod.capsSpam?.percentage || 70;
  document.getElementById('caps-spam-min-length').value = config.automod.capsSpam?.minLength || 10;
  document.getElementById('caps-spam-action').value = config.automod.capsSpam?.action || 'delete';

  renderWordList();
  renderWhitelist();
  renderBlacklist();
  renderWhitelistedRoles();
  renderWhitelistedChannels();

  // Add real-time toggle listeners
  const toggles = [
    'automod-enabled',
    'wordfilter-enabled',
    'invitefilter-enabled',
    'linkfilter-enabled',
    'spam-enabled',
    'mention-spam-enabled',
    'caps-spam-enabled'
  ];

  toggles.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        if (id === 'automod-enabled') config.automod.enabled = element.checked;
        if (id === 'wordfilter-enabled') config.automod.wordFilter.enabled = element.checked;
        if (id === 'invitefilter-enabled') config.automod.inviteFilter.enabled = element.checked;
        if (id === 'linkfilter-enabled') config.automod.linkFilter.enabled = element.checked;
        if (id === 'spam-enabled') config.automod.spam.enabled = element.checked;
        if (id === 'mention-spam-enabled') config.automod.mentionSpam.enabled = element.checked;
        if (id === 'caps-spam-enabled') config.automod.capsSpam.enabled = element.checked;

        if (healthMonitor) {
          healthMonitor.updateUI();
          healthMonitor.updateSubtitles();
        }
      });
    }
  });

  // Log channel change listener
  const logChannel = document.getElementById('log-channel');
  if (logChannel) {
    logChannel.addEventListener('change', () => {
      config.logging.channelId = logChannel.value || null;
      if (healthMonitor) {
        healthMonitor.updateUI();
      }
    });
  }
}

// ============================================
// WORD LIST FUNCTIONS
// ============================================

function renderWordList() {
  const container = document.getElementById('word-list');
  container.innerHTML = '';

  config.automod.wordFilter.words.forEach(word => {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
      <span>${escapeHtml(word)}</span>
      <button class="tag__remove" onclick="removeWord('${escapeHtml(word)}')">×</button>
    `;
    container.appendChild(tag);
  });

  if (healthMonitor) {
    healthMonitor.updateUI();
    healthMonitor.updateSubtitles();
  }
}

function addWord() {
  const input = document.getElementById('new-word');
  const word = input.value.trim().toLowerCase();

  if (!word) return;

  if (!config.automod.wordFilter.words.includes(word)) {
    config.automod.wordFilter.words.push(word);
    renderWordList();
    input.value = '';
  }
}

function removeWord(word) {
  config.automod.wordFilter.words = config.automod.wordFilter.words.filter(w => w !== word);
  renderWordList();
}

// ============================================
// WHITELIST FUNCTIONS
// ============================================

function renderWhitelist() {
  const container = document.getElementById('whitelist');
  container.innerHTML = '';

  config.automod.linkFilter.whitelist.forEach(domain => {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
      <span>${escapeHtml(domain)}</span>
      <button class="tag__remove" onclick="removeWhitelist('${escapeHtml(domain)}')">×</button>
    `;
    container.appendChild(tag);
  });

  if (healthMonitor) {
    healthMonitor.updateUI();
    healthMonitor.updateSubtitles();
  }
}

function addWhitelist() {
  const input = document.getElementById('new-whitelist');
  const domain = input.value.trim().toLowerCase();

  if (!domain) return;

  if (!config.automod.linkFilter.whitelist.includes(domain)) {
    config.automod.linkFilter.whitelist.push(domain);
    renderWhitelist();
    input.value = '';
  }
}

function removeWhitelist(domain) {
  config.automod.linkFilter.whitelist = config.automod.linkFilter.whitelist.filter(d => d !== domain);
  renderWhitelist();
}

// ============================================
// BLACKLIST FUNCTIONS
// ============================================

function renderBlacklist() {
  const container = document.getElementById('blacklist');
  container.innerHTML = '';

  config.automod.linkFilter.blacklist.forEach(domain => {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
      <span>${escapeHtml(domain)}</span>
      <button class="tag__remove" onclick="removeBlacklist('${escapeHtml(domain)}')">×</button>
    `;
    container.appendChild(tag);
  });

  if (healthMonitor) {
    healthMonitor.updateUI();
    healthMonitor.updateSubtitles();
  }
}

function addBlacklist() {
  const input = document.getElementById('new-blacklist');
  const domain = input.value.trim().toLowerCase();

  if (!domain) return;

  if (!config.automod.linkFilter.blacklist.includes(domain)) {
    config.automod.linkFilter.blacklist.push(domain);
    renderBlacklist();
    input.value = '';
  }
}

function removeBlacklist(domain) {
  config.automod.linkFilter.blacklist = config.automod.linkFilter.blacklist.filter(d => d !== domain);
  renderBlacklist();
}

// ============================================
// WHITELISTED ROLES FUNCTIONS
// ============================================

function renderWhitelistedRoles() {
  const container = document.getElementById('whitelisted-roles-list');
  if (!container) return;

  container.innerHTML = '';

  if (!config.automod.whitelistedRoles) {
    config.automod.whitelistedRoles = [];
  }

  config.automod.whitelistedRoles.forEach(roleId => {
    const roleName = config.roles?.find(r => r.id === roleId)?.name || `Role ${roleId}`;
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
      <span>${escapeHtml(roleName)}</span>
      <button class="tag__remove" onclick="removeWhitelistedRole('${roleId}')">×</button>
    `;
    container.appendChild(tag);
  });
}

function addWhitelistedRole() {
  const select = document.getElementById('whitelist-role-select');
  const roleId = select.value;

  if (!roleId) return;

  if (!config.automod.whitelistedRoles) {
    config.automod.whitelistedRoles = [];
  }

  if (!config.automod.whitelistedRoles.includes(roleId)) {
    config.automod.whitelistedRoles.push(roleId);
    renderWhitelistedRoles();
    select.value = '';
  }
}

function removeWhitelistedRole(roleId) {
  config.automod.whitelistedRoles = config.automod.whitelistedRoles.filter(id => id !== roleId);
  renderWhitelistedRoles();
}

// ============================================
// WHITELISTED CHANNELS FUNCTIONS
// ============================================

function renderWhitelistedChannels() {
  const container = document.getElementById('whitelisted-channels-list');
  if (!container) return;

  container.innerHTML = '';

  if (!config.automod.whitelistedChannels) {
    config.automod.whitelistedChannels = [];
  }

  config.automod.whitelistedChannels.forEach(channelId => {
    const channelName = config.channels?.find(c => c.id === channelId)?.name || `Channel ${channelId}`;
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
      <span>#${escapeHtml(channelName)}</span>
      <button class="tag__remove" onclick="removeWhitelistedChannel('${channelId}')">×</button>
    `;
    container.appendChild(tag);
  });
}

function addWhitelistedChannel() {
  const select = document.getElementById('whitelist-channel-select');
  const channelId = select.value;

  if (!channelId) return;

  if (!config.automod.whitelistedChannels) {
    config.automod.whitelistedChannels = [];
  }

  if (!config.automod.whitelistedChannels.includes(channelId)) {
    config.automod.whitelistedChannels.push(channelId);
    renderWhitelistedChannels();
    select.value = '';
  }
}

function removeWhitelistedChannel(channelId) {
  config.automod.whitelistedChannels = config.automod.whitelistedChannels.filter(id => id !== channelId);
  renderWhitelistedChannels();
}

// ============================================
// SAVE FUNCTIONS
// ============================================

async function saveAutomod() {
  try {
    const updates = {
      enabled: document.getElementById('automod-enabled').checked,
      wordFilter: {
        enabled: document.getElementById('wordfilter-enabled').checked,
        words: config.automod.wordFilter.words,
        action: document.getElementById('wordfilter-action').value,
        warnThreshold: parseInt(document.getElementById('wordfilter-threshold').value),
      },
      inviteFilter: {
        enabled: document.getElementById('invitefilter-enabled').checked,
        allowOwnServer: document.getElementById('allow-own-server').checked,
        action: document.getElementById('invitefilter-action').value,
        warnThreshold: parseInt(document.getElementById('invitefilter-threshold').value),
      },
      linkFilter: {
        enabled: document.getElementById('linkfilter-enabled').checked,
        whitelist: config.automod.linkFilter.whitelist,
        blacklist: config.automod.linkFilter.blacklist,
        action: document.getElementById('linkfilter-action').value,
        warnThreshold: parseInt(document.getElementById('linkfilter-threshold').value),
      },
      spam: {
        enabled: document.getElementById('spam-enabled').checked,
        action: document.getElementById('spam-action').value,
        timeoutDuration: parseInt(document.getElementById('spam-timeout-duration').value) * 60000, // Convert minutes to ms
        messageThreshold: parseInt(document.getElementById('spam-message-threshold').value),
        timeWindow: parseInt(document.getElementById('spam-time-window').value) * 1000, // Convert seconds to ms
        duplicateThreshold: parseInt(document.getElementById('spam-duplicate-threshold').value),
      },
      mentionSpam: {
        enabled: document.getElementById('mention-spam-enabled').checked,
        threshold: parseInt(document.getElementById('mention-spam-threshold').value),
        action: document.getElementById('mention-spam-action').value,
        warnThreshold: parseInt(document.getElementById('mention-spam-warn-threshold').value),
      },
      capsSpam: {
        enabled: document.getElementById('caps-spam-enabled').checked,
        percentage: parseInt(document.getElementById('caps-spam-percentage').value),
        minLength: parseInt(document.getElementById('caps-spam-min-length').value),
        action: document.getElementById('caps-spam-action').value,
      },
      whitelistedRoles: config.automod.whitelistedRoles || [],
      whitelistedChannels: config.automod.whitelistedChannels || [],
    };

    const response = await fetch(`/api/guild/${guildId}/automod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    // Update config
    config.automod.enabled = updates.enabled;
    config.automod.wordFilter.enabled = updates.wordFilter.enabled;
    config.automod.inviteFilter.enabled = updates.inviteFilter.enabled;
    config.automod.linkFilter.enabled = updates.linkFilter.enabled;
    config.automod.spam.enabled = updates.spam.enabled;
    config.automod.mentionSpam.enabled = updates.mentionSpam.enabled;
    config.automod.capsSpam.enabled = updates.capsSpam.enabled;

    if (healthMonitor) {
      healthMonitor.updateUI();
    }

    showToast('Settings Saved', 'Automod configuration updated successfully', 'success');
  } catch (error) {
    console.error('Error saving automod settings:', error);
    showToast('Save Failed', 'Could not save automod settings', 'error');
    throw error;
  }
}

async function saveSettings() {
  try {
    const logChannelId = document.getElementById('log-channel').value;

    const response = await fetch(`/api/guild/${guildId}/logging`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: !!logChannelId,
        channelId: logChannelId || null,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    config.logging.enabled = !!logChannelId;
    config.logging.channelId = logChannelId || null;

    if (healthMonitor) {
      healthMonitor.updateUI();
    }

    showToast('Settings Saved', 'Logging configuration updated successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Save Failed', 'Could not save logging settings', 'error');
    throw error;
  }
}

// ============================================
// LOAD LOGS
// ============================================

async function loadLogs() {
  try {
    const container = document.getElementById('logs-container');
    container.innerHTML = '<div class="loading">Loading logs...</div>';

    const response = await fetch(`/api/guild/${guildId}/logs?limit=25`);

    if (!response.ok) {
      throw new Error('Failed to load logs');
    }

    const logs = await response.json();

    if (logs.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No moderation logs found.</p>';
      return;
    }

    container.innerHTML = '';

    logs.forEach(log => {
      const entry = document.createElement('div');
      entry.className = 'alert alert--info';
      entry.style.marginBottom = 'var(--space-3)';

      const date = new Date(log.timestamp).toLocaleString();

      const details = [];
      if (log.targetTag) details.push(`<strong>Target:</strong> ${escapeHtml(log.targetTag)}`);
      if (log.moderatorTag) details.push(`<strong>Moderator:</strong> ${escapeHtml(log.moderatorTag)}`);
      if (log.reason) details.push(`<strong>Reason:</strong> ${escapeHtml(log.reason)}`);
      if (log.duration) details.push(`<strong>Duration:</strong> ${escapeHtml(log.duration)}`);
      if (log.violationType) details.push(`<strong>Violation:</strong> ${escapeHtml(log.violationType)}`);

      entry.innerHTML = `
        <span class="alert__icon">📋</span>
        <div class="alert__content">
          <div class="alert__title">${escapeHtml(log.action)} <span style="color: var(--text-tertiary); font-weight: normal; font-size: var(--text-xs);">${date}</span></div>
          ${details.length > 0 ? `<div class="alert__message">${details.join(' • ')}</div>` : ''}
        </div>
      `;

      container.appendChild(entry);
    });
  } catch (error) {
    console.error('Error loading logs:', error);
    document.getElementById('logs-container').innerHTML =
      '<p class="text-muted text-center">Failed to load logs.</p>';
  }
}

// ============================================
// BIRTHDAY MANAGEMENT
// ============================================

async function loadBirthdayConfig() {
  try {
    const response = await fetch(`/api/guild/${guildId}/config`);

    if (!response.ok) {
      throw new Error('Failed to load config');
    }

    const fetchedConfig = await response.json();
    const birthdayConfig = fetchedConfig.birthday || {
      enabled: false,
      channelId: null,
      roleId: null,
      customMessage: 'Happy Birthday, {mention}! 🎉'
    };

    // Update UI
    const enabledCheckbox = document.getElementById('birthday-enabled');
    const configOptions = document.getElementById('birthday-config-options');
    const channelSelect = document.getElementById('birthday-channel');
    const roleSelect = document.getElementById('birthday-role');
    const messageTextarea = document.getElementById('birthday-message');

    enabledCheckbox.checked = birthdayConfig.enabled;
    configOptions.style.display = birthdayConfig.enabled ? 'block' : 'none';

    if (birthdayConfig.channelId) {
      channelSelect.value = birthdayConfig.channelId;
    }

    if (birthdayConfig.roleId) {
      roleSelect.value = birthdayConfig.roleId;
    }

    messageTextarea.value = birthdayConfig.customMessage || 'Happy Birthday, {mention}! 🎉';

  } catch (error) {
    console.error('Error loading birthday config:', error);
    showToast('Error', 'Failed to load birthday configuration', 'error');
  }
}

async function saveBirthdayConfig() {
  try {
    const enabledCheckbox = document.getElementById('birthday-enabled');
    const channelSelect = document.getElementById('birthday-channel');
    const roleSelect = document.getElementById('birthday-role');
    const messageTextarea = document.getElementById('birthday-message');

    const birthdayConfig = {
      enabled: enabledCheckbox.checked,
      channelId: channelSelect.value || null,
      roleId: roleSelect.value || null,
      customMessage: messageTextarea.value || 'Happy Birthday, {mention}! 🎉'
    };

    const response = await fetch(`/api/guild/${guildId}/config/birthday`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(birthdayConfig),
    });

    if (!response.ok) {
      throw new Error('Failed to save config');
    }

    showToast('Success', 'Birthday configuration saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving birthday config:', error);
    showToast('Error', 'Failed to save birthday configuration', 'error');
  }
}

async function loadBirthdays() {
  try {
    const container = document.getElementById('birthdays-container');
    container.innerHTML = '<div class="loading">Loading birthdays...</div>';

    const response = await fetch(`/api/guild/${guildId}/birthdays`);

    if (!response.ok) {
      throw new Error('Failed to load birthdays');
    }

    const birthdays = await response.json();

    if (Object.keys(birthdays).length === 0) {
      container.innerHTML = '<p class="text-muted">No birthdays configured.</p>';
      return;
    }

    // Create UL element properly
    const ul = document.createElement('ul');
    ul.style.cssText = 'list-style: none; padding: 0; margin: 0;';

    for (const [userId, date] of Object.entries(birthdays)) {
      const listItem = document.createElement('li');
      listItem.style.cssText = 'padding: var(--space-2) 0; border-bottom: 1px solid var(--border-color-light); display: flex; justify-content: space-between; align-items: center;';

      listItem.innerHTML = `
        <span>User ${escapeHtml(userId)}: ${escapeHtml(date)}</span>
        <button class="btn btn--danger btn--sm" data-delete-birthday="${userId}">Delete</button>
      `;

      ul.appendChild(listItem);
    }

    // Clear container and append the complete list
    container.innerHTML = '';
    container.appendChild(ul);
  } catch (error) {
    console.error('Error loading birthdays:', error);
    document.getElementById('birthdays-container').innerHTML =
      '<p class="text-muted">Failed to load birthdays.</p>';
  }
}

async function addBirthday() {
  try {
    const userIdInput = document.getElementById('birthday-user-id');
    const dateInput = document.getElementById('birthday-date');

    const userId = userIdInput.value.trim();
    const date = dateInput.value.trim();

    if (!userId || !date) {
      showToast('Error', 'Please enter both User ID and Birthday', 'error');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      showToast('Error', 'Invalid date format. Use MM-DD (e.g., 01-15)', 'error');
      return;
    }

    // Proper date validation - check if date is actually valid
    const [month, day] = date.split('-').map(Number);

    // Use a leap year to allow Feb 29
    const testDate = new Date(2024, month - 1, day);
    if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
      showToast('Error', 'Invalid date. Please enter a valid calendar date', 'error');
      return;
    }

    const response = await fetch(`/api/guild/${guildId}/birthdays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, date }),
    });

    if (!response.ok) {
      throw new Error('Failed to add birthday');
    }

    showToast('Success', 'Birthday added successfully!', 'success');
    userIdInput.value = '';
    dateInput.value = '';
    loadBirthdays();
  } catch (error) {
    console.error('Error adding birthday:', error);
    showToast('Error', 'Failed to add birthday', 'error');
  }
}

async function deleteBirthday(userId) {
  if (!confirm(`Are you sure you want to delete the birthday for user ${userId}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/guild/${guildId}/birthdays/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete birthday');
    }

    showToast('Success', 'Birthday deleted successfully!', 'success');
    loadBirthdays();
  } catch (error) {
    console.error('Error deleting birthday:', error);
    showToast('Error', 'Failed to delete birthday', 'error');
  }
}

function populateBirthdayChannels() {
  const channelSelect = document.getElementById('birthday-channel');

  // Clear existing options except the first one
  channelSelect.innerHTML = '<option value="">Select a channel...</option>';

  // Add text channels from cached config
  if (config && config.channels && Array.isArray(config.channels)) {
    config.channels
      .filter(ch => ch.type === 'GUILD_TEXT' || ch.type === 0)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `# ${channel.name}`;
        channelSelect.appendChild(option);
      });
  }
}

function populateBirthdayRoles() {
  const roleSelect = document.getElementById('birthday-role');

  // Clear existing options except the first one
  roleSelect.innerHTML = '<option value="">No role</option>';

  // Add roles from cached config
  if (config && config.roles && Array.isArray(config.roles)) {
    config.roles
      .filter(role => role.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        roleSelect.appendChild(option);
      });
  }
}

function initializeBirthdayUI() {
  // Toggle config options when enabled checkbox changes
  const enabledCheckbox = document.getElementById('birthday-enabled');
  const configOptions = document.getElementById('birthday-config-options');

  enabledCheckbox.addEventListener('change', () => {
    configOptions.style.display = enabledCheckbox.checked ? 'block' : 'none';
  });

  // Save config button
  const saveConfigBtn = document.getElementById('save-birthday-config');
  saveConfigBtn.addEventListener('click', saveBirthdayConfig);

  // Add birthday button
  const addBirthdayBtn = document.getElementById('add-birthday-btn');
  addBirthdayBtn.addEventListener('click', addBirthday);

  // Delegated event listener for delete buttons
  const birthdaysContainer = document.getElementById('birthdays-container');
  birthdaysContainer.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('[data-delete-birthday]');
    if (deleteBtn) {
      const userId = deleteBtn.dataset.deleteBirthday;
      deleteBirthday(userId);
    }
  });

  // Load data
  populateBirthdayChannels();
  populateBirthdayRoles();
  loadBirthdayConfig();
  loadBirthdays();
}

// ============================================
// ECONOMY CONFIGURATION
// ============================================

function loadEconomyConfig() {
  if (!config.economy) return;

  document.getElementById('economy-enabled').checked = config.economy.enabled;
  document.getElementById('currency-name').value = config.economy.currencyName || 'coins';
  document.getElementById('currency-symbol').value = config.economy.currencySymbol || '💰';
  document.getElementById('daily-reward').value = config.economy.dailyReward || 100;
  document.getElementById('daily-cooldown').value = config.economy.dailyCooldownHours || 24;
  document.getElementById('work-reward-min').value = config.economy.workRewardMin || 50;
  document.getElementById('work-reward-max').value = config.economy.workRewardMax || 150;
  document.getElementById('work-cooldown').value = config.economy.workCooldownMinutes || 60;
  document.getElementById('starting-balance').value = config.economy.startingBalance || 100;

  updateEconomyStatus();
}

function updateEconomyStatus() {
  const enabled = document.getElementById('economy-enabled').checked;
  const settingsDiv = document.getElementById('economy-settings');
  const statusBadge = document.getElementById('economy-status-badge');

  if (enabled) {
    settingsDiv.style.opacity = '1';
    settingsDiv.style.pointerEvents = 'auto';
    statusBadge.textContent = 'Active';
    statusBadge.className = 'badge badge--success';
  } else {
    settingsDiv.style.opacity = '0.5';
    settingsDiv.style.pointerEvents = 'none';
    statusBadge.textContent = 'Inactive';
    statusBadge.className = 'badge badge--secondary';
  }

  // Update config immediately for health monitor
  if (config.economy) {
    config.economy.enabled = enabled;
    if (healthMonitor) {
      healthMonitor.updateUI();
    }
  }
}

async function saveEconomySettings() {
  try {
    const updates = {
      enabled: document.getElementById('economy-enabled').checked,
      currencyName: document.getElementById('currency-name').value.trim() || 'coins',
      currencySymbol: document.getElementById('currency-symbol').value.trim() || '💰',
      dailyReward: parseInt(document.getElementById('daily-reward').value) || 100,
      dailyCooldownHours: parseInt(document.getElementById('daily-cooldown').value) || 24,
      workRewardMin: parseInt(document.getElementById('work-reward-min').value) || 50,
      workRewardMax: parseInt(document.getElementById('work-reward-max').value) || 150,
      workCooldownMinutes: parseInt(document.getElementById('work-cooldown').value) || 60,
      startingBalance: parseInt(document.getElementById('starting-balance').value) || 100,
    };

    // Validate inputs
    if (updates.dailyReward < 0 || updates.dailyReward > 1000000) {
      showToast('Invalid Input', 'Daily reward must be between 0 and 1,000,000', 'error');
      return;
    }

    if (updates.dailyCooldownHours < 1 || updates.dailyCooldownHours > 168) {
      showToast('Invalid Input', 'Daily cooldown must be between 1 and 168 hours', 'error');
      return;
    }

    if (updates.workRewardMin < 1 || updates.workRewardMin > 10000) {
      showToast('Invalid Input', 'Work reward min must be between 1 and 10,000', 'error');
      return;
    }

    if (updates.workRewardMax < 1 || updates.workRewardMax > 10000) {
      showToast('Invalid Input', 'Work reward max must be between 1 and 10,000', 'error');
      return;
    }

    if (updates.workRewardMin > updates.workRewardMax) {
      showToast('Invalid Input', 'Work reward min cannot exceed max', 'error');
      return;
    }

    if (updates.workCooldownMinutes < 1 || updates.workCooldownMinutes > 1440) {
      showToast('Invalid Input', 'Work cooldown must be between 1 and 1440 minutes', 'error');
      return;
    }

    if (updates.startingBalance < 0 || updates.startingBalance > 100000) {
      showToast('Invalid Input', 'Starting balance must be between 0 and 100,000', 'error');
      return;
    }

    const response = await fetch(`/api/guild/${guildId}/economy/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save settings');
    }

    const result = await response.json();

    // Update config
    config.economy = result.config;

    if (healthMonitor) {
      healthMonitor.updateUI();
    }

    showToast('Settings Saved', 'Economy configuration updated successfully', 'success');
  } catch (error) {
    console.error('Error saving economy settings:', error);
    showToast('Save Failed', error.message || 'Could not save economy settings', 'error');
  }
}

// ============================================
// XP SYSTEM
// ============================================

let xpConfig = null;

async function loadXPConfig() {
  try {
    const response = await fetch(`/api/guild/${guildId}/xp/config`);
    if (!response.ok) throw new Error('Failed to load XP config');

    xpConfig = await response.json();

    // Populate form fields
    document.getElementById('xp-enabled').checked = xpConfig.enabled || false;
    document.getElementById('xp-min').value = xpConfig.minXpPerMessage || 10;
    document.getElementById('xp-max').value = xpConfig.maxXpPerMessage || 20;
    document.getElementById('xp-cooldown').value = xpConfig.cooldown || 60;
    document.getElementById('xp-announce-levelup').checked = xpConfig.announceLevelUp || false;
    document.getElementById('xp-levelup-message').value = xpConfig.levelUpMessage || '🎉 {user} just reached **Level {level}**! Keep it up!';

    // Populate level-up channel dropdown
    const channelSelect = document.getElementById('xp-levelup-channel');
    if (channelSelect) {
      channelSelect.innerHTML = '<option value="">Same channel as message</option>';
      const channels = (config && Array.isArray(config.channels)) ? config.channels : [];
      channels.filter(c => c.type === 0).forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `# ${channel.name}`;
        if (xpConfig.levelUpChannel === channel.id) {
          option.selected = true;
        }
        channelSelect.appendChild(option);
      });
    }

    // Update status badge
    updateXPStatus();

    // Load level roles
    loadLevelRoles();

    // Load leaderboard
    loadXPLeaderboard();

    // Initialize XP filters (channel/role dropdowns and current lists)
    initializeXPFilters();

  } catch (error) {
    console.error('Error loading XP config:', error);
    showToast('Load Failed', 'Could not load XP configuration', 'error');
  }
}

function updateXPStatus() {
  const enabled = document.getElementById('xp-enabled').checked;
  const badge = document.getElementById('xp-status-badge');
  const settings = document.getElementById('xp-settings');

  if (enabled) {
    badge.textContent = 'Active';
    badge.className = 'badge badge--success';
    settings.style.display = 'block';
  } else {
    badge.textContent = 'Disabled';
    badge.className = 'badge badge--muted';
    settings.style.display = 'none';
  }
}

async function saveXPSettings() {
  try {
    const updates = {
      enabled: document.getElementById('xp-enabled').checked,
      minXpPerMessage: parseInt(document.getElementById('xp-min').value) || 10,
      maxXpPerMessage: parseInt(document.getElementById('xp-max').value) || 20,
      cooldown: parseInt(document.getElementById('xp-cooldown').value) || 60,
      announceLevelUp: document.getElementById('xp-announce-levelup').checked,
      levelUpChannel: document.getElementById('xp-levelup-channel').value || null,
      levelUpMessage: document.getElementById('xp-levelup-message').value.trim() || '🎉 {user} just reached **Level {level}**! Keep it up!',
      xpGainChannels: xpConfig.xpGainChannels || [],
      noXpChannels: xpConfig.noXpChannels || [],
      noXpRoles: xpConfig.noXpRoles || [],
    };

    // Validate inputs
    if (updates.minXpPerMessage < 1 || updates.minXpPerMessage > 100) {
      showToast('Invalid Input', 'Min XP must be between 1 and 100', 'error');
      return;
    }

    if (updates.maxXpPerMessage < 1 || updates.maxXpPerMessage > 100) {
      showToast('Invalid Input', 'Max XP must be between 1 and 100', 'error');
      return;
    }

    if (updates.minXpPerMessage > updates.maxXpPerMessage) {
      showToast('Invalid Input', 'Min XP cannot be greater than Max XP', 'error');
      return;
    }

    if (updates.cooldown < 0 || updates.cooldown > 3600) {
      showToast('Invalid Input', 'Cooldown must be between 0 and 3600 seconds', 'error');
      return;
    }

    const response = await fetch(`/api/guild/${guildId}/xp/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save settings');
    }

    const result = await response.json();
    xpConfig = result.config;

    showToast('Settings Saved', 'XP configuration updated successfully', 'success');
  } catch (error) {
    console.error('Error saving XP settings:', error);
    showToast('Save Failed', error.message || 'Could not save XP settings', 'error');
  }
}

function loadLevelRoles() {
  const container = document.getElementById('level-roles-list');

  if (!xpConfig || !xpConfig.levelRoles || xpConfig.levelRoles.length === 0) {
    container.innerHTML = '<div class="form-hint">No level rewards configured yet</div>';
    return;
  }

  // Sort by level
  const sortedRoles = [...xpConfig.levelRoles].sort((a, b) => a.level - b.level);
  const rolesList = (config && Array.isArray(config.roles)) ? config.roles : [];

  container.innerHTML = sortedRoles.map(reward => {
    const role = rolesList.find(r => r.id === reward.roleId);
    const roleName = role ? role.name : 'Unknown Role';

    return `
      <div class="role-item">
        <div class="role-item__content">
          <span class="role-item__label">Level ${reward.level}</span>
          <span class="role-item__arrow">→</span>
          <span class="role-item__role">${escapeHtml(roleName)}</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="removeLevelRoleReward(${reward.level})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

async function addLevelRole() {
  const level = parseInt(document.getElementById('level-role-level').value);
  const roleId = document.getElementById('level-role-role').value;

  if (!level || level < 1 || level > 1000) {
    showToast('Invalid Input', 'Please enter a valid level (1-1000)', 'error');
    return;
  }

  if (!roleId) {
    showToast('Invalid Input', 'Please select a role', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/guild/${guildId}/xp/level-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, roleId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add level role');
    }

    // Fetch only the updated XP config
    const configResponse = await fetch(`/api/guild/${guildId}/xp/config`);
    if (configResponse.ok) {
      xpConfig = await configResponse.json();
    }

    // Refresh only the level roles UI
    loadLevelRoles();

    // Clear inputs
    document.getElementById('level-role-level').value = '';
    document.getElementById('level-role-role').value = '';

    showToast('Reward Added', `Level ${level} role reward added successfully`, 'success');
  } catch (error) {
    console.error('Error adding level role:', error);
    showToast('Add Failed', error.message || 'Could not add level role', 'error');
  }
}

async function removeLevelRoleReward(level) {
  if (!confirm(`Remove level ${level} role reward?`)) return;

  try {
    const response = await fetch(`/api/guild/${guildId}/xp/level-roles/${level}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove level role');
    }

    // Fetch only the updated XP config
    const configResponse = await fetch(`/api/guild/${guildId}/xp/config`);
    if (configResponse.ok) {
      xpConfig = await configResponse.json();
    }

    // Refresh only the level roles UI
    loadLevelRoles();

    showToast('Reward Removed', `Level ${level} role reward removed`, 'success');
  } catch (error) {
    console.error('Error removing level role:', error);
    showToast('Remove Failed', error.message || 'Could not remove level role', 'error');
  }
}

async function loadXPLeaderboard() {
  const container = document.getElementById('xp-leaderboard');

  try {
    const response = await fetch(`/api/guild/${guildId}/xp/leaderboard?limit=10`);
    if (!response.ok) throw new Error('Failed to load leaderboard');

    const leaderboard = await response.json();

    if (leaderboard.length === 0) {
      container.innerHTML = '<div class="form-hint">No one has earned XP yet. Start chatting!</div>';
      return;
    }

    container.innerHTML = `
      <div class="leaderboard">
        ${leaderboard.map((entry, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          return `
            <div class="leaderboard-item">
              <span class="leaderboard-item__rank">${medal}</span>
              <span class="leaderboard-item__name">${escapeHtml(entry.username)}</span>
              <span class="leaderboard-item__stats">
                <span class="leaderboard-item__level">Level ${entry.level}</span>
                <span class="leaderboard-item__xp">${entry.totalXp.toLocaleString()} XP</span>
              </span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    container.innerHTML = '<div class="form-hint text-error">Failed to load leaderboard</div>';
  }
}

// XP FILTER MANAGEMENT
function initializeXPFilters() {
  // Populate channel dropdowns
  const gainChannelSelect = document.getElementById('xp-gain-channel-select');
  const noXpChannelSelect = document.getElementById('no-xp-channel-select');
  const noXpRoleSelect = document.getElementById('no-xp-role-select');

  if (config && config.channels) {
    config.channels.forEach(channel => {
      if (channel.type === 0 || channel.type === 'GUILD_TEXT') { // Text channels only
        const option1 = document.createElement('option');
        option1.value = channel.id;
        option1.textContent = `#${channel.name}`;
        gainChannelSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = channel.id;
        option2.textContent = `#${channel.name}`;
        noXpChannelSelect.appendChild(option2);
      }
    });
  }

  // Populate role dropdown
  if (guildRoles && guildRoles.length > 0) {
    guildRoles.forEach(role => {
      if (role.name !== '@everyone') {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        noXpRoleSelect.appendChild(option);
      }
    });
  }

  // Render current filters
  renderXPFilters();
}

function renderXPFilters() {
  if (!xpConfig) return;

  // Render XP Gain Channels
  const gainChannelsList = document.getElementById('xp-gain-channels-list');
  if (!xpConfig.xpGainChannels || xpConfig.xpGainChannels.length === 0) {
    gainChannelsList.innerHTML = '<div class="form-hint">No channels selected (all channels give XP)</div>';
  } else {
    gainChannelsList.innerHTML = xpConfig.xpGainChannels.map(channelId => {
      const channel = config?.channels?.find(c => c.id === channelId);
      const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
      return `
        <div class="role-item">
          <span>${escapeHtml(channelName)}</span>
          <button class="btn btn-sm btn-danger" onclick="removeXPGainChannel('${channelId}')">Remove</button>
        </div>
      `;
    }).join('');
  }

  // Render No XP Channels
  const noXpChannelsList = document.getElementById('no-xp-channels-list');
  if (!xpConfig.noXpChannels || xpConfig.noXpChannels.length === 0) {
    noXpChannelsList.innerHTML = '<div class="form-hint">No channels blacklisted</div>';
  } else {
    noXpChannelsList.innerHTML = xpConfig.noXpChannels.map(channelId => {
      const channel = config?.channels?.find(c => c.id === channelId);
      const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
      return `
        <div class="role-item">
          <span>${escapeHtml(channelName)}</span>
          <button class="btn btn-sm btn-danger" onclick="removeNoXPChannel('${channelId}')">Remove</button>
        </div>
      `;
    }).join('');
  }

  // Render No XP Roles
  const noXpRolesList = document.getElementById('no-xp-roles-list');
  if (!xpConfig.noXpRoles || xpConfig.noXpRoles.length === 0) {
    noXpRolesList.innerHTML = '<div class="form-hint">No roles blacklisted</div>';
  } else {
    noXpRolesList.innerHTML = xpConfig.noXpRoles.map(roleId => {
      const role = guildRoles?.find(r => r.id === roleId);
      const roleName = role ? role.name : 'Unknown Role';
      return `
        <div class="role-item">
          <span>${escapeHtml(roleName)}</span>
          <button class="btn btn-sm btn-danger" onclick="removeNoXPRole('${roleId}')">Remove</button>
        </div>
      `;
    }).join('');
  }
}

function addXPGainChannel() {
  const select = document.getElementById('xp-gain-channel-select');
  const channelId = select.value;

  if (!channelId) {
    showToast('No Selection', 'Please select a channel', 'warning');
    return;
  }

  if (!xpConfig.xpGainChannels) xpConfig.xpGainChannels = [];

  if (xpConfig.xpGainChannels.includes(channelId)) {
    showToast('Already Added', 'This channel is already in the list', 'warning');
    return;
  }

  xpConfig.xpGainChannels.push(channelId);
  renderXPFilters();
  select.value = '';
}

function removeXPGainChannel(channelId) {
  if (!xpConfig.xpGainChannels) return;
  xpConfig.xpGainChannels = xpConfig.xpGainChannels.filter(id => id !== channelId);
  renderXPFilters();
}

function addNoXPChannel() {
  const select = document.getElementById('no-xp-channel-select');
  const channelId = select.value;

  if (!channelId) {
    showToast('No Selection', 'Please select a channel', 'warning');
    return;
  }

  if (!xpConfig.noXpChannels) xpConfig.noXpChannels = [];

  if (xpConfig.noXpChannels.includes(channelId)) {
    showToast('Already Added', 'This channel is already in the blacklist', 'warning');
    return;
  }

  xpConfig.noXpChannels.push(channelId);
  renderXPFilters();
  select.value = '';
}

function removeNoXPChannel(channelId) {
  if (!xpConfig.noXpChannels) return;
  xpConfig.noXpChannels = xpConfig.noXpChannels.filter(id => id !== channelId);
  renderXPFilters();
}

function addNoXPRole() {
  const select = document.getElementById('no-xp-role-select');
  const roleId = select.value;

  if (!roleId) {
    showToast('No Selection', 'Please select a role', 'warning');
    return;
  }

  if (!xpConfig.noXpRoles) xpConfig.noXpRoles = [];

  if (xpConfig.noXpRoles.includes(roleId)) {
    showToast('Already Added', 'This role is already in the blacklist', 'warning');
    return;
  }

  xpConfig.noXpRoles.push(roleId);
  renderXPFilters();
  select.value = '';
}

function removeNoXPRole(roleId) {
  if (!xpConfig.noXpRoles) return;
  xpConfig.noXpRoles = xpConfig.noXpRoles.filter(id => id !== roleId);
  renderXPFilters();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// ECONOMY SHOP MANAGEMENT
// ============================================

let shopItems = [];

async function loadShopItems() {
  try {
    const response = await fetch(`/api/guild/${guildId}/economy/shop`);
    if (!response.ok) throw new Error('Failed to load shop items');

    const data = await response.json();
    shopItems = data.items || [];
    renderShopItems();
  } catch (error) {
    console.error('Error loading shop items:', error);
    document.getElementById('shop-items-list').innerHTML = '<p class="text-red-500">Failed to load shop items.</p>';
  }
}

function renderShopItems() {
  const container = document.getElementById('shop-items-list');

  if (shopItems.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No shop items yet. Click "Add Shop Item" to create one.</p>';
    return;
  }

  const itemsHTML = shopItems.map(item => {
    const typeEmoji = item.type === 'role' ? '🎭' : '📦';
    const stockText = item.stock === -1 ? '∞' : item.stock;
    const stockClass = item.stock === 0 ? 'text-red-500' : '';

    return `
      <div class="card mb-3">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-semibold text-lg">${typeEmoji} ${escapeHtml(item.name)}</h4>
            <p class="text-gray-600 text-sm mb-2">${escapeHtml(item.description || 'No description')}</p>
            <div class="flex gap-4 text-sm">
              <span><strong>Price:</strong> ${item.price}</span>
              <span class="${stockClass}"><strong>Stock:</strong> ${stockText}</span>
              <span><strong>Type:</strong> ${item.type}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-secondary" onclick="editShopItem('${item.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteShopItem('${item.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = itemsHTML;
}

function openAddShopItemModal() {
  document.getElementById('add-shop-item-modal').style.display = 'flex';
  document.getElementById('shop-item-name').value = '';
  document.getElementById('shop-item-description').value = '';
  document.getElementById('shop-item-price').value = '';
  document.getElementById('shop-item-stock').value = '-1';
  document.getElementById('shop-item-type').value = 'item';
  toggleRoleSelect();
  loadRolesForShop();
}

function closeAddShopItemModal() {
  document.getElementById('add-shop-item-modal').style.display = 'none';
}

function toggleRoleSelect() {
  const type = document.getElementById('shop-item-type').value;
  const roleGroup = document.getElementById('shop-item-role-group');
  roleGroup.style.display = type === 'role' ? 'block' : 'none';
}

async function loadRolesForShop() {
  const roleSelect = document.getElementById('shop-item-role');
  if (!config.roles) return;

  roleSelect.innerHTML = '<option value="">Select a role...</option>' +
    config.roles
      .filter(r => !r.managed && r.name !== '@everyone')
      .map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`)
      .join('');
}

async function saveShopItem() {
  try {
    const name = document.getElementById('shop-item-name').value.trim();
    const description = document.getElementById('shop-item-description').value.trim();
    const price = parseInt(document.getElementById('shop-item-price').value);
    const stock = parseInt(document.getElementById('shop-item-stock').value);
    const type = document.getElementById('shop-item-type').value;
    const roleId = type === 'role' ? document.getElementById('shop-item-role').value : null;

    if (!name || isNaN(price)) {
      showToast('Invalid Input', 'Name and price are required', 'error');
      return;
    }

    if (name.length > 100) {
      showToast('Invalid Input', 'Item name must be 100 characters or less', 'error');
      return;
    }

    if (description.length > 500) {
      showToast('Invalid Input', 'Description must be 500 characters or less', 'error');
      return;
    }

    if (isNaN(stock) || (stock !== -1 && stock < 0)) {
      showToast('Invalid Input', 'Stock must be -1 (unlimited) or a non-negative number', 'error');
      return;
    }

    if (type === 'role' && !roleId) {
      showToast('Invalid Input', 'Please select a role', 'error');
      return;
    }

    const response = await fetch(`/api/guild/${guildId}/economy/shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price, stock, type, roleId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create shop item');
    }

    showToast('Success', 'Shop item created successfully!', 'success');
    closeAddShopItemModal();
    loadShopItems();
  } catch (error) {
    console.error('Error creating shop item:', error);
    showToast('Error', error.message || 'Failed to create shop item', 'error');
  }
}

function editShopItem(itemId) {
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return;

  // Populate the edit modal with current values
  document.getElementById('edit-shop-item-id').value = itemId;
  document.getElementById('edit-shop-item-name').value = item.name;
  document.getElementById('edit-shop-item-description').value = item.description || '';
  document.getElementById('edit-shop-item-price').value = item.price;
  document.getElementById('edit-shop-item-stock').value = item.stock;
  document.getElementById('edit-shop-item-type').value = item.type || 'item';

  // Populate role dropdown with current guild roles
  const roleSelect = document.getElementById('edit-shop-item-role');
  roleSelect.innerHTML = '<option value="">Select a role...</option>';
  if (guildRoles && guildRoles.length > 0) {
    guildRoles.forEach(role => {
      if (role.name !== '@everyone') {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        if (item.roleId === role.id) option.selected = true;
        roleSelect.appendChild(option);
      }
    });
  }

  // Show/hide role selector based on type
  toggleEditShopItemRoleSelect();

  // Show the modal
  document.getElementById('edit-shop-item-modal').style.display = 'flex';
}

function toggleEditShopItemRoleSelect() {
  const typeSelect = document.getElementById('edit-shop-item-type');
  const roleGroup = document.getElementById('edit-shop-item-role-group');
  roleGroup.style.display = typeSelect.value === 'role' ? 'block' : 'none';
}

function closeEditShopItemModal() {
  document.getElementById('edit-shop-item-modal').style.display = 'none';
  // Clear the form
  document.getElementById('edit-shop-item-id').value = '';
  document.getElementById('edit-shop-item-name').value = '';
  document.getElementById('edit-shop-item-description').value = '';
  document.getElementById('edit-shop-item-price').value = '';
  document.getElementById('edit-shop-item-stock').value = '';
  document.getElementById('edit-shop-item-type').value = 'item';
  document.getElementById('edit-shop-item-role').value = '';
  document.getElementById('edit-shop-item-role-group').style.display = 'none';
}

async function updateShopItem() {
  try {
    const itemId = document.getElementById('edit-shop-item-id').value;
    const name = document.getElementById('edit-shop-item-name').value.trim();
    const description = document.getElementById('edit-shop-item-description').value.trim();
    const price = parseInt(document.getElementById('edit-shop-item-price').value);
    const stock = parseInt(document.getElementById('edit-shop-item-stock').value);
    const type = document.getElementById('edit-shop-item-type').value;
    const roleId = document.getElementById('edit-shop-item-role').value || null;

    // Validation
    if (!name) {
      showToast('Invalid Input', 'Item name is required', 'error');
      return;
    }

    if (name.length > 100) {
      showToast('Invalid Input', 'Item name must be 100 characters or less', 'error');
      return;
    }

    if (description.length > 500) {
      showToast('Invalid Input', 'Description must be 500 characters or less', 'error');
      return;
    }

    if (isNaN(price) || price < 0) {
      showToast('Invalid Input', 'Price must be a non-negative number', 'error');
      return;
    }

    if (isNaN(stock) || (stock !== -1 && stock < 0)) {
      showToast('Invalid Input', 'Stock must be -1 (unlimited) or a non-negative number', 'error');
      return;
    }

    if (type === 'role' && !roleId) {
      showToast('Invalid Input', 'Please select a role for role-type items', 'error');
      return;
    }

    const response = await fetch(`/api/guild/${guildId}/economy/shop/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price, stock, type, roleId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update shop item');
    }

    showToast('Success', 'Shop item updated successfully!', 'success');
    closeEditShopItemModal();
    loadShopItems();
  } catch (error) {
    console.error('Error updating shop item:', error);
    showToast('Error', error.message || 'Failed to update shop item', 'error');
  }
}

async function deleteShopItem(itemId) {
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return;

  if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

  try {
    const response = await fetch(`/api/guild/${guildId}/economy/shop/${itemId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete shop item');

    showToast('Success', 'Shop item deleted!', 'success');
    loadShopItems();
  } catch (error) {
    console.error('Error deleting shop item:', error);
    showToast('Error', 'Failed to delete shop item', 'error');
  }
}

// ============================================
// REACTION ROLES
// ============================================

async function loadReactionRolesConfig() {
  try {
    const response = await fetch(`/api/guild/${guildId}/reactionroles`);
    if (!response.ok) throw new Error('Failed to load reaction roles config');

    const reactionRolesConfig = await response.json();

    // Set enabled toggle
    const enabledToggle = document.getElementById('reactionroles-enabled');
    if (enabledToggle) {
      enabledToggle.checked = reactionRolesConfig.enabled || false;
      updateReactionRolesCard(reactionRolesConfig.enabled);
    }

    // Show/hide settings based on enabled state
    toggleReactionRolesSettings();

    // Render messages list
    renderReactionRoleMessages(reactionRolesConfig.messages || {});
  } catch (error) {
    console.error('Error loading reaction roles config:', error);
    showToast('Error', 'Failed to load reaction roles configuration', 'error');
  }
}

function updateReactionRolesCard(enabled) {
  const card = document.getElementById('card-reactionroles');
  const badge = document.getElementById('badge-reactionroles');

  if (enabled) {
    card?.classList.remove('card--inactive');
    card?.classList.add('card--active');
    if (badge) {
      badge.className = 'status-badge status-badge--active';
      badge.innerHTML = '<span class="status-badge__dot"></span><span>Enabled</span>';
    }
  } else {
    card?.classList.remove('card--active');
    card?.classList.add('card--inactive');
    if (badge) {
      badge.className = 'status-badge status-badge--inactive';
      badge.innerHTML = '<span class="status-badge__dot"></span><span>Disabled</span>';
    }
  }
}

function toggleReactionRolesSettings() {
  const enabled = document.getElementById('reactionroles-enabled')?.checked;
  const settings = document.getElementById('reactionroles-settings');
  if (settings) {
    settings.style.display = enabled ? 'block' : 'none';
  }
}

function renderReactionRoleMessages(messages) {
  const container = document.getElementById('reactionroles-messages-list');
  if (!container) return;

  const messageEntries = Object.entries(messages);

  if (messageEntries.length === 0) {
    container.innerHTML = '<div class="form-hint">No reaction role messages configured</div>';
    return;
  }

  container.innerHTML = messageEntries.map(([messageId, data]) => `
    <div class="card mb-3">
      <div class="card__header">
        <h5 class="card__title">Message ${messageId.slice(0, 8)}...</h5>
        <button class="btn btn-danger btn-sm" onclick="deleteReactionRoleMessage('${messageId}')">Delete</button>
      </div>
      <div class="form-hint">Channel ID: ${data.channelId}</div>
      <div class="mt-2">
        ${(data.roles || []).length} role(s) configured
      </div>
    </div>
  `).join('');
}

async function addReactionRoleMessage() {
  const messageId = document.getElementById('rr-message-id')?.value?.trim();
  const channelId = document.getElementById('rr-channel-select')?.value;

  if (!messageId || !channelId) {
    showToast('Error', 'Please provide both message ID and channel', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/guild/${guildId}/reactionroles/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, channelId, roles: [] }),
    });

    if (!response.ok) throw new Error('Failed to add reaction role message');

    showToast('Success', 'Reaction role message added!', 'success');
    document.getElementById('rr-message-id').value = '';
    loadReactionRolesConfig();
  } catch (error) {
    console.error('Error adding reaction role message:', error);
    showToast('Error', 'Failed to add reaction role message', 'error');
  }
}

async function deleteReactionRoleMessage(messageId) {
  if (!confirm('Are you sure you want to delete this reaction role message?')) return;

  try {
    const response = await fetch(`/api/guild/${guildId}/reactionroles/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete reaction role message');

    showToast('Success', 'Reaction role message deleted!', 'success');
    loadReactionRolesConfig();
  } catch (error) {
    console.error('Error deleting reaction role message:', error);
    showToast('Error', 'Failed to delete reaction role message', 'error');
  }
}

async function saveReactionRolesSettings() {
  const enabled = document.getElementById('reactionroles-enabled')?.checked || false;

  try {
    const response = await fetch(`/api/guild/${guildId}/reactionroles/enabled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) throw new Error('Failed to save reaction roles settings');

    showToast('Success', 'Reaction roles settings saved!', 'success');
    updateReactionRolesCard(enabled);
  } catch (error) {
    console.error('Error saving reaction roles settings:', error);
    showToast('Error', 'Failed to save reaction roles settings', 'error');
  }
}

// ============================================
// WELCOME MESSAGES
// ============================================

async function loadWelcomeConfig() {
  try {
    const response = await fetch(`/api/guild/${guildId}/welcome`);
    if (!response.ok) throw new Error('Failed to load welcome config');

    const config = await response.json();

    // Welcome settings
    const welcomeEnabled = document.getElementById('welcome-enabled');
    const welcomeChannel = document.getElementById('welcome-channel-select');
    const welcomeMessage = document.getElementById('welcome-message');

    if (welcomeEnabled) welcomeEnabled.checked = config.welcome?.enabled || false;
    if (welcomeChannel && config.welcome?.channelId) welcomeChannel.value = config.welcome.channelId;
    if (welcomeMessage) welcomeMessage.value = config.welcome?.message || 'Welcome to the server, {user}!';

    updateWelcomeBadge(config.welcome?.enabled || false);
    toggleWelcomeSettings();

    // Leave settings
    const leaveEnabled = document.getElementById('leave-enabled');
    const leaveChannel = document.getElementById('leave-channel-select');
    const leaveMessage = document.getElementById('leave-message');

    if (leaveEnabled) leaveEnabled.checked = config.leave?.enabled || false;
    if (leaveChannel && config.leave?.channelId) leaveChannel.value = config.leave.channelId;
    if (leaveMessage) leaveMessage.value = config.leave?.message || '{username} has left the server.';

    updateLeaveBadge(config.leave?.enabled || false);
    toggleLeaveSettings();

    // Update previews
    updateWelcomePreview();
    updateLeavePreview();
  } catch (error) {
    console.error('Error loading welcome config:', error);
    showToast('Error', 'Failed to load welcome configuration', 'error');
  }
}

function updateWelcomeBadge(enabled) {
  const badge = document.getElementById('badge-welcome');
  if (badge) {
    badge.className = enabled ? 'status-badge status-badge--active' : 'status-badge status-badge--inactive';
    badge.innerHTML = `<span class="status-badge__dot"></span><span>${enabled ? 'Enabled' : 'Disabled'}</span>`;
  }
}

function updateLeaveBadge(enabled) {
  const badge = document.getElementById('badge-leave');
  if (badge) {
    badge.className = enabled ? 'status-badge status-badge--active' : 'status-badge status-badge--inactive';
    badge.innerHTML = `<span class="status-badge__dot"></span><span>${enabled ? 'Enabled' : 'Disabled'}</span>`;
  }
}

function toggleWelcomeSettings() {
  const enabled = document.getElementById('welcome-enabled')?.checked;
  const settings = document.getElementById('welcome-settings');
  if (settings) {
    settings.style.display = enabled ? 'block' : 'none';
  }
}

function toggleLeaveSettings() {
  const enabled = document.getElementById('leave-enabled')?.checked;
  const settings = document.getElementById('leave-settings');
  if (settings) {
    settings.style.display = enabled ? 'block' : 'none';
  }
}

function updateWelcomePreview() {
  const message = document.getElementById('welcome-message')?.value || '';
  const preview = document.getElementById('welcome-preview');
  if (preview) {
    preview.textContent = message
      .replace(/{user}/g, '@NewUser')
      .replace(/{username}/g, 'NewUser')
      .replace(/{server}/g, 'Your Server')
      .replace(/{memberCount}/g, '100');
  }
}

function updateLeavePreview() {
  const message = document.getElementById('leave-message')?.value || '';
  const preview = document.getElementById('leave-preview');
  if (preview) {
    preview.textContent = message
      .replace(/{username}/g, 'OldUser')
      .replace(/{server}/g, 'Your Server')
      .replace(/{memberCount}/g, '99');
  }
}

async function saveWelcomeSettings() {
  const welcomeData = {
    welcome: {
      enabled: document.getElementById('welcome-enabled')?.checked || false,
      channelId: document.getElementById('welcome-channel-select')?.value || null,
      message: document.getElementById('welcome-message')?.value || 'Welcome to the server, {user}!',
    },
    leave: {
      enabled: document.getElementById('leave-enabled')?.checked || false,
      channelId: document.getElementById('leave-channel-select')?.value || null,
      message: document.getElementById('leave-message')?.value || '{username} has left the server.',
    },
  };

  try {
    const response = await fetch(`/api/guild/${guildId}/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(welcomeData),
    });

    if (!response.ok) throw new Error('Failed to save welcome settings');

    showToast('Success', 'Welcome settings saved!', 'success');
    updateWelcomeBadge(welcomeData.welcome.enabled);
    updateLeaveBadge(welcomeData.leave.enabled);
  } catch (error) {
    console.error('Error saving welcome settings:', error);
    showToast('Error', 'Failed to save welcome settings', 'error');
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadGuildInfo();
  initializeDisclosures();
  initializeHealthToggle();
  loadShopItems();

  // Setup analytics link with proper href for accessibility
  const analyticsLink = document.getElementById('analytics-link');
  if (analyticsLink) {
    const baseHref = analyticsLink.dataset.guildHref || '/analytics.html?guild=';
    analyticsLink.href = `${baseHref}${guildId}`;
  }
});
