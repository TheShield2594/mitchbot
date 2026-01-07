const { Events } = require('discord.js');
const { recordMemberChange } = require('../utils/analytics');
const { getGuildConfig } = require('../utils/moderation');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,

  async execute(member) {
    try {
      // Record member leave for analytics
      await recordMemberChange(member.guild.id, 'leave', member.guild.memberCount);

      console.log(`Member ${member.user.tag} left ${member.guild.name}. Total members: ${member.guild.memberCount}`);

      // Send leave message if enabled
      const config = getGuildConfig(member.guild.id);

      if (config.leave && config.leave.enabled && config.leave.channelId) {
        const channel = member.guild.channels.cache.get(config.leave.channelId);
        if (!channel) {
          console.warn(`Leave channel ${config.leave.channelId} not found in guild ${member.guild.id}`);
          return;
        }

        // Check if bot has permission to send messages
        if (!channel.permissionsFor(member.guild.members.me).has('SendMessages')) {
          console.warn(`No permission to send messages in leave channel for guild ${member.guild.id}`);
          return;
        }

        // Replace placeholders in message
        const message = config.leave.message
          .replace(/{user}/g, `<@${member.id}>`)
          .replace(/{username}/g, member.user.username)
          .replace(/{server}/g, member.guild.name)
          .replace(/{memberCount}/g, member.guild.memberCount.toString());

        await channel.send(message);
      }
    } catch (error) {
      console.error('Error in guildMemberRemove event:', error);
    }
  },
};
