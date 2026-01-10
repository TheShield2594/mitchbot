/**
 * Shared time formatting utilities
 */

/**
 * Formats an ISO date string as a Discord relative timestamp
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Discord relative timestamp format or "soon" if invalid
 */
function formatRelativeTimestamp(isoString) {
    if (!isoString) {
        return "soon";
    }

    const timestamp = Math.floor(new Date(isoString).getTime() / 1000);
    if (Number.isNaN(timestamp)) {
        return "soon";
    }

    return `<t:${timestamp}:R>`;
}

module.exports = {
    formatRelativeTimestamp,
};
