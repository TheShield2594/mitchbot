const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig, addLog, ensureAntiRaidConfigDefaults } = require('../../utils/moderation');
const { logCommandError } = require('../../utils/commandLogger');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Toggle emergency lockdown mode (auto-kicks all new joins)')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Enable or disable lockdown')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' }
        )
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for lockdown')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const config = getGuildConfig(interaction.guildId);

    // Ensure antiRaid config has proper defaults
    ensureAntiRaidConfigDefaults(config);

    try {
      if (action === 'enable') {
        if (config.antiRaid.lockdown.active) {
          await interaction.editReply('⚠️ Lockdown mode is already active.');
          return;
        }

        // Enable lockdown
        await updateGuildConfig(interaction.guildId, {
          antiRaid: {
            ...config.antiRaid,
            lockdown: {
              active: true,
              lockedChannels: [],
            },
          },
        });

        // Log the action
        addLog(interaction.guildId, {
          actionType: 'lockdown_enable',
          action: 'Lockdown Enabled',
          targetUserId: null,
          targetTag: null,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag,
          reason,
        });

        logger.warn('Lockdown mode enabled', {
          guildId: interaction.guildId,
          moderatorId: interaction.user.id,
          reason,
        });

        await interaction.editReply(`🚨 **LOCKDOWN MODE ENABLED**\n\nAll new members will be automatically kicked.\nReason: ${reason}\n\nUse \`/lockdown disable\` to disable lockdown mode.`);
      } else {
        if (!config.antiRaid.lockdown.active) {
          await interaction.editReply('Lockdown mode is not currently active.');
          return;
        }

        // Disable lockdown
        await updateGuildConfig(interaction.guildId, {
          antiRaid: {
            ...config.antiRaid,
            lockdown: {
              active: false,
              lockedChannels: [],
            },
          },
        });

        // Log the action
        addLog(interaction.guildId, {
          actionType: 'lockdown_disable',
          action: 'Lockdown Disabled',
          targetUserId: null,
          targetTag: null,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag,
          reason,
        });

        logger.info('Lockdown mode disabled', {
          guildId: interaction.guildId,
          moderatorId: interaction.user.id,
          reason,
        });

        await interaction.editReply(`✅ **Lockdown mode disabled**\n\nNew members can now join normally.\nReason: ${reason}`);
      }
    } catch (error) {
      logCommandError('Error toggling lockdown mode', interaction, { error });
      await interaction.editReply('Failed to toggle lockdown mode. Please try again.');
    }
  },
};
