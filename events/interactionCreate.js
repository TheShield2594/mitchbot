const { Events } = require('discord.js');
const { recordCommandUsage } = require('../utils/stats');
const { updateUserStats } = require('../utils/achievements');
const { awardCommandXP, getRolesForLevel, getGuildConfig } = require('../utils/xp');
const logger = require('../utils/logger');
const { handleCommandError } = require('../utils/commandErrors');

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

        // Award XP for command usage
        try {
          const member = interaction.member;
          const userRoles = member ? Array.from(member.roles.cache.keys()) : [];

          const xpResult = awardCommandXP(
            interaction.guildId,
            interaction.user.id,
            interaction.user.username,
            interaction.channelId,
            userRoles
          );

          // Handle level-up
          if (xpResult && xpResult.leveledUp) {
            const rolesForLevel = getRolesForLevel(interaction.guildId, xpResult.newLevel);

            // Award level roles
            if (rolesForLevel.length > 0 && member) {
              for (const roleId of rolesForLevel) {
                try {
                  const role = interaction.guild.roles.cache.get(roleId);
                  if (role && !member.roles.cache.has(roleId)) {
                    await member.roles.add(role);
                  }
                } catch (err) {
                  logger.error('interactionCreate: Failed to award level role', {
                    ...interactionContext,
                    roleId,
                    error: err,
                  });
                }
              }
            }

            // Send level-up message
            const config = getGuildConfig(interaction.guildId);

            if (config.announceLevelUp) {
              const levelUpMessage = config.levelUpMessage
                .replace('{user}', `<@${interaction.user.id}>`)
                .replace('{level}', xpResult.newLevel)
                .replace('{xp}', xpResult.totalXp);

              const channelToUse = config.levelUpChannel
                ? interaction.guild.channels.cache.get(config.levelUpChannel)
                : interaction.channel;

              if (channelToUse) {
                setTimeout(async () => {
                  try {
                    await channelToUse.send(levelUpMessage);
                  } catch (err) {
                    logger.error('interactionCreate: Failed to send level-up message', {
                      ...interactionContext,
                      error: err,
                    });
                  }
                }, 1500);
              }
            }
          }
        } catch (error) {
          logger.warn('Failed to award command XP', {
            ...interactionContext,
            error,
          });
        }
      } catch (error) {
        logger.warn('Failed to record command stats', {
          ...interactionContext,
          error,
        });
      }
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
