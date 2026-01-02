const logger = require('./logger');

function buildCommandContext(message, interaction) {
  return {
    guildId: interaction?.guildId ?? message?.guildId,
    channelId: interaction?.channelId ?? message?.channel?.id,
    userId: interaction?.user?.id ?? message?.author?.id,
    commandName: interaction?.commandName,
  };
}

function logCommandError(message, interaction, additionalContext = {}, messageContext = null) {
  logger.error(message, {
    ...buildCommandContext(messageContext, interaction),
    ...additionalContext,
  });
}

module.exports = {
  buildCommandContext,
  logCommandError,
};
