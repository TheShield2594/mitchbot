// Analytics Dashboard JavaScript

let currentGuildId = null;
let currentDays = 30;
let charts = {};

// HTML escape function to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Get guild ID from URL
function getGuildIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('guild');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  currentGuildId = getGuildIdFromUrl();

  if (!currentGuildId) {
    window.location.href = '/dashboard';
    return;
  }

  // Load guild info
  await loadGuildInfo();

  // Load analytics data
  await loadAnalytics();

  // Setup event listeners
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Time filter buttons
  document.querySelectorAll('.time-filter button').forEach(button => {
    button.addEventListener('click', async (e) => {
      // Update active button
      document.querySelectorAll('.time-filter button').forEach(btn => {
        btn.classList.remove('active');
      });
      e.target.classList.add('active');

      // Update days and reload data
      currentDays = parseInt(e.target.dataset.days);
      await loadAnalytics();
    });
  });
}

// Load guild information
async function loadGuildInfo() {
  try {
    const response = await fetch(`/api/guild/${currentGuildId}/info`);
    if (!response.ok) throw new Error('Failed to load guild info');

    const guild = await response.json();

    document.getElementById('guild-name').textContent = guild.name;

    if (guild.icon) {
      const iconElement = document.getElementById('guild-icon');
      iconElement.src = guild.icon;
      iconElement.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading guild info:', error);
    showToast('Failed to load server information', 'error');
  }
}

// Load analytics data
async function loadAnalytics() {
  showLoading();

  try {
    const response = await fetch(`/api/guild/${currentGuildId}/analytics?days=${currentDays}`);
    if (!response.ok) throw new Error('Failed to load analytics');

    const data = await response.json();

    // Check if we have any data
    if (isDataEmpty(data)) {
      showNoData();
      return;
    }

    // Update UI with data
    updateStats(data);
    updateMemberGrowthChart(data.memberGrowth);
    updateCommandCharts(data.commandAnalytics);
    updateViolationCharts(data.automodViolations);
    updateLeaderboards(data.topUsers, data.automodViolations.topViolators);

    showContent();
  } catch (error) {
    console.error('Error loading analytics:', error);
    showToast('Failed to load analytics data', 'error');
    showNoData();
  }
}

// Check if data is empty
function isDataEmpty(data) {
  return (
    (!data.memberGrowth || data.memberGrowth.length === 0) &&
    data.commandAnalytics.totalCommands === 0 &&
    data.topUsers.length === 0 &&
    data.automodViolations.totalViolations === 0
  );
}

// Update stats cards
function updateStats(data) {
  // Member count
  const latestMemberData = data.memberGrowth[data.memberGrowth.length - 1];
  if (latestMemberData) {
    document.getElementById('stat-members').textContent = latestMemberData.memberCount;

    // Calculate growth
    if (data.memberGrowth.length > 1) {
      const firstData = data.memberGrowth[0];
      const growth = latestMemberData.memberCount - firstData.memberCount;
      const trendElement = document.getElementById('stat-members-trend');

      if (growth !== 0) {
        trendElement.innerHTML = `
          <span>${growth > 0 ? '↑' : '↓'}</span>
          <span>${Math.abs(growth)} in ${currentDays} days</span>
        `;
        trendElement.className = `stat-card__trend stat-card__trend--${growth > 0 ? 'positive' : 'negative'}`;
      }
    }
  }

  // Total commands
  document.getElementById('stat-commands').textContent = data.commandAnalytics.totalCommands.toLocaleString();

  // Active users
  document.getElementById('stat-active-users').textContent = data.topUsers.length;

  // AutoMod violations
  document.getElementById('stat-violations').textContent = data.automodViolations.totalViolations.toLocaleString();
}

// Update member growth chart
function updateMemberGrowthChart(memberGrowth) {
  const ctx = document.getElementById('member-growth-chart');

  // Destroy existing chart if it exists
  if (charts.memberGrowth) {
    charts.memberGrowth.destroy();
  }

  if (!memberGrowth || memberGrowth.length === 0) {
    return;
  }

  const labels = memberGrowth.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const memberCounts = memberGrowth.map(d => d.memberCount);
  const joins = memberGrowth.map(d => d.joins);
  const leaves = memberGrowth.map(d => d.leaves);

  charts.memberGrowth = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Members',
          data: memberCounts,
          borderColor: '#5865F2',
          backgroundColor: 'rgba(88, 101, 242, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Joins',
          data: joins,
          borderColor: '#57F287',
          backgroundColor: 'rgba(87, 242, 135, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
        },
        {
          label: 'Leaves',
          data: leaves,
          borderColor: '#ED4245',
          backgroundColor: 'rgba(237, 66, 69, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Total Members',
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Joins/Leaves',
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        }
      }
    }
  });
}

// Update command charts
function updateCommandCharts(commandAnalytics) {
  updateCommandTrendsChart(commandAnalytics.commandTrends);
  updateTopCommandsChart(commandAnalytics.topCommands);
}

// Update command trends chart
function updateCommandTrendsChart(commandTrends) {
  const ctx = document.getElementById('command-trends-chart');

  if (charts.commandTrends) {
    charts.commandTrends.destroy();
  }

  if (!commandTrends || commandTrends.length === 0) {
    return;
  }

  const labels = commandTrends.map(t => new Date(t.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const commandCounts = commandTrends.map(t => t.totalCommands);
  const uniqueUsers = commandTrends.map(t => t.uniqueUsers);

  charts.commandTrends = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Commands',
          data: commandCounts,
          backgroundColor: 'rgba(88, 101, 242, 0.7)',
          borderColor: '#5865F2',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Unique Users',
          data: uniqueUsers,
          backgroundColor: 'rgba(87, 242, 135, 0.7)',
          borderColor: '#57F287',
          borderWidth: 2,
          type: 'line',
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        }
      }
    }
  });
}

