const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { addLog } = require('../../utils/moderation');
const { logCommandError } = require('../../utils/commandLogger');

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

    // Verify bot has required permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply('I do not have permission to manage channels. Please check my role permissions.');
      return;
    }

    // Check if this is a text-based channel that supports slowmode
    const validChannelTypes = [
      ChannelType.GuildText,
      ChannelType.GuildVoice,
      ChannelType.GuildForum,
      ChannelType.GuildAnnouncement,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
      ChannelType.AnnouncementThread,
    ];

    if (!validChannelTypes.includes(interaction.channel.type)) {
      await interaction.editReply('This command can only be used in channels that support slowmode (text, voice, forum, or threads).');
      return;
    }

    const seconds = interaction.options.getInteger('seconds');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Set slowmode
      await interaction.channel.setRateLimitPerUser(seconds, reason);

      // Log the action
      addLog(interaction.guildId, {
        actionType: 'slowmode',
        action: 'Slowmode Updated',
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        slowmode: seconds,
        reason,
        targetUserId: null,
        duration: null,
      });

      if (seconds === 0) {
        await interaction.editReply('Slowmode disabled for this channel.');
      } else {
        await interaction.editReply(`Slowmode set to ${seconds} second(s) for this channel.\nReason: ${reason}`);
      }
    } catch (error) {
      logCommandError('Error setting slowmode', interaction, { error });
      await interaction.editReply('Failed to set slowmode. Please check my permissions.');
    }
  },
};
