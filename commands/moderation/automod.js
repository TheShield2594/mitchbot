const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automod settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current automod configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable automod')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable automod')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('wordfilter')
        .setDescription('Configure word filter')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('What to do')
            .setRequired(true)
            .addChoices(
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' },
              { name: 'Add Word', value: 'add' },
              { name: 'Remove Word', value: 'remove' },
              { name: 'List Words', value: 'list' },
            )
        )
        .addStringOption(option =>
          option
            .setName('word')
            .setDescription('Word/phrase to add or remove')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('invitefilter')
        .setDescription('Configure invite link filter')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('What to do')
            .setRequired(true)
            .addChoices(
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' },
            )
        )
        .addBooleanOption(option =>
          option
            .setName('allow_own_server')
            .setDescription('Allow invites to this server')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('linkfilter')
        .setDescription('Configure external link filter')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('What to do')
            .setRequired(true)
            .addChoices(
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' },
              { name: 'Whitelist Domain', value: 'whitelist' },
              { name: 'Blacklist Domain', value: 'blacklist' },
              { name: 'Remove Whitelist', value: 'remove_whitelist' },
              { name: 'Remove Blacklist', value: 'remove_blacklist' },
              { name: 'List Filters', value: 'list' },
            )
        )
        .addStringOption(option =>
          option
            .setName('domain')
            .setDescription('Domain to whitelist/blacklist (e.g., youtube.com)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('spam')
        .setDescription('Configure spam detection')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('What to do')
            .setRequired(true)
            .addChoices(
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' },
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logchannel')
        .setDescription('Set moderation log channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for mod logs')
            .setRequired(false)
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
        .setColor(config.automod.enabled ? '#00ff00' : '#ff0000')
        .setTitle('⚙️ Automod Configuration')
        .addFields(
          {
            name: 'Automod Status',
            value: config.automod.enabled ? '✅ Enabled' : '❌ Disabled',
          },
          {
            name: 'Word Filter',
            value: `${config.automod.wordFilter.enabled ? '✅' : '❌'} ${config.automod.wordFilter.words.length} words filtered`,
          },
          {
            name: 'Invite Filter',
            value: `${config.automod.inviteFilter.enabled ? '✅' : '❌'} ${config.automod.inviteFilter.allowOwnServer ? '(Own server allowed)' : '(All blocked)'}`,
          },
          {
            name: 'Link Filter',
            value: `${config.automod.linkFilter.enabled ? '✅' : '❌'} ${config.automod.linkFilter.whitelist.length} whitelisted, ${config.automod.linkFilter.blacklist.length} blacklisted`,
          },
          {
            name: 'Spam Detection',
            value: config.automod.spam.enabled ? '✅ Enabled' : '❌ Disabled',
          },
          {
            name: 'Mention Spam',
            value: config.automod.mentionSpam.enabled ? '✅ Enabled' : '❌ Disabled',
          },
          {
            name: 'Caps Spam',
            value: config.automod.capsSpam.enabled ? '✅ Enabled' : '❌ Disabled',
          },
          {
            name: 'Mod Log Channel',
            value: config.logging.channelId ? `<#${config.logging.channelId}>` : 'Not set',
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Enable/Disable Automod
    if (subcommand === 'enable') {
      updateGuildConfig(interaction.guildId, { automod: { ...config.automod, enabled: true } });
      await interaction.editReply('✅ Automod has been enabled.');
      return;
    }

    if (subcommand === 'disable') {
      updateGuildConfig(interaction.guildId, { automod: { ...config.automod, enabled: false } });
      await interaction.editReply('❌ Automod has been disabled.');
      return;
    }

    // Word Filter
    if (subcommand === 'wordfilter') {
      const action = interaction.options.getString('action');
      const word = interaction.options.getString('word');

      if (action === 'enable') {
        config.automod.wordFilter.enabled = true;
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('✅ Word filter enabled.');
      } else if (action === 'disable') {
        config.automod.wordFilter.enabled = false;
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('❌ Word filter disabled.');
      } else if (action === 'add') {
        if (!word) {
          await interaction.editReply('❌ Please provide a word to add.');
          return;
        }
        if (!config.automod.wordFilter.words.includes(word.toLowerCase())) {
          config.automod.wordFilter.words.push(word.toLowerCase());
          updateGuildConfig(interaction.guildId, { automod: config.automod });
          await interaction.editReply(`✅ Added "${word}" to word filter.`);
        } else {
          await interaction.editReply('❌ That word is already in the filter.');
        }
      } else if (action === 'remove') {
        if (!word) {
          await interaction.editReply('❌ Please provide a word to remove.');
          return;
        }
        const index = config.automod.wordFilter.words.indexOf(word.toLowerCase());
        if (index > -1) {
          config.automod.wordFilter.words.splice(index, 1);
          updateGuildConfig(interaction.guildId, { automod: config.automod });
          await interaction.editReply(`✅ Removed "${word}" from word filter.`);
        } else {
          await interaction.editReply('❌ That word is not in the filter.');
        }
      } else if (action === 'list') {
        if (config.automod.wordFilter.words.length === 0) {
          await interaction.editReply('No filtered words configured.');
        } else {
          await interaction.editReply(`**Filtered words (${config.automod.wordFilter.words.length}):**\n${config.automod.wordFilter.words.join(', ')}`);
        }
      }
      return;
    }

    // Invite Filter
    if (subcommand === 'invitefilter') {
      const action = interaction.options.getString('action');
      const allowOwn = interaction.options.getBoolean('allow_own_server');

      if (action === 'enable') {
        config.automod.inviteFilter.enabled = true;
        if (allowOwn !== null) {
          config.automod.inviteFilter.allowOwnServer = allowOwn;
        }
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('✅ Invite filter enabled.');
      } else if (action === 'disable') {
        config.automod.inviteFilter.enabled = false;
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('❌ Invite filter disabled.');
      }
      return;
    }

    // Link Filter
    if (subcommand === 'linkfilter') {
      const action = interaction.options.getString('action');
      const domain = interaction.options.getString('domain');

      if (action === 'enable') {
        config.automod.linkFilter.enabled = true;
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('✅ Link filter enabled.');
      } else if (action === 'disable') {
        config.automod.linkFilter.enabled = false;
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('❌ Link filter disabled.');
      } else if (action === 'whitelist') {
        if (!domain) {
          await interaction.editReply('❌ Please provide a domain to whitelist.');
          return;
        }
        if (!config.automod.linkFilter.whitelist.includes(domain)) {
          config.automod.linkFilter.whitelist.push(domain);
          updateGuildConfig(interaction.guildId, { automod: config.automod });
          await interaction.editReply(`✅ Added "${domain}" to whitelist.`);
        } else {
          await interaction.editReply('❌ That domain is already whitelisted.');
        }
      } else if (action === 'blacklist') {
        if (!domain) {
          await interaction.editReply('❌ Please provide a domain to blacklist.');
          return;
        }
        if (!config.automod.linkFilter.blacklist.includes(domain)) {
          config.automod.linkFilter.blacklist.push(domain);
          updateGuildConfig(interaction.guildId, { automod: config.automod });
          await interaction.editReply(`✅ Added "${domain}" to blacklist.`);
        } else {
          await interaction.editReply('❌ That domain is already blacklisted.');
        }
      } else if (action === 'remove_whitelist') {
        if (!domain) {
          await interaction.editReply('❌ Please provide a domain to remove.');
          return;
        }
        const index = config.automod.linkFilter.whitelist.indexOf(domain);
        if (index > -1) {
          config.automod.linkFilter.whitelist.splice(index, 1);
          updateGuildConfig(interaction.guildId, { automod: config.automod });
          await interaction.editReply(`✅ Removed "${domain}" from whitelist.`);
        } else {
          await interaction.editReply('❌ That domain is not in the whitelist.');
        }
      } else if (action === 'remove_blacklist') {
        if (!domain) {
          await interaction.editReply('❌ Please provide a domain to remove.');
          return;
        }
        const index = config.automod.linkFilter.blacklist.indexOf(domain);
        if (index > -1) {
          config.automod.linkFilter.blacklist.splice(index, 1);
          updateGuildConfig(interaction.guildId, { automod: config.automod });
          await interaction.editReply(`✅ Removed "${domain}" from blacklist.`);
        } else {
          await interaction.editReply('❌ That domain is not in the blacklist.');
        }
      } else if (action === 'list') {
        let message = '**Link Filter Configuration:**\n';
        message += `\n**Whitelisted Domains (${config.automod.linkFilter.whitelist.length}):**\n`;
        message += config.automod.linkFilter.whitelist.length > 0 ? config.automod.linkFilter.whitelist.join(', ') : 'None';
        message += `\n\n**Blacklisted Domains (${config.automod.linkFilter.blacklist.length}):**\n`;
        message += config.automod.linkFilter.blacklist.length > 0 ? config.automod.linkFilter.blacklist.join(', ') : 'None';
        await interaction.editReply(message);
      }
      return;
    }

    // Spam Detection
    if (subcommand === 'spam') {
      const action = interaction.options.getString('action');

      if (action === 'enable') {
        config.automod.spam.enabled = true;
        config.automod.mentionSpam.enabled = true;
        config.automod.capsSpam.enabled = true;
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('✅ Spam detection enabled (message spam, mention spam, caps spam).');
      } else if (action === 'disable') {
        config.automod.spam.enabled = false;
        config.automod.mentionSpam.enabled = false;
        config.automod.capsSpam.enabled = false;
        updateGuildConfig(interaction.guildId, { automod: config.automod });
        await interaction.editReply('❌ Spam detection disabled.');
      }
      return;
    }

    // Log Channel
    if (subcommand === 'logchannel') {
      const channel = interaction.options.getChannel('channel');

      if (!channel) {
        config.logging.enabled = false;
        config.logging.channelId = null;
        updateGuildConfig(interaction.guildId, { logging: config.logging });
        await interaction.editReply('❌ Mod log channel removed.');
      } else {
        config.logging.enabled = true;
        config.logging.channelId = channel.id;
        updateGuildConfig(interaction.guildId, { logging: config.logging });
        await interaction.editReply(`✅ Mod log channel set to ${channel}.`);
      }
      return;
    }
  },
};
