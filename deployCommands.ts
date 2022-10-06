const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const dotenv2 = require('dotenv');
dotenv2.config();

const commands = [
    new SlashCommandBuilder()
        .setName('add_wallet')
        .setDescription('Add your address to list of wallets to track')
        .addStringOption(option =>
		    option.setName('address')
		    	.setDescription('The address you want to add')
		    	.setRequired(true)),
	new SlashCommandBuilder()
        .setName('add_multiple_wallet')
        .setDescription('Add multiple addresses to list of wallets to track')
        .addStringOption(option =>
		    option.setName('addresses')
		    	.setDescription('The addresses you want to add, seperated with commas')
		    	.setRequired(true)),
	new SlashCommandBuilder()
        .setName('view_wallets')
        .setDescription('View list of currently tracked wallets'),
	new SlashCommandBuilder()
        .setName('remove_wallet')
        .setDescription('Removed currently tracked wallet')
        .addStringOption(option =>
		    option.setName('address')
		    	.setDescription('The address you want to remove')
		    	.setRequired(true)),
	new SlashCommandBuilder()
        .setName('remove_all_wallets')
        .setDescription('Removed currently tracked wallets')
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