const { Events } = require('discord.js');
const { recordCommandUsage } = require('../utils/stats');
const { updateUserStats } = require('../utils/achievements');
const logger = require('../utils/logger');
const { executeCommand } = require('../utils/commandErrors');

function getInteractionContext(interaction) {
  return {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user?.id,
    commandName: interaction.commandName,
  };
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const interactionContext = getInteractionContext(interaction);
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.error('Command not found', interactionContext);
      try {
        await interaction.reply({
          content: `Command \`/${interaction.commandName}\` is not registered. Please contact a server administrator to run \`npm run deploy\` to update slash commands.`,
          ephemeral: true,
        });
      } catch (error) {
        logger.error('Failed to send command-not-found message', {
          ...interactionContext,
          error,
        });
      }
      return;
    }

    // Record command usage stats and check achievements (only for guild commands)
    if (interaction.guildId) {
      try {
        recordCommandUsage(interaction.guildId, interaction.commandName, interaction.user.id);

        // Update achievement stats
        const newAchievements = updateUserStats(
          interaction.guildId,
          interaction.user.id,
          interaction.user.username,
          { commandsUsed: 1 }
        );

        // Notify user of new achievements (send after command execution)
        if (newAchievements.length > 0) {
          setTimeout(async () => {
            try {
              const achievementMsg = newAchievements
                .map(a => `${a.emoji} **${a.name}** - ${a.description}`)
                .join('\n');

              await interaction.followUp({
                content: `${interaction.user} unlocked:\n${achievementMsg}`,
                ephemeral: false,
              });
            } catch (error) {
              logger.warn('Failed to send achievement notification', {
                ...interactionContext,
                error,
              });
            }
          }, 1000);
        }
      } catch (error) {
        logger.warn('Failed to record command stats', {
          ...interactionContext,
          error,
        });
      }
    }

    await executeCommand(interaction, command);
  },
};
