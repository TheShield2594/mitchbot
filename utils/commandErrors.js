const logger = require('./logger');

const DEFAULT_ERROR_MESSAGE = "Something broke. Mitch is pretending this didn't happen.";

function formatUserFacingError(error) {
  if (error && typeof error === 'object') {
    if (typeof error.userMessage === 'string' && error.userMessage.trim() !== '') {
      return { content: error.userMessage, ephemeral: true };
    }

    if (error.expose === true && typeof error.message === 'string' && error.message.trim() !== '') {
      return { content: error.message, ephemeral: true };
    }
  }

  return { content: DEFAULT_ERROR_MESSAGE, ephemeral: true };
}

function buildErrorContext(error, { commandName, userId, guildId }, includeStack) {
  if (!error || typeof error !== 'object') {
    return {
      commandName,
      userId,
      guildId,
      error: { value: error },
    };
  }

  const errorPayload = {
    name: error.name,
    message: error.message,
    code: error.code,
  };

  if (includeStack && error.stack) {
    errorPayload.stack = error.stack;
  }

  return {
    commandName,
    userId,
    guildId,
    error: errorPayload,
  };
}

function logCommandError(error, context = {}, options = {}) {
  const includeStack = options.includeStack ?? process.env.NODE_ENV === 'development';
  const logContext = buildErrorContext(error, context, includeStack);
  logger.error('Command execution failed', logContext);
}

async function handleCommandError(interaction, error, options = {}) {
  logCommandError(error, {
    commandName: interaction.commandName,
    userId: interaction.user?.id,
    guildId: interaction.guildId,
  }, options);

  const response = formatUserFacingError(error);

  try {
    if (interaction.deferred && !interaction.replied) {
      const isEphemeral = Boolean(interaction.ephemeral);

      if (isEphemeral) {
        await interaction.editReply(response);
        return;
      }

      await interaction.editReply({ content: response.content });
      await interaction.followUp(response);
      return;
    }

    if (interaction.replied) {
      await interaction.followUp(response);
      return;
    }

    await interaction.reply(response);
  } catch (replyError) {
    logger.error('Failed to send command error response', {
      commandName: interaction.commandName,
      userId: interaction.user?.id,
      guildId: interaction.guildId,
      error: replyError,
    });
  }
}

async function executeCommand(interaction, command, options = {}) {
  try {
    await command.execute(interaction);
  } catch (error) {
    await handleCommandError(interaction, error, options);
  }
}

module.exports = {
  executeCommand,
  formatUserFacingError,
  handleCommandError,
  logCommandError,
};
