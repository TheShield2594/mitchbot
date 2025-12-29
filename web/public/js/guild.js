const guildId = window.location.pathname.split('/').pop();
let config = null;

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');

    if (tab.dataset.tab === 'logs') {
      loadLogs();
    } else if (tab.dataset.tab === 'birthdays') {
      loadBirthdays();
    }
  });
});

// Toast notification system
function showToast(title, message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Update status overview panel
function updateStatusOverview() {
  if (!config) return;

  const updateStatus = (id, enabled) => {
    const element = document.getElementById(id);
    if (element) {
      element.className = enabled ? 'status-indicator enabled' : 'status-indicator disabled';
      element.innerHTML = `
        <span class="status-dot"></span>
        <span>${enabled ? 'On' : 'Off'}</span>
      `;
    }
  };

  updateStatus('status-automod', config.automod.enabled);
  updateStatus('status-wordfilter', config.automod.wordFilter.enabled);
  updateStatus('status-invitefilter', config.automod.inviteFilter.enabled);
  updateStatus('status-linkfilter', config.automod.linkFilter.enabled);
  updateStatus('status-spam', config.automod.spam.enabled);
  updateStatus('status-logging', config.logging.enabled && config.logging.channelId);

  // Update labels with counts
  const wordCount = config.automod.wordFilter.words.length;
  const whitelistCount = config.automod.linkFilter.whitelist.length;
  const blacklistCount = config.automod.linkFilter.blacklist.length;

  const wordLabel = document.getElementById('label-wordfilter');
  if (wordLabel) {
    wordLabel.textContent = `Word Filter${wordCount > 0 ? ` (${wordCount})` : ''}`;
  }

  const linkLabel = document.getElementById('label-linkfilter');
  if (linkLabel) {
    const total = whitelistCount + blacklistCount;
    linkLabel.textContent = `Link Filter${total > 0 ? ` (${total})` : ''}`;
  }
}

// Load guild info and config
async function loadGuildInfo() {
  try {
    const [infoRes, configRes] = await Promise.all([
      fetch(`/api/guild/${guildId}/info`),
      fetch(`/api/guild/${guildId}/config`)
    ]);

    if (!infoRes.ok || !configRes.ok) {
      throw new Error('Failed to load guild data');
    }

    const info = await infoRes.json();
    const configData = await configRes.json();

    config = configData;

    document.getElementById('guild-name').textContent = info.name;

    // Populate log channel dropdown
    const logChannelSelect = document.getElementById('log-channel');
    logChannelSelect.innerHTML = '<option value="">None</option>';
    info.channels.filter(c => c.type === 0).forEach(channel => { // Text channels
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = `#${channel.name}`;
      if (config.logging.channelId === channel.id) {
        option.selected = true;
      }
      logChannelSelect.appendChild(option);
    });

    // Load automod config
    loadAutomodConfig();

    // Update status overview
    updateStatusOverview();
  } catch (error) {
    console.error('Error loading guild info:', error);
    showToast('Error', 'Failed to load guild information', 'error');
  }
}

// Load automod configuration
function loadAutomodConfig() {
  document.getElementById('automod-enabled').checked = config.automod.enabled;
  document.getElementById('wordfilter-enabled').checked = config.automod.wordFilter.enabled;
  document.getElementById('invitefilter-enabled').checked = config.automod.inviteFilter.enabled;
  document.getElementById('allow-own-server').checked = config.automod.inviteFilter.allowOwnServer;
  document.getElementById('linkfilter-enabled').checked = config.automod.linkFilter.enabled;
  document.getElementById('spam-enabled').checked = config.automod.spam.enabled;

  renderWordList();
  renderWhitelist();
  renderBlacklist();

  // Add real-time toggle listeners to update overview
  const toggles = [
    'automod-enabled',
    'wordfilter-enabled',
    'invitefilter-enabled',
    'linkfilter-enabled',
    'spam-enabled'
  ];

  toggles.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        // Update config preview (not saved yet)
        if (id === 'automod-enabled') config.automod.enabled = element.checked;
        if (id === 'wordfilter-enabled') config.automod.wordFilter.enabled = element.checked;
        if (id === 'invitefilter-enabled') config.automod.inviteFilter.enabled = element.checked;
        if (id === 'linkfilter-enabled') config.automod.linkFilter.enabled = element.checked;
        if (id === 'spam-enabled') config.automod.spam.enabled = element.checked;
        updateStatusOverview();
      });
    }
  });
}

// Render word list
function renderWordList() {
  const container = document.getElementById('word-list');
  container.innerHTML = '';

  config.automod.wordFilter.words.forEach(word => {
    const tag = document.createElement('div');
    tag.className = 'word-tag';
    tag.innerHTML = `
      <span>${word}</span>
      <button onclick="removeWord('${word}')">×</button>
    `;
    container.appendChild(tag);
  });

  updateStatusOverview();
}

// Add word
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

// Remove word
function removeWord(word) {
  config.automod.wordFilter.words = config.automod.wordFilter.words.filter(w => w !== word);
  renderWordList();
}

