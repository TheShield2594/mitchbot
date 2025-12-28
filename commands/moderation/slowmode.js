const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode')
    .addIntegerOption(option =>
      option
        .setName('seconds')
        .setDescription('Slowmode duration in seconds (0 to disable, max 21600 = 6 hours)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for slowmode')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const seconds = interaction.options.getInteger('seconds');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Set slowmode
      await interaction.channel.setRateLimitPerUser(seconds, reason);

      // Log the action
      addLog(interaction.guildId, {
        type: 'slowmode',
        action: 'Slowmode Updated',
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        slowmode: seconds,
        reason,
      });

      if (seconds === 0) {
        await interaction.editReply('Slowmode disabled for this channel.');
      } else {
        await interaction.editReply(`Slowmode set to ${seconds} second(s) for this channel.\nReason: ${reason}`);
      }
    } catch (error) {
      console.error('Error setting slowmode:', error);
      await interaction.editReply('Failed to set slowmode. Please check my permissions.');
    }
  },
};
