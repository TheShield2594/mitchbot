const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { request } = require('undici');

/**
 * Generate a rank card image
 * @param {Object} options - Rank card options
 * @param {string} options.username - User's username
 * @param {string} options.avatarURL - User's avatar URL
 * @param {number} options.level - User's current level
 * @param {number} options.rank - User's rank position
 * @param {number} options.currentXP - XP in current level
 * @param {number} options.requiredXP - XP required for next level
 * @param {number} options.totalXP - Total XP accumulated
 * @param {string} options.accentColor - Accent color for the card (hex)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateRankCard(options) {
    const {
        username,
        avatarURL,
        level,
        rank,
        currentXP,
        requiredXP,
        totalXP,
        accentColor = '#5865F2',
    } = options;

    // Validate required parameters
    if (!username || typeof username !== 'string') {
        throw new Error('Invalid username: must be a non-empty string');
    }
    if (!avatarURL || typeof avatarURL !== 'string') {
        throw new Error('Invalid avatarURL: must be a non-empty string');
    }
    if (typeof level !== 'number' || level < 0) {
        throw new Error('Invalid level: must be a non-negative number');
    }
    if (typeof rank !== 'number' || rank < 0) {
        throw new Error('Invalid rank: must be a non-negative number');
    }
    if (typeof currentXP !== 'number' || currentXP < 0) {
        throw new Error('Invalid currentXP: must be a non-negative number');
    }
    if (typeof requiredXP !== 'number' || requiredXP <= 0) {
        throw new Error('Invalid requiredXP: must be a positive number');
    }
    if (typeof totalXP !== 'number' || totalXP < 0) {
        throw new Error('Invalid totalXP: must be a non-negative number');
    }
    if (typeof accentColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
        throw new Error('Invalid accentColor: must be a valid hex color (e.g., #5865F2)');
    }

    // Card dimensions
    const width = 934;
    const height = 282;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#23272A');
    gradient.addColorStop(1, '#2C2F33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Avatar circle background
    const avatarX = 60;
    const avatarY = height / 2;
    const avatarRadius = 80;

    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#2C2F33';
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Load and draw avatar
    try {
        const avatarResponse = await request(avatarURL, {
            method: 'GET',
            headersTimeout: 5000,
            bodyTimeout: 10000,
            maxRedirections: 3,
        });

        const contentLength = avatarResponse.headers['content-length'];
        if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
            throw new Error('Avatar too large (max 5MB)');
        }

        const avatarBuffer = Buffer.from(await avatarResponse.body.arrayBuffer());

        if (avatarBuffer.length > 5 * 1024 * 1024) {
            throw new Error('Avatar too large (max 5MB)');
        }

        const avatar = await loadImage(avatarBuffer);

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius - 3, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(
            avatar,
            avatarX + 3,
            avatarY - avatarRadius + 3,
            (avatarRadius - 3) * 2,
            (avatarRadius - 3) * 2
        );

        ctx.restore();
    } catch (error) {
        // If avatar fails to load, draw a placeholder
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius - 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username.charAt(0).toUpperCase(), avatarX + avatarRadius, avatarY);
    }

    // Username
    const textStartX = 240;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Truncate username if too long
    let displayName = username;
    const maxWidth = 400;
    let textWidth = ctx.measureText(displayName).width;
    while (textWidth > maxWidth && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
        textWidth = ctx.measureText(displayName + '...').width;
    }
    if (displayName !== username) {
        displayName += '...';
    }

    ctx.fillText(displayName, textStartX, 40);

    // Rank
    ctx.fillStyle = '#B9BBBE';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Rank #${rank.toLocaleString()}`, textStartX, 90);

    // Level (right side)
    const levelBoxX = width - 180;
    const levelBoxY = 40;
    const levelBoxWidth = 140;
    const levelBoxHeight = 70;

    // Level box background
    ctx.fillStyle = accentColor;
    ctx.fillRect(levelBoxX, levelBoxY, levelBoxWidth, levelBoxHeight);

    // Level text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL', levelBoxX + levelBoxWidth / 2, levelBoxY + 20);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(level.toString(), levelBoxX + levelBoxWidth / 2, levelBoxY + 50);

    // XP Progress bar
    const progressBarX = textStartX;
    const progressBarY = height - 80;
    const progressBarWidth = width - textStartX - 40;
    const progressBarHeight = 40;

    // Progress bar background
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

    // Clamp displayed XP when currentXP exceeds requiredXP
    const displayXP = Math.min(currentXP, requiredXP);
    const progress = displayXP / requiredXP;
    const fillWidth = Math.min(progressBarWidth * progress, progressBarWidth);

    const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth, 0);
    progressGradient.addColorStop(0, accentColor);
    progressGradient.addColorStop(1, lightenColor(accentColor, 20));

    ctx.fillStyle = progressGradient;
    ctx.fillRect(progressBarX, progressBarY, fillWidth, progressBarHeight);

    // Progress bar border
    ctx.strokeStyle = '#40444B';
    ctx.lineWidth = 2;
    ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

    // XP Text on progress bar (use displayXP for consistency)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        `${displayXP.toLocaleString()} / ${requiredXP.toLocaleString()} XP`,
        progressBarX + progressBarWidth / 2,
        progressBarY + progressBarHeight / 2
    );

    // Total XP label
    ctx.fillStyle = '#B9BBBE';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
        `Total XP: ${totalXP.toLocaleString()}`,
        progressBarX,
        progressBarY - 15
    );

    return canvas.toBuffer('image/png');
}

/**
 * Lighten a hex color by a percentage
 * @param {string} color - Hex color code
 * @param {number} percent - Percentage to lighten (0-100)
 * @returns {string} Lightened hex color
 */
function lightenColor(color, percent) {
    // Validate color format (accept #RRGGBB and #RGB)
    if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(color)) {
        throw new Error('Invalid color: must be in format #RGB or #RRGGBB');
    }

    // Normalize #RGB to #RRGGBB
    let normalizedColor = color;
    if (color.length === 4) {
        normalizedColor = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }

    // Validate and clamp percent
    if (typeof percent !== 'number' || !isFinite(percent)) {
        throw new Error('Invalid percent: must be a finite number');
    }
    const clampedPercent = Math.max(-100, Math.min(100, percent));

    const num = parseInt(normalizedColor.replace('#', ''), 16);
    if (isNaN(num)) {
        throw new Error('Failed to parse color');
    }

    const amt = Math.round(2.55 * clampedPercent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

module.exports = {
    generateRankCard,
};