// Update top commands chart
function updateTopCommandsChart(topCommands) {
  const ctx = document.getElementById('top-commands-chart');

  if (charts.topCommands) {
    charts.topCommands.destroy();
  }

  if (!topCommands || topCommands.length === 0) {
    return;
  }

  const labels = topCommands.map(c => '/' + c.name);
  const counts = topCommands.map(c => c.count);

  charts.topCommands = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: [
          '#5865F2',
          '#57F287',
          '#FEE75C',
          '#ED4245',
          '#EB459E',
          '#3BA55D',
          '#FAA61A',
          '#00D9FF',
          '#9B59B6',
          '#E67E22'
        ],
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Update violation charts
function updateViolationCharts(violations) {
  updateViolationTypeChart(violations.violationTypes);
  updateViolationTrendsChart(violations.violationTrends);
}

// Update violation type chart
function updateViolationTypeChart(violationTypes) {
  const ctx = document.getElementById('violations-type-chart');

  if (charts.violationsType) {
    charts.violationsType.destroy();
  }

  if (!violationTypes || Object.keys(violationTypes).length === 0) {
    return;
  }

  const labels = Object.keys(violationTypes);
  const counts = Object.values(violationTypes);

  charts.violationsType = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Violations',
        data: counts,
        backgroundColor: 'rgba(237, 66, 69, 0.7)',
        borderColor: '#ED4245',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        }
      }
    }
  });
}

// Update violation trends chart
function updateViolationTrendsChart(violationTrends) {
  const ctx = document.getElementById('violations-trends-chart');

  if (charts.violationsTrends) {
    charts.violationsTrends.destroy();
  }

  if (!violationTrends || violationTrends.length === 0) {
    return;
  }

  const labels = violationTrends.map(v => new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const totals = violationTrends.map(v => v.total);

  charts.violationsTrends = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Violations',
        data: totals,
        borderColor: '#ED4245',
        backgroundColor: 'rgba(237, 66, 69, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
            precision: 0
          }
        }
      }
    }
  });
}

// Update leaderboards
function updateLeaderboards(topUsers, topViolators) {
  updateTopUsersLeaderboard(topUsers);
  updateTopViolatorsLeaderboard(topViolators);
}

// Update top users leaderboard
function updateTopUsersLeaderboard(topUsers) {
  const container = document.getElementById('top-users-list');

  if (!topUsers || topUsers.length === 0) {
    container.innerHTML = '<div class="no-data"><p>No active users yet</p></div>';
    return;
  }

  container.innerHTML = topUsers.map((user, index) => {
    const rank = index + 1;
    const rankClass = rank <= 3 ? `leaderboard-rank--${rank}` : 'leaderboard-rank--other';

    const escapedDisplayName = escapeHtml(user.displayName || user.username || 'Unknown User');
    const escapedUsername = escapeHtml(user.username || 'Unknown User');
    const escapedAvatar = escapeHtml(user.avatar);
    const lastActive = user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never';

    return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">${rank}</div>
        <div class="leaderboard-avatar">
          ${escapedAvatar ? `<img src="${escapedAvatar}" alt="${escapedDisplayName}">` : escapeHtml(escapedUsername.charAt(0).toUpperCase())}
        </div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${escapedDisplayName}</div>
          <div class="leaderboard-detail">Last active: ${lastActive}</div>
        </div>
        <div class="leaderboard-value">${user.commandCount}</div>
      </div>
    `;
  }).join('');
}

// Update top violators leaderboard
function updateTopViolatorsLeaderboard(topViolators) {
  const container = document.getElementById('top-violators-list');

  if (!topViolators || topViolators.length === 0) {
    container.innerHTML = '<div class="no-data"><p style="color: var(--success);">No violations! 🎉</p></div>';
    return;
  }

  container.innerHTML = topViolators.map((violator, index) => {
    const rank = index + 1;
    const rankClass = rank <= 3 ? `leaderboard-rank--${rank}` : 'leaderboard-rank--other';

    const escapedDisplayName = escapeHtml(violator.displayName || violator.username || 'Unknown User');
    const escapedUsername = escapeHtml(violator.username || 'Unknown User');
    const escapedAvatar = escapeHtml(violator.avatar);
    const firstLetter = escapedUsername.charAt(0).toUpperCase() || '?';

    return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">${rank}</div>
        <div class="leaderboard-avatar">
          ${escapedAvatar ? `<img src="${escapedAvatar}" alt="${escapedDisplayName}">` : firstLetter}
        </div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${escapedDisplayName}</div>
          <div class="leaderboard-detail">AutoMod violations</div>
        </div>
        <div class="leaderboard-value">${violator.count}</div>
      </div>
    `;
  }).join('');
}

// UI state functions
function showLoading() {
  document.getElementById('loading-state').style.display = 'flex';
  document.getElementById('analytics-content').style.display = 'none';
  document.getElementById('no-data-state').style.display = 'none';
}

function showContent() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('analytics-content').style.display = 'block';
  document.getElementById('no-data-state').style.display = 'none';
}

function showNoData() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('analytics-content').style.display = 'none';
  document.getElementById('no-data-state').style.display = 'block';
}

// Toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast--show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
