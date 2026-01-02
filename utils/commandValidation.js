const NAME_PATTERN = /^[\\w-]{1,32}$/;
const DESCRIPTION_MIN = 1;
const DESCRIPTION_MAX = 100;
const MAX_OPTIONS = 25;
const MAX_CHOICES = 25;

const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;

const validateName = (errors, path, value) => {
  if (!hasValue(value)) {
    errors.push(`${path} must be a non-empty string.`);
    return;
  }

  if (value.length < 1 || value.length > 32) {
    errors.push(`${path} must be between 1 and 32 characters.`);
  }

  if (value !== value.toLowerCase()) {
    errors.push(`${path} must be lowercase.`);
  }

  if (!NAME_PATTERN.test(value)) {
    errors.push(`${path} must match ${NAME_PATTERN}.`);
  }
};

const validateDescription = (errors, path, value) => {
  if (!hasValue(value)) {
    errors.push(`${path} must be a non-empty string.`);
    return;
  }

  if (value.length < DESCRIPTION_MIN || value.length > DESCRIPTION_MAX) {
    errors.push(
      `${path} must be between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters.`
    );
  }
};

const validateChoiceName = (errors, path, value) => {
  if (!hasValue(value)) {
    errors.push(`${path} must be a non-empty string.`);
    return;
  }

  if (value.length < DESCRIPTION_MIN || value.length > DESCRIPTION_MAX) {
    errors.push(
      `${path} must be between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters.`
    );
  }
};

const validateChoices = (errors, choices, path) => {
  if (!Array.isArray(choices)) {
    return;
  }

  if (choices.length > MAX_CHOICES) {
    errors.push(`${path} must have at most ${MAX_CHOICES} choices.`);
  }

  choices.forEach((choice, index) => {
    const choicePath = `${path}[${index}]`;
    validateChoiceName(errors, `${choicePath}.name`, choice?.name);
    if (choice?.value === undefined) {
      errors.push(`${choicePath}.value must be provided.`);
    }
  });
};

const validateOptions = (errors, options, path) => {
  if (!Array.isArray(options)) {
    return;
  }

  if (options.length > MAX_OPTIONS) {
    errors.push(`${path} must have at most ${MAX_OPTIONS} options.`);
  }

  options.forEach((option, index) => {
    const optionPath = `${path}[${index}]`;
    validateName(errors, `${optionPath}.name`, option?.name);
    validateDescription(errors, `${optionPath}.description`, option?.description);
    validateChoices(errors, option?.choices, `${optionPath}.choices`);

    if (Array.isArray(option?.options)) {
      validateOptions(errors, option.options, `${optionPath}.options`);
    }
  });
};

const validateCommandMetadata = (command) => {
  const errors = [];
  if (!command || typeof command !== 'object') {
    return ['Command metadata must be an object.'];
  }

  validateName(errors, 'command.name', command.name);

  const commandType = command.type ?? 1;
  if (commandType === 1) {
    validateDescription(errors, 'command.description', command.description);
  }

  if (Array.isArray(command.options)) {
    validateOptions(errors, command.options, 'command.options');
  }

  return errors;
};

module.exports = { validateCommandMetadata };
