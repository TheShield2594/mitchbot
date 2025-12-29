const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel (allow @everyone to send messages)')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unlocking')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Unlock the channel by allowing @everyone the SendMessages permission
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null, // Reset to default (inherit from category/server)
      }, { reason });

      // Log the action
      addLog(interaction.guildId, {
        type: 'unlock',
        action: 'Channel Unlocked',
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
      });

      await interaction.editReply(`🔓 Channel unlocked.\nReason: ${reason}`);
    } catch (error) {
      console.error('Error unlocking channel:', error);
      await interaction.editReply('Failed to unlock the channel. Please check my permissions.');
    }
  },
};
