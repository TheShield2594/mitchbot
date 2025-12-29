const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { addLog } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Only delete messages from this user (optional)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Verify bot has required permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.editReply('I do not have permission to manage messages. Please check my role permissions.');
      return;
    }

    // Check if this is a text-based channel that supports bulk delete
    const validChannelTypes = [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
      ChannelType.AnnouncementThread,
    ];

    if (!validChannelTypes.includes(interaction.channel.type)) {
      await interaction.editReply('This command can only be used in text channels, announcement channels, or threads.');
      return;
    }

    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('target');

    try {
      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: amount });

      // Filter by target user if specified
      let filteredMessages = messages;
      if (target) {
        filteredMessages = messages.filter(msg => msg.author.id === target.id);
      }

      if (filteredMessages.size === 0) {
        await interaction.editReply('No messages found to delete.');
        return;
      }

      // Bulk delete (Discord only allows deleting messages less than 14 days old in bulk)
      const deleted = await interaction.channel.bulkDelete(filteredMessages, true);

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'purge',
        action: 'Messages Purged',
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        amount: deleted.size,
        targetUserId: target?.id || null,
        targetTag: target?.tag,
        reason: null,
        duration: null,
      });

      await interaction.editReply(`Successfully deleted ${deleted.size} message(s)${target ? ` from ${target.tag}` : ''}.\nCase #${logEntry.caseId}`);
    } catch (error) {
      console.error('Error purging messages:', error);
      await interaction.editReply('Failed to purge messages. Note: I can only delete messages less than 14 days old.');
    }
  },
};
