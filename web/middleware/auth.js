// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
}

// Middleware to check if user has manage server permissions
async function ensureServerManager(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }

  const guildId = req.params.guildId || req.body.guildId;

  if (!guildId) {
    return res.status(400).json({ error: 'Guild ID required' });
  }

  try {
    // Check if user has access to this guild
    const userGuilds = req.user.guilds || [];
    const guild = userGuilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    // Check if user has MANAGE_GUILD permission (0x20)
    const MANAGE_GUILD = 0x00000020;
    const hasPermission = guild.permissions &&
      (BigInt(guild.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage this server' });
    }

    next();
  } catch (error) {
    console.error('Error checking permissions:', error);
    res.status(500).json({ error: 'Failed to verify permissions' });
  }
}

module.exports = {
  ensureAuthenticated,
  ensureServerManager,
};
