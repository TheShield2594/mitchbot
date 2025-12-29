const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (prevent @everyone from sending messages)')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for locking')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Lock the channel by denying @everyone the SendMessages permission
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      }, { reason });

      // Log the action
      addLog(interaction.guildId, {
        type: 'lock',
        action: 'Channel Locked',
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
      });

      await interaction.editReply(`🔒 Channel locked.\nReason: ${reason}`);
    } catch (error) {
      console.error('Error locking channel:', error);
      await interaction.editReply('Failed to lock the channel. Please check my permissions.');
    }
  },
};
