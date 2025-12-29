const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning, getWarnings, addLog, canModerate } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for warning')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason');

    if (!target) {
      await interaction.editReply('User not found in this server.');
      return;
    }

    // Safety checks using centralized moderation helper
    const moderationCheck = canModerate(interaction.guild, interaction.member, target);
    if (!moderationCheck.canModerate) {
      await interaction.editReply(moderationCheck.reason);
      return;
    }

    try {
      // Add warning
      const warning = await addWarning(interaction.guildId, target.id, reason, interaction.user.id);

      // Get total warnings
      const warnings = getWarnings(interaction.guildId, target.id);
      const warningCount = warnings.length;

      // Try to DM the user
      try {
        await target.send(`⚠️ You have been warned in **${interaction.guild.name}**\nReason: ${reason}\n\nTotal warnings: ${warningCount}`);
      } catch (error) {
        // User has DMs disabled or blocked the bot
        console.log('Could not DM warned user');
      }

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'warn',
        action: 'Member Warned',
        targetUserId: target.id,
        targetTag: target.user.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        duration: null,
        warningId: warning.id,
        totalWarnings: warningCount,
      });

      await interaction.editReply(`Successfully warned ${target.user.tag}\nReason: ${reason}\nTotal warnings: ${warningCount}\nCase #${logEntry.caseId}`);
    } catch (error) {
      console.error('Error warning user:', error);
      await interaction.editReply('Failed to warn the user. The warning may not have been saved.');
    }
  },
};
