const { Events } = require('discord.js');
const { recordMemberChange } = require('../utils/analytics');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      // Record member leave for analytics
      await recordMemberChange(member.guild.id, 'leave', member.guild.memberCount);

      console.log(`Member ${member.user.tag} left ${member.guild.name}. Total members: ${member.guild.memberCount}`);
    } catch (error) {
      console.error('Error in guildMemberRemove event:', error);
    }
  },
};
