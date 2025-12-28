const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for banning')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('target');
    const member = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    if (!target) {
      await interaction.editReply('User not found.');
      return;
    }

    // Check if member exists in guild and is bannable
    if (member) {
      if (!member.bannable) {
        await interaction.editReply('I cannot ban this user. They may have higher permissions than me.');
        return;
      }

      // Check if moderator has higher role
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        await interaction.editReply('You cannot ban this user as they have equal or higher role than you.');
        return;
      }
    }

    try {
      // Try to DM the user first
      try {
        await target.send(`You have been banned from **${interaction.guild.name}**\nReason: ${reason}`);
      } catch (error) {
        // User has DMs disabled or blocked the bot
        console.log('Could not DM banned user');
      }

      // Ban the user
      await interaction.guild.members.ban(target, {
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        reason,
      });

      // Log the action
      addLog(interaction.guildId, {
        type: 'ban',
        action: 'Member Banned',
        targetId: target.id,
        targetTag: target.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        deleteDays,
      });

      await interaction.editReply(`Successfully banned ${target.tag}\nReason: ${reason}`);
    } catch (error) {
      console.error('Error banning user:', error);
      await interaction.editReply('Failed to ban the user. Please check my permissions.');
    }
  },
};
