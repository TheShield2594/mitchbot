function formatDuration(duration) {
  if (duration === null || duration === undefined) {
    return null;
  }

  if (typeof duration === 'string') {
    return duration;
  }

  const totalSeconds = Math.floor(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatActionLabel(caseEntry) {
  if (caseEntry.action) {
    return caseEntry.action;
  }

  if (!caseEntry.actionType) {
    return 'Case';
  }

  return caseEntry.actionType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
  formatDuration,
  formatActionLabel,
};
