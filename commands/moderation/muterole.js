const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../../utils/moderation');
const { logCommandError } = require('../../utils/commandLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('muterole')
    .setDescription('Set or view the mute role for this server')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to use for muting members')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('role');
    const config = getGuildConfig(interaction.guildId);

    // If no role provided, show current mute role
    if (!role) {
      if (config.muteRole) {
        const muteRole = interaction.guild.roles.cache.get(config.muteRole);
        if (muteRole) {
          await interaction.editReply(`Current mute role: ${muteRole}`);
        } else {
          await interaction.editReply('Mute role is set but the role no longer exists. Please set a new one.');
        }
      } else {
        await interaction.editReply('No mute role has been set. Use `/muterole [role]` to set one.');
      }
      return;
    }

    // Verify bot can manage the role
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('I do not have permission to manage roles. Please check my role permissions.');
      return;
    }

    // Check role hierarchy
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      await interaction.editReply('I cannot use this role as a mute role because it is higher than or equal to my highest role.');
      return;
    }

    if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      await interaction.editReply('You cannot set a mute role that is higher than or equal to your highest role.');
      return;
    }

    // Check if role is managed (bot role, integration role, etc.)
    if (role.managed) {
      await interaction.editReply('This role is managed by an integration and cannot be used as a mute role.');
      return;
    }

    try {
      // Update guild config
      await updateGuildConfig(interaction.guildId, { muteRole: role.id });

      await interaction.editReply(`Successfully set ${role} as the mute role.\n\n**Note:** Make sure this role has the appropriate permissions denied in all channels (Send Messages, Speak, etc.)`);
    } catch (error) {
      logCommandError('Error setting mute role', interaction, { error });
      await interaction.editReply('Failed to set the mute role. Please try again.');
    }
  },
};
