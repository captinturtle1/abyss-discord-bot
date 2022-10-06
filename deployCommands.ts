const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
var dotenv = require('dotenv');
dotenv.config();

const commands = [
    new SlashCommandBuilder()
        .setName('add_wallet')
        .setDescription('Add your address to list of wallets to track')
        .addStringOption(option =>
		    option.setName('address')
		    	.setDescription('The address you want to add')
		    	.setRequired(true)),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);


(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
            Routes.applicationCommands(process.env.APP_ID),
            { body: commands },
        );
        

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();