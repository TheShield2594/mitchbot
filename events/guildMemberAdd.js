const { Events } = require('discord.js');
const { recordMemberChange } = require('../utils/analytics');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // Record member join for analytics
      await recordMemberChange(member.guild.id, 'join', member.guild.memberCount);

      console.log(`Member ${member.user.tag} joined ${member.guild.name}. Total members: ${member.guild.memberCount}`);
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};
