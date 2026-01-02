const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getGuildConfig,
  updateGuildConfig,
  setLevelRole,
  removeLevelRole,
  setChannelMultiplier,
  setRoleMultiplier,
  initXP,
} = require('../../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpconfig')
    .setDescription('Configure the XP system (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View current XP configuration')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable the XP system')
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Enable or disable XP system')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('xp-per-message')
        .setDescription('Set XP range per message')
        .addIntegerOption((option) =>
          option
            .setName('min')
            .setDescription('Minimum XP per message')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1000)
        )
        .addIntegerOption((option) =>
          option
            .setName('max')
            .setDescription('Maximum XP per message')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('xp-per-command')
        .setDescription('Set XP per command')
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('XP awarded per command')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('cooldown')
        .setDescription('Set cooldown between XP gains from messages')
        .addIntegerOption((option) =>
          option
            .setName('seconds')
            .setDescription('Cooldown in seconds')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(300)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('level-role')
        .setDescription('Set a role reward for reaching a level')
        .addIntegerOption((option) =>
          option
            .setName('level')
            .setDescription('Level required')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000)
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role to award')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove-level-role')
        .setDescription('Remove a level role reward')
        .addIntegerOption((option) =>
          option
            .setName('level')
            .setDescription('Level to remove reward from')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel-multiplier')
        .setDescription('Set XP multiplier for a channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to modify')
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName('multiplier')
            .setDescription('XP multiplier (1.0 = normal, 2.0 = double, 0 = disabled)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(10)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('role-multiplier')
        .setDescription('Set XP multiplier for a role')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role to modify')
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName('multiplier')
            .setDescription('XP multiplier (1.0 = normal, 2.0 = double, 0 = disabled)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(10)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('levelup-channel')
        .setDescription('Set channel for level-up announcements')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel for announcements (leave empty to use current channel)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('levelup-message')
        .setDescription('Set custom level-up message')
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('Message template ({user}, {level}, {xp})')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toggle-announcements')
        .setDescription('Enable or disable level-up announcements')
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Enable or disable announcements')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('no-xp-channel')
        .setDescription('Toggle a channel from gaining XP')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to toggle')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('no-xp-role')
        .setDescription('Toggle a role from gaining XP')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role to toggle')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    await initXP();

    const subcommand = interaction.options.getSubcommand();
    const config = getGuildConfig(interaction.guildId);

    try {
      switch (subcommand) {
        case 'view': {
          const levelRolesText =
            config.levelRoles.length > 0
              ? config.levelRoles
                  .map((lr) => `Level ${lr.level}: <@&${lr.roleId}>`)
                  .join('\n')
              : 'None';

          const channelMultipliers =
            Object.keys(config.channelMultipliers).length > 0
              ? Object.entries(config.channelMultipliers)
                  .map(([id, mult]) => `<#${id}>: ${mult}x`)
                  .join('\n')
              : 'None';

          const roleMultipliers =
            Object.keys(config.roleMultipliers).length > 0
              ? Object.entries(config.roleMultipliers)
                  .map(([id, mult]) => `<@&${id}>: ${mult}x`)
                  .join('\n')
              : 'None';

          const noXpChannels =
            config.noXpChannels.length > 0
              ? config.noXpChannels.map((id) => `<#${id}>`).join(', ')
              : 'None';

          const noXpRoles =
            config.noXpRoles.length > 0
              ? config.noXpRoles.map((id) => `<@&${id}>`).join(', ')
              : 'None';

          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('XP System Configuration')
            .addFields(
              {
                name: 'Status',
                value: config.enabled ? '✅ Enabled' : '❌ Disabled',
                inline: true,
              },
              {
                name: 'XP per Message',
                value: `${config.minXpPerMessage} - ${config.maxXpPerMessage}`,
                inline: true,
              },
              {
                name: 'XP per Command',
                value: `${config.xpPerCommand}`,
                inline: true,
              },
              {
                name: 'Cooldown',
                value: `${config.cooldown} seconds`,
                inline: true,
              },
              {
                name: 'Level-up Announcements',
                value: config.announceLevelUp ? '✅ Enabled' : '❌ Disabled',
                inline: true,
              },
              {
                name: 'Announcement Channel',
                value: config.levelUpChannel
                  ? `<#${config.levelUpChannel}>`
                  : 'Current channel',
                inline: true,
              },
              {
                name: 'Level-up Message',
                value: `\`${config.levelUpMessage}\``,
                inline: false,
              },
              {
                name: 'Level Role Rewards',
                value: levelRolesText,
                inline: false,
              },
              {
                name: 'Channel Multipliers',
                value: channelMultipliers,
                inline: true,
              },
              {
                name: 'Role Multipliers',
                value: roleMultipliers,
                inline: true,
              },
              {
                name: 'No-XP Channels',
                value: noXpChannels,
                inline: true,
              },
              {
                name: 'No-XP Roles',
                value: noXpRoles,
                inline: true,
              }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'toggle': {
          const enabled = interaction.options.getBoolean('enabled');
          await updateGuildConfig(interaction.guildId, { enabled });

          await interaction.reply({
            content: `XP system has been ${enabled ? '✅ **enabled**' : '❌ **disabled**'}.`,
            ephemeral: false,
          });
          break;
        }

        case 'xp-per-message': {
          const min = interaction.options.getInteger('min');
          const max = interaction.options.getInteger('max');

          if (min > max) {
            await interaction.reply({
              content: '❌ Minimum XP cannot be greater than maximum XP.',
              ephemeral: true,
            });
            return;
          }

          await updateGuildConfig(interaction.guildId, {
            minXpPerMessage: min,
            maxXpPerMessage: max,
          });

          await interaction.reply({
            content: `✅ XP per message set to **${min} - ${max}**.`,
            ephemeral: false,
          });
          break;
        }

        case 'xp-per-command': {
          const amount = interaction.options.getInteger('amount');
          await updateGuildConfig(interaction.guildId, {
            xpPerCommand: amount,
          });

          await interaction.reply({
            content: `✅ XP per command set to **${amount}**.`,
            ephemeral: false,
          });
          break;
        }

        case 'cooldown': {
          const seconds = interaction.options.getInteger('seconds');
          await updateGuildConfig(interaction.guildId, { cooldown: seconds });

          await interaction.reply({
            content: `✅ Cooldown set to **${seconds} seconds**.`,
            ephemeral: false,
          });
          break;
        }

        case 'level-role': {
          const level = interaction.options.getInteger('level');
          const role = interaction.options.getRole('role');

          await setLevelRole(interaction.guildId, level, role.id);

          await interaction.reply({
            content: `✅ ${role} will now be awarded at **Level ${level}**.`,
            ephemeral: false,
          });
          break;
        }

        case 'remove-level-role': {
          const level = interaction.options.getInteger('level');
          await removeLevelRole(interaction.guildId, level);

          await interaction.reply({
            content: `✅ Removed level role reward for **Level ${level}**.`,
            ephemeral: false,
          });
          break;
        }

        case 'channel-multiplier': {
          const channel = interaction.options.getChannel('channel');
          const multiplier = interaction.options.getNumber('multiplier');

          await setChannelMultiplier(
            interaction.guildId,
            channel.id,
            multiplier
          );

          await interaction.reply({
            content: `✅ XP multiplier for ${channel} set to **${multiplier}x**.`,
            ephemeral: false,
          });
          break;
        }

        case 'role-multiplier': {
          const role = interaction.options.getRole('role');
          const multiplier = interaction.options.getNumber('multiplier');

          await setRoleMultiplier(interaction.guildId, role.id, multiplier);

          await interaction.reply({
            content: `✅ XP multiplier for ${role} set to **${multiplier}x**.`,
            ephemeral: false,
          });
          break;
        }

        case 'levelup-channel': {
          const channel = interaction.options.getChannel('channel');
          await updateGuildConfig(interaction.guildId, {
            levelUpChannel: channel ? channel.id : null,
          });

          await interaction.reply({
            content: channel
              ? `✅ Level-up announcements will be sent to ${channel}.`
              : `✅ Level-up announcements will be sent in the channel where users level up.`,
            ephemeral: false,
          });
          break;
        }

        case 'levelup-message': {
          const message = interaction.options.getString('message');
          await updateGuildConfig(interaction.guildId, {
            levelUpMessage: message,
          });

          await interaction.reply({
            content: `✅ Level-up message updated to:\n\`${message}\``,
            ephemeral: false,
          });
          break;
        }

        case 'toggle-announcements': {
          const enabled = interaction.options.getBoolean('enabled');
          await updateGuildConfig(interaction.guildId, {
            announceLevelUp: enabled,
          });

          await interaction.reply({
            content: `✅ Level-up announcements ${enabled ? 'enabled' : 'disabled'}.`,
            ephemeral: false,
          });
          break;
        }

        case 'no-xp-channel': {
          const channel = interaction.options.getChannel('channel');
          const currentConfig = getGuildConfig(interaction.guildId);

          const index = currentConfig.noXpChannels.indexOf(channel.id);
          if (index > -1) {
            currentConfig.noXpChannels.splice(index, 1);
            await updateGuildConfig(interaction.guildId, {
              noXpChannels: currentConfig.noXpChannels,
            });
            await interaction.reply({
              content: `✅ ${channel} can now earn XP.`,
              ephemeral: false,
            });
          } else {
            currentConfig.noXpChannels.push(channel.id);
            await updateGuildConfig(interaction.guildId, {
              noXpChannels: currentConfig.noXpChannels,
            });
            await interaction.reply({
              content: `✅ ${channel} will no longer earn XP.`,
              ephemeral: false,
            });
          }
          break;
        }

        case 'no-xp-role': {
          const role = interaction.options.getRole('role');
          const currentConfig = getGuildConfig(interaction.guildId);

          const index = currentConfig.noXpRoles.indexOf(role.id);
          if (index > -1) {
            currentConfig.noXpRoles.splice(index, 1);
            await updateGuildConfig(interaction.guildId, {
              noXpRoles: currentConfig.noXpRoles,
            });
            await interaction.reply({
              content: `✅ ${role} can now earn XP.`,
              ephemeral: false,
            });
          } else {
            currentConfig.noXpRoles.push(role.id);
            await updateGuildConfig(interaction.guildId, {
              noXpRoles: currentConfig.noXpRoles,
            });
            await interaction.reply({
              content: `✅ ${role} will no longer earn XP.`,
              ephemeral: false,
            });
          }
          break;
        }

        default:
          await interaction.reply({
            content: 'Unknown subcommand.',
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error('XP Config Error:', error);
      await interaction.reply({
        content: '❌ An error occurred while updating the configuration.',
        ephemeral: true,
      });
    }
  },
};
