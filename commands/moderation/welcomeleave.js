const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeleave')
    .setDescription('Configure welcome and leave messages')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current welcome/leave message configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome-enable')
        .setDescription('Enable welcome messages')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome-disable')
        .setDescription('Disable welcome messages')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome-channel')
        .setDescription('Set the welcome message channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for welcome messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome-message')
        .setDescription('Set the welcome message')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Message template. Placeholders: {user}, {username}, {server}, {memberCount}')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave-enable')
        .setDescription('Enable leave messages')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave-disable')
        .setDescription('Disable leave messages')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave-channel')
        .setDescription('Set the leave message channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for leave messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave-message')
        .setDescription('Set the leave message')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Message template. Placeholders: {user}, {username}, {server}, {memberCount}')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const config = getGuildConfig(interaction.guildId);

    // Status
    if (subcommand === 'status') {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Welcome & Leave Messages Configuration')
        .addFields(
          {
            name: 'Welcome Messages',
            value: config.welcome.enabled ? '✅ Enabled' : '❌ Disabled',
            inline: true,
          },
          {
            name: 'Welcome Channel',
            value: config.welcome.channelId ? `<#${config.welcome.channelId}>` : 'Not set',
            inline: true,
          },
          {
            name: 'Welcome Message',
            value: config.welcome.message ? `\`${config.welcome.message}\`` : 'Not set',
            inline: false,
          },
          {
            name: 'Leave Messages',
            value: config.leave.enabled ? '✅ Enabled' : '❌ Disabled',
            inline: true,
          },
          {
            name: 'Leave Channel',
            value: config.leave.channelId ? `<#${config.leave.channelId}>` : 'Not set',
            inline: true,
          },
          {
            name: 'Leave Message',
            value: config.leave.message ? `\`${config.leave.message}\`` : 'Not set',
            inline: false,
          }
        )
        .setFooter({ text: 'Placeholders: {user}, {username}, {server}, {memberCount}' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Welcome enable
    if (subcommand === 'welcome-enable') {
      if (!config.welcome.channelId) {
        await interaction.editReply('❌ Please set a welcome channel first using `/welcomeleave welcome-channel`.');
        return;
      }

      await updateGuildConfig(interaction.guildId, {
        welcome: { ...config.welcome, enabled: true },
      });
      await interaction.editReply('✅ Welcome messages have been enabled.');
      return;
    }

    // Welcome disable
    if (subcommand === 'welcome-disable') {
      await updateGuildConfig(interaction.guildId, {
        welcome: { ...config.welcome, enabled: false },
      });
      await interaction.editReply('❌ Welcome messages have been disabled.');
      return;
    }

    // Welcome channel
    if (subcommand === 'welcome-channel') {
      const channel = interaction.options.getChannel('channel');

      // Verify bot has permission to send messages
      if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
        await interaction.editReply('❌ I do not have permission to send messages in that channel. Please grant me the "Send Messages" permission.');
        return;
      }

      await updateGuildConfig(interaction.guildId, {
        welcome: { ...config.welcome, channelId: channel.id },
      });
      await interaction.editReply(`✅ Welcome channel set to ${channel}.`);
      return;
    }

    // Welcome message
    if (subcommand === 'welcome-message') {
      const message = interaction.options.getString('message');

      await updateGuildConfig(interaction.guildId, {
        welcome: { ...config.welcome, message },
      });
      await interaction.editReply(`✅ Welcome message set to: \`${message}\``);
      return;
    }

    // Leave enable
    if (subcommand === 'leave-enable') {
      if (!config.leave.channelId) {
        await interaction.editReply('❌ Please set a leave channel first using `/welcomeleave leave-channel`.');
        return;
      }

      await updateGuildConfig(interaction.guildId, {
        leave: { ...config.leave, enabled: true },
      });
      await interaction.editReply('✅ Leave messages have been enabled.');
      return;
    }

    // Leave disable
    if (subcommand === 'leave-disable') {
      await updateGuildConfig(interaction.guildId, {
        leave: { ...config.leave, enabled: false },
      });
      await interaction.editReply('❌ Leave messages have been disabled.');
      return;
    }

    // Leave channel
    if (subcommand === 'leave-channel') {
      const channel = interaction.options.getChannel('channel');

      // Verify bot has permission to send messages
      if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
        await interaction.editReply('❌ I do not have permission to send messages in that channel. Please grant me the "Send Messages" permission.');
        return;
      }

      await updateGuildConfig(interaction.guildId, {
        leave: { ...config.leave, channelId: channel.id },
      });
      await interaction.editReply(`✅ Leave channel set to ${channel}.`);
      return;
    }

    // Leave message
    if (subcommand === 'leave-message') {
      const message = interaction.options.getString('message');

      await updateGuildConfig(interaction.guildId, {
        leave: { ...config.leave, message },
      });
      await interaction.editReply(`✅ Leave message set to: \`${message}\``);
      return;
    }
  },
};
