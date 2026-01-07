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

    // Load birthdays
    loadBirthdays();
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
// LOAD BIRTHDAYS
// ============================================

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

    container.innerHTML = '<ul style="list-style: none; padding: 0;">';

    for (const [userId, date] of Object.entries(birthdays)) {
      container.innerHTML += `<li style="padding: var(--space-2) 0; border-bottom: 1px solid var(--border-color-light);">User ${escapeHtml(userId)}: ${escapeHtml(date)}</li>`;
    }

    container.innerHTML += '</ul>';
  } catch (error) {
    console.error('Error loading birthdays:', error);
    document.getElementById('birthdays-container').innerHTML =
      '<p class="text-muted">Failed to load birthdays.</p>';
  }
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadGuildInfo();
  initializeDisclosures();
  initializeHealthToggle();
});
