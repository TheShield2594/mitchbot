const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCustomSnark, removeCustomSnark, listCustomSnark } = require('../../utils/snark');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customsnark')
    .setDescription('Manage custom roasts, compliments, and quests for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a custom response')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of response')
            .setRequired(true)
            .addChoices(
              { name: 'Roast', value: 'roasts' },
              { name: 'Compliment', value: 'compliments' },
              { name: 'Quest', value: 'quests' }
            )
        )
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('The custom response text')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a custom response by index')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of response')
            .setRequired(true)
            .addChoices(
              { name: 'Roast', value: 'roasts' },
              { name: 'Compliment', value: 'compliments' },
              { name: 'Quest', value: 'quests' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('index')
            .setDescription('Index of the response to remove (from /customsnark list)')
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all custom responses')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of response')
            .setRequired(true)
            .addChoices(
              { name: 'Roast', value: 'roasts' },
              { name: 'Compliment', value: 'compliments' },
              { name: 'Quest', value: 'quests' }
            )
        )
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Custom snark is only available in servers.',
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const type = interaction.options.getString('type');

    if (subcommand === 'add') {
      const content = interaction.options.getString('content');

      const result = addCustomSnark(interaction.guildId, type, content);

      if (!result.success) {
        await interaction.reply({
          content: `Failed to add: ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `Added custom ${type.slice(0, -1)}. Total: ${result.count}/50`,
        ephemeral: true,
      });
    } else if (subcommand === 'remove') {
      const index = interaction.options.getInteger('index');

      const result = removeCustomSnark(interaction.guildId, type, index);

      if (!result.success) {
        await interaction.reply({
          content: `Failed to remove: ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `Removed: "${result.removed}"\nRemaining: ${result.remaining}`,
        ephemeral: true,
      });
    } else if (subcommand === 'list') {
      const result = listCustomSnark(interaction.guildId, type);

      if (!result.success) {
        await interaction.reply({
          content: `Failed to list: ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      if (result.items.length === 0) {
        await interaction.reply({
          content: `No custom ${type} configured. Use \`/customsnark add\` to add some.`,
          ephemeral: true,
        });
        return;
      }

      const list = result.items
        .map((item, index) => `${index}. ${item}`)
        .join('\n');

      await interaction.reply({
        content: `**Custom ${type} (${result.items.length}/50)**\n\`\`\`\n${list}\n\`\`\``,
        ephemeral: true,
      });
    }
  },
};
