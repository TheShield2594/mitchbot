const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
      addLog(interaction.guildId, {
        type: 'purge',
        action: 'Messages Purged',
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        amount: deleted.size,
        targetId: target?.id,
        targetTag: target?.tag,
      });

      await interaction.editReply(`Successfully deleted ${deleted.size} message(s)${target ? ` from ${target.tag}` : ''}.`);
    } catch (error) {
      console.error('Error purging messages:', error);
      await interaction.editReply('Failed to purge messages. Note: I can only delete messages less than 14 days old.');
    }
  },
};
