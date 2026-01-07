const fs = require('fs').promises;
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');

// Initialize analytics data structure
async function initAnalytics() {
  try {
    await fs.access(ANALYTICS_FILE);
  } catch {
    const initialData = {
      memberGrowth: {}, // { guildId: [{ timestamp, count, type: 'join'|'leave' }] }
    };
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read analytics data
async function readAnalytics() {
  await initAnalytics();
  const data = await fs.readFile(ANALYTICS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write analytics data
async function writeAnalytics(data) {
  await fs.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2));
}

// Record member join/leave for growth tracking
async function recordMemberChange(guildId, type, memberCount) {
  const data = await readAnalytics();

  if (!data.memberGrowth[guildId]) {
    data.memberGrowth[guildId] = [];
  }

  // Add new entry
  data.memberGrowth[guildId].push({
    timestamp: Date.now(),
    count: memberCount,
    type: type, // 'join' or 'leave'
  });

  // Keep only last 365 days of data (cleanup old entries)
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  data.memberGrowth[guildId] = data.memberGrowth[guildId].filter(
    entry => entry.timestamp > oneYearAgo
  );

  await writeAnalytics(data);
}

// Get member growth data for a time period
async function getMemberGrowthData(guildId, days = 30) {
  const data = await readAnalytics();
  const guildData = data.memberGrowth[guildId] || [];

  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  const recentData = guildData.filter(entry => entry.timestamp >= cutoffTime);

  // Group by day
  const dailyData = {};
  recentData.forEach(entry => {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        joins: 0,
        leaves: 0,
        memberCount: entry.count,
      };
    }
    if (entry.type === 'join') {
      dailyData[date].joins++;
    } else {
      dailyData[date].leaves++;
    }
    dailyData[date].memberCount = entry.count; // Keep the latest count for that day
  });

  // Convert to array and sort by date
  const result = Object.values(dailyData).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  // Calculate net growth
  result.forEach(day => {
    day.netGrowth = day.joins - day.leaves;
  });

  return result;
}

// Get command usage analytics from stats.js data
async function getCommandAnalytics(guildId, days = 30) {
  const statsPath = path.join(__dirname, '../data/stats.json');

  try {
    const statsData = JSON.parse(await fs.readFile(statsPath, 'utf-8'));
    const guildStats = statsData.guilds?.[guildId];

    if (!guildStats) {
      return {
        topCommands: [],
        totalCommands: 0,
        commandTrends: [],
      };
    }

    // Get current week stats
    const currentWeek = guildStats.currentWeek || {};
    const commands = currentWeek.commands || {};

    // Sort commands by usage
    const topCommands = Object.entries(commands)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 commands

    // Get historical trends from weekly snapshots
    const weeklySnapshots = guildStats.weeklySnapshots || [];
    const commandTrends = weeklySnapshots.slice(-12).map(snapshot => ({
      week: new Date(snapshot.weekStart).toISOString().split('T')[0],
      totalCommands: Object.values(snapshot.commands || {}).reduce((sum, count) => sum + count, 0),
      uniqueUsers: Object.keys(snapshot.users || {}).length,
    }));

    const totalCommands = Object.values(commands).reduce((sum, count) => sum + count, 0);

    return {
      topCommands,
      totalCommands,
      commandTrends,
      commandBreakdown: commands,
    };
  } catch (error) {
    console.error('Error reading command analytics:', error);
    return {
      topCommands: [],
      totalCommands: 0,
      commandTrends: [],
    };
  }
}

// Get most active users
async function getTopUsers(guildId, limit = 10) {
  const statsPath = path.join(__dirname, '../data/stats.json');

  try {
    const statsData = JSON.parse(await fs.readFile(statsPath, 'utf-8'));
    const guildStats = statsData.guilds?.[guildId];

    if (!guildStats) {
      return [];
    }

    const currentWeek = guildStats.currentWeek || {};
    const users = currentWeek.users || {};

    // Sort users by command count
    const topUsers = Object.entries(users)
      .map(([userId, data]) => ({
        userId,
        commandCount: data.commandCount || 0,
        lastActive: data.lastActive,
      }))
      .sort((a, b) => b.commandCount - a.commandCount)
      .slice(0, limit);

    return topUsers;
  } catch (error) {
    console.error('Error reading top users:', error);
    return [];
  }
}

// Get automod violation analytics
async function getAutomodViolations(guildId, days = 30) {
  const moderationPath = path.join(__dirname, '../data/moderation.json');

  try {
    const modData = JSON.parse(await fs.readFile(moderationPath, 'utf-8'));
    const guildLogs = modData.guilds?.[guildId]?.logs || [];

    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Filter automod violations (cases with 'AutoMod' as moderator)
    const violations = guildLogs.filter(log =>
      log.timestamp >= cutoffTime &&
      (log.moderatorId === 'AutoMod' || log.moderatorId === '0' || log.reason?.includes('AutoMod'))
    );

    // Count by violation type
    const violationTypes = {};
    const violationsByUser = {};
    const violationsByDate = {};

    violations.forEach(violation => {
      // Extract violation type from reason
      let type = 'Other';
      if (violation.reason) {
        if (violation.reason.includes('spam')) type = 'Spam';
        else if (violation.reason.includes('invite')) type = 'Invite';
        else if (violation.reason.includes('link')) type = 'Link';
        else if (violation.reason.includes('word') || violation.reason.includes('filter')) type = 'Word Filter';
        else if (violation.reason.includes('mention')) type = 'Mention Spam';
        else if (violation.reason.includes('caps')) type = 'Caps';
      }

      violationTypes[type] = (violationTypes[type] || 0) + 1;

      // Count by user
      const userId = violation.targetUserId || violation.userId;
      if (userId) {
        violationsByUser[userId] = (violationsByUser[userId] || 0) + 1;
      }

      // Count by date
      const date = new Date(violation.timestamp).toISOString().split('T')[0];
      if (!violationsByDate[date]) {
        violationsByDate[date] = {};
      }
      violationsByDate[date][type] = (violationsByDate[date][type] || 0) + 1;
    });

    // Get top violators
    const topViolators = Object.entries(violationsByUser)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Convert violations by date to array
    const violationTrends = Object.entries(violationsByDate)
      .map(([date, types]) => ({
        date,
        ...types,
        total: Object.values(types).reduce((sum, count) => sum + count, 0),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      totalViolations: violations.length,
      violationTypes,
      topViolators,
      violationTrends,
    };
  } catch (error) {
    console.error('Error reading automod violations:', error);
    return {
      totalViolations: 0,
      violationTypes: {},
      topViolators: [],
      violationTrends: [],
    };
  }
}

// Get comprehensive analytics summary
async function getAnalyticsSummary(guildId, days = 30) {
  const [memberGrowth, commandAnalytics, topUsers, automodViolations] = await Promise.all([
    getMemberGrowthData(guildId, days),
    getCommandAnalytics(guildId, days),
    getTopUsers(guildId, 10),
    getAutomodViolations(guildId, days),
  ]);

  return {
    memberGrowth,
    commandAnalytics,
    topUsers,
    automodViolations,
    period: `${days} days`,
  };
}

module.exports = {
  recordMemberChange,
  getMemberGrowthData,
  getCommandAnalytics,
  getTopUsers,
  getAutomodViolations,
  getAnalyticsSummary,
};
