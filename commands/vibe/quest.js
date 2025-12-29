const { SlashCommandBuilder } = require('discord.js');
const { recordQuestCompletion, getStreakMessage } = require('../../utils/quests');
const { getRandomSnark } = require('../../utils/snark');

const defaultQuests = [
  'Stare at something longer than normal.',
  'Say "interesting" and mean it.',
  'Open a game and close it immediately.',
  'Scroll without purpose.',
  'Stand up, then sit back down.',
  'Think about doing something productive.',
  'Check the same app twice in a row.',
  'Pretend you're about to start working.',
  'Reconsider your life choices.',
  'Look at your backlog and do nothing.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Generates a terrible daily quest'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Quests are only available in servers.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    // Get quest (includes custom server quests if configured)
    const quest = getRandomSnark(interaction.guildId, 'quests', defaultQuests);
    const streakData = recordQuestCompletion(interaction.guildId, interaction.user.id);

    if (streakData.alreadyCompleted) {
      await interaction.editReply(
        `🗺️ Daily Quest:\n${quest}\n\n` +
        `You already got today's quest. Current streak: ${streakData.streak} day${streakData.streak === 1 ? '' : 's'}.`
      );
      return;
    }

    const streakMsg = getStreakMessage(streakData.streak, streakData.isNewRecord);

    await interaction.editReply(
      `🗺️ Daily Quest:\n${quest}\n\n${streakMsg}`
    );
  },
};
