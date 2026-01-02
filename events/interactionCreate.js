const { Events } = require('discord.js');
const { recordCommandUsage } = require('../utils/stats');
const { updateUserStats } = require('../utils/achievements');
const logger = require('../utils/logger');

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

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.error('Command not found', getInteractionContext(interaction));
      try {
        await interaction.reply({
          content: `Command \`/${interaction.commandName}\` is not registered. Please contact a server administrator to run \`npm run deploy\` to update slash commands.`,
          ephemeral: true,
        });
      } catch (error) {
        logger.error('Failed to send command-not-found message', {
          ...getInteractionContext(interaction),
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
                ...getInteractionContext(interaction),
                error,
              });
            }
          }, 1000);
        }
      } catch (error) {
        logger.warn('Failed to record command stats', {
          ...getInteractionContext(interaction),
          error,
        });
      }
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('Command execution failed', {
        ...getInteractionContext(interaction),
        error,
      });
      const errorMessage = {
        content: 'Something broke. Mitch is pretending this didn\'t happen.',
        ephemeral: true,
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        logger.error('Failed to send error message', {
          ...getInteractionContext(interaction),
          error: replyError,
        });
      }
    }
  },
};
