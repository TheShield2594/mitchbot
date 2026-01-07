const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig, ensureAntiRaidConfigDefaults } = require('../../utils/moderation');
const { logCommandError } = require('../../utils/commandLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Configure anti-raid protection settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current anti-raid settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('accountage')
        .setDescription('Configure account age filter')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable account age filter')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('min_days')
            .setDescription('Minimum account age in days (default: 7)')
            .setMinValue(1)
            .setMaxValue(365)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to take on new accounts')
            .addChoices(
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('joinspam')
        .setDescription('Configure join spam detection')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable join spam detection')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('threshold')
            .setDescription('Number of joins to trigger (default: 5)')
            .setMinValue(2)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('timewindow')
            .setDescription('Time window in seconds (default: 10)')
            .setMinValue(1)
            .setMaxValue(60)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to take on raid joins')
            .addChoices(
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('verification')
        .setDescription('Configure verification system')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable verification')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to give after verification')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for verification messages')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Custom verification message')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const config = getGuildConfig(interaction.guildId);

    // Ensure antiRaid config has proper defaults
    ensureAntiRaidConfigDefaults(config);

    try {
      if (subcommand === 'status') {
        const accountAge = config.antiRaid.accountAge || { enabled: false };
        const joinSpam = config.antiRaid.joinSpam || { enabled: false };
        const verification = config.antiRaid.verification || { enabled: false };
        const lockdown = config.antiRaid.lockdown || { active: false };

        const statusEmbed = {
          color: 0x5865F2,
          title: '🛡️ Anti-Raid Protection Status',
          fields: [
            {
              name: 'Account Age Filter',
              value: accountAge.enabled
                ? `✅ Enabled\nMin Age: ${accountAge.minAgeDays || 7} days\nAction: ${accountAge.action || 'kick'}`
                : '❌ Disabled',
              inline: true,
            },
            {
              name: 'Join Spam Detection',
              value: joinSpam.enabled
                ? `✅ Enabled\nThreshold: ${joinSpam.threshold || 5} joins\nWindow: ${(joinSpam.timeWindow || 10000) / 1000}s\nAction: ${joinSpam.action || 'kick'}`
                : '❌ Disabled',
              inline: true,
            },
            {
              name: 'Verification System',
              value: verification.enabled
                ? `✅ Enabled\nRole: ${verification.roleId ? `<@&${verification.roleId}>` : 'Not set'}\nChannel: ${verification.channelId ? `<#${verification.channelId}>` : 'Not set'}`
                : '❌ Disabled',
              inline: true,
            },
            {
              name: 'Emergency Lockdown',
              value: lockdown.active ? '🚨 **ACTIVE**' : '✅ Inactive',
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        };

        await interaction.editReply({ embeds: [statusEmbed] });
      } else if (subcommand === 'accountage') {
        const enabled = interaction.options.getBoolean('enabled');
        const minDays = interaction.options.getInteger('min_days') || config.antiRaid.accountAge?.minAgeDays || 7;
        const action = interaction.options.getString('action') || config.antiRaid.accountAge?.action || 'kick';

        await updateGuildConfig(interaction.guildId, {
          antiRaid: {
            ...config.antiRaid,
            accountAge: {
              enabled,
              minAgeDays: minDays,
              action,
            },
          },
        });

        await interaction.editReply(
          `✅ Account age filter ${enabled ? 'enabled' : 'disabled'}` +
          (enabled ? `\nMinimum age: ${minDays} days\nAction: ${action}` : '')
        );
      } else if (subcommand === 'joinspam') {
        const enabled = interaction.options.getBoolean('enabled');
        const threshold = interaction.options.getInteger('threshold') || config.antiRaid.joinSpam?.threshold || 5;
        const timeWindow = interaction.options.getInteger('timewindow') || (config.antiRaid.joinSpam?.timeWindow || 10000) / 1000;
        const action = interaction.options.getString('action') || config.antiRaid.joinSpam?.action || 'kick';

        await updateGuildConfig(interaction.guildId, {
          antiRaid: {
            ...config.antiRaid,
            joinSpam: {
              enabled,
              threshold,
              timeWindow: timeWindow * 1000, // Convert to milliseconds
              action,
            },
          },
        });

        await interaction.editReply(
          `✅ Join spam detection ${enabled ? 'enabled' : 'disabled'}` +
          (enabled ? `\nThreshold: ${threshold} joins in ${timeWindow}s\nAction: ${action}` : '')
        );
      } else if (subcommand === 'verification') {
        const enabled = interaction.options.getBoolean('enabled');
        const role = interaction.options.getRole('role');
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');

        // Validate channel type if provided
        if (channel) {
          const { ChannelType } = require('discord.js');
          if (channel.type !== ChannelType.GuildText &&
              channel.type !== ChannelType.GuildAnnouncement) {
            await interaction.editReply('⚠️ The verification channel must be a text channel that supports reactions.');
            return;
          }
        }

        // Validate existing configured channel if falling back to it
        let validChannelId = channel ? channel.id : config.antiRaid.verification?.channelId;
        if (!channel && validChannelId) {
          try {
            const existingChannel = await interaction.guild.channels.fetch(validChannelId);
            const { ChannelType } = require('discord.js');
            if (!existingChannel ||
                (existingChannel.type !== ChannelType.GuildText &&
                 existingChannel.type !== ChannelType.GuildAnnouncement)) {
              validChannelId = null; // Invalid existing channel
            }
          } catch (error) {
            validChannelId = null; // Channel no longer exists
          }
        }

        const verificationConfig = {
          enabled,
          roleId: role ? role.id : (config.antiRaid.verification?.roleId || null),
          channelId: validChannelId,
          message: message || config.antiRaid.verification?.message || 'Welcome! Please verify by reacting to this message.',
        };

        // Validate that role and channel are set if enabling
        if (enabled && (!verificationConfig.roleId || !verificationConfig.channelId)) {
          await interaction.editReply('⚠️ You must set both a role and a valid text channel to enable verification.');
          return;
        }

        await updateGuildConfig(interaction.guildId, {
          antiRaid: {
            ...config.antiRaid,
            verification: verificationConfig,
          },
        });

        await interaction.editReply(
          `✅ Verification system ${enabled ? 'enabled' : 'disabled'}` +
          (enabled ? `\nRole: ${role ? role : `<@&${verificationConfig.roleId}>`}\nChannel: ${channel ? channel : `<#${verificationConfig.channelId}>`}` : '')
        );
      }
    } catch (error) {
      logCommandError('Error configuring anti-raid', interaction, { error });
      await interaction.editReply('Failed to update anti-raid settings. Please try again.');
    }
  },
};
