const { Events } = require('discord.js');
const { recordMemberChange } = require('../utils/analytics');
const { getGuildConfig } = require('../utils/moderation');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(member) {
    try {
      // Record member join for analytics
      await recordMemberChange(member.guild.id, 'join', member.guild.memberCount);

      console.log(`Member ${member.user.tag} joined ${member.guild.name}. Total members: ${member.guild.memberCount}`);

      // Send welcome message if enabled
      const config = getGuildConfig(member.guild.id);

      if (config.welcome && config.welcome.enabled && config.welcome.channelId) {
        const channel = member.guild.channels.cache.get(config.welcome.channelId);
        if (!channel) {
          console.warn(`Welcome channel ${config.welcome.channelId} not found in guild ${member.guild.id}`);
          return;
        }

        // Check if bot has permission to send messages
        if (!channel.permissionsFor(member.guild.members.me).has('SendMessages')) {
          console.warn(`No permission to send messages in welcome channel for guild ${member.guild.id}`);
          return;
        }

        // Replace placeholders in message
        const message = config.welcome.message
          .replace(/{user}/g, `<@${member.id}>`)
          .replace(/{username}/g, member.user.username)
          .replace(/{server}/g, member.guild.name)
          .replace(/{memberCount}/g, member.guild.memberCount.toString());

        await channel.send(message);
      }
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};
