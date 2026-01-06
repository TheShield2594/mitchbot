const { Events } = require('discord.js');
const { getGuildConfig } = require('../utils/moderation');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(member) {
    try {
      const config = getGuildConfig(member.guild.id);

      // Check if welcome messages are enabled
      if (!config.welcome || !config.welcome.enabled || !config.welcome.channelId) {
        return;
      }

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
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  },
};