// Render whitelist
function renderWhitelist() {
  const container = document.getElementById('whitelist');
  container.innerHTML = '';

  config.automod.linkFilter.whitelist.forEach(domain => {
    const tag = document.createElement('div');
    tag.className = 'word-tag';
    tag.innerHTML = `
      <span>${domain}</span>
      <button onclick="removeWhitelist('${domain}')">×</button>
    `;
    container.appendChild(tag);
  });

  updateStatusOverview();
}

// Add whitelist
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

// Remove whitelist
function removeWhitelist(domain) {
  config.automod.linkFilter.whitelist = config.automod.linkFilter.whitelist.filter(d => d !== domain);
  renderWhitelist();
}

// Render blacklist
function renderBlacklist() {
  const container = document.getElementById('blacklist');
  container.innerHTML = '';

  config.automod.linkFilter.blacklist.forEach(domain => {
    const tag = document.createElement('div');
    tag.className = 'word-tag';
    tag.innerHTML = `
      <span>${domain}</span>
      <button onclick="removeBlacklist('${domain}')">×</button>
    `;
    container.appendChild(tag);
  });

  updateStatusOverview();
}

// Add blacklist
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

// Remove blacklist
function removeBlacklist(domain) {
  config.automod.linkFilter.blacklist = config.automod.linkFilter.blacklist.filter(d => d !== domain);
  renderBlacklist();
}

// Save automod settings
async function saveAutomod() {
  try {
    const updates = {
      enabled: document.getElementById('automod-enabled').checked,
      wordFilter: {
        enabled: document.getElementById('wordfilter-enabled').checked,
        words: config.automod.wordFilter.words,
      },
      inviteFilter: {
        enabled: document.getElementById('invitefilter-enabled').checked,
        allowOwnServer: document.getElementById('allow-own-server').checked,
      },
      linkFilter: {
        enabled: document.getElementById('linkfilter-enabled').checked,
        whitelist: config.automod.linkFilter.whitelist,
        blacklist: config.automod.linkFilter.blacklist,
      },
      spam: {
        enabled: document.getElementById('spam-enabled').checked,
      },
      mentionSpam: {
        enabled: document.getElementById('spam-enabled').checked,
      },
      capsSpam: {
        enabled: document.getElementById('spam-enabled').checked,
      },
    };

    const response = await fetch(`/api/guild/${guildId}/automod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    // Update config with new values
    config.automod.enabled = updates.enabled;
    config.automod.wordFilter.enabled = updates.wordFilter.enabled;
    config.automod.inviteFilter.enabled = updates.inviteFilter.enabled;
    config.automod.linkFilter.enabled = updates.linkFilter.enabled;
    config.automod.spam.enabled = updates.spam.enabled;

    // Update status overview
    updateStatusOverview();

    showToast('Settings Saved', 'Automod configuration updated successfully', 'success');
  } catch (error) {
    console.error('Error saving automod settings:', error);
    showToast('Save Failed', 'Could not save automod settings', 'error');
  }
}

// Load logs
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
      container.innerHTML = '<p>No moderation logs found.</p>';
      return;
    }

    container.innerHTML = '';

    logs.forEach(log => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';

      const date = new Date(log.timestamp).toLocaleString();

      entry.innerHTML = `
        <div class="log-header">
          <span>${log.action}</span>
          <span class="log-time">${date}</span>
        </div>
        ${log.targetTag ? `<div><strong>Target:</strong> ${log.targetTag}</div>` : ''}
        ${log.moderatorTag ? `<div><strong>Moderator:</strong> ${log.moderatorTag}</div>` : ''}
        ${log.reason ? `<div><strong>Reason:</strong> ${log.reason}</div>` : ''}
        ${log.duration ? `<div><strong>Duration:</strong> ${log.duration}</div>` : ''}
        ${log.violationType ? `<div><strong>Violation:</strong> ${log.violationType}</div>` : ''}
      `;

      container.appendChild(entry);
    });
  } catch (error) {
    console.error('Error loading logs:', error);
    document.getElementById('logs-container').innerHTML = '<p>Failed to load logs.</p>';
  }
}

// Load birthdays
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
      container.innerHTML = '<p>No birthdays configured.</p>';
      return;
    }

    container.innerHTML = '<ul>';

    for (const [userId, date] of Object.entries(birthdays)) {
      container.innerHTML += `<li>User ${userId}: ${date}</li>`;
    }

    container.innerHTML += '</ul>';
  } catch (error) {
    console.error('Error loading birthdays:', error);
    document.getElementById('birthdays-container').innerHTML = '<p>Failed to load birthdays.</p>';
  }
}

// Save settings
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

    // Update config with new values
    config.logging.enabled = !!logChannelId;
    config.logging.channelId = logChannelId || null;

    // Update status overview
    updateStatusOverview();

    showToast('Settings Saved', 'Logging configuration updated successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Save Failed', 'Could not save logging settings', 'error');
  }
}

// Initialize
loadGuildInfo();
