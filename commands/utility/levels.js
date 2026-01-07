const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig, initXP } = require('../../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('View all level role rewards'),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    await initXP();

    const config = getGuildConfig(interaction.guildId);

    if (!config.levelRoles || config.levelRoles.length === 0) {
      await interaction.reply({
        content: 'No level rewards have been configured yet.',
        ephemeral: true,
      });
      return;
    }

    // Build rewards list
    const rewardsList = config.levelRoles
      .sort((a, b) => a.level - b.level)
      .map((reward) => {
        return `**Level ${reward.level}** → <@&${reward.roleId}>`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${interaction.guild.name} - Level Rewards`)
      .setDescription(
        `Earn these roles by leveling up!\n\n${rewardsList}`
      )
      .setFooter({
        text: `${config.levelRoles.length} role reward${config.levelRoles.length !== 1 ? 's' : ''} configured`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
