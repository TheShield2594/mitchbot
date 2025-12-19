const { SlashCommandBuilder } = require('discord.js');

const outputs = [
  'Step 1: Schedule stakeholder alignment meeting.\nStep 2: Create Jira ticket.\nStep 3: Realize this could have been a button.',
  'This task requires microservices, a roadmap, and at least one consultant.',
  'Approved. Implementation pending Q4 review.',
  'Rejected. Needs more documentation.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('overengineer')
    .setDescription('Explains a simple task like enterprise software'),
  async execute(interaction) {
    const reply = outputs[Math.floor(Math.random() * outputs.length)];
    await interaction.reply(reply);
  },
};
