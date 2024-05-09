const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("praise")
        .setDescription("Hey you're pretty cool.")
        .addUserOption((option) =>
            option.setName("user").setDescription("Let's be nice to people.")),
    async execute(interaction) {
        const compliments = [
            "You have the biggest of dicks",
            "You make me cream",
            "You're a fantastic person!",
            "You're a true gem!",
            "You're a true friend!",
            "You're a true inspiration!",
            "You're a true hero!",
            "You're a true leader!",
            "You're a true visionary!",
            "You're a hard worker!",
            "You're well hung",
            "You're huge!",
            "You're amazing!",
            "You're a true patriot!",
            "You have a nice package!",
            "You're a stud",
            "You're a true innovator!",
            "You're great!",
            "You're a true philosopher!",
            "You make me think dirty things!",
            "You're a true problem solver!",
            "You're awesome",
            "You're a true chick magnet",
            "You're naughty",
            "You're a hard worker!",
            "You're a stud muffin!",
            "You're a girthy boy",
            "You have lovely eyes",
            "You're a big boy",
 , ]
    }
};