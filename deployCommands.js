import { SlashCommandBuilder, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
    new SlashCommandBuilder()
        .setName('add_wallet')
        .setDescription('Add your address to list of wallets to track')
        .addStringOption(option =>
		    option.setName('address')
		    	.setDescription('The address you want to add')
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
        .setDescription('Removed currently tracked wallets'),

	new SlashCommandBuilder()
        .setName('check_profit')
        .setDescription('Check profit accross tracked wallets for a single collection')
        .addStringOption(option =>
		    option.setName('contractaddress')
		    	.setDescription('The collection contract you want to check')
		    	.setRequired(true)),


				
	new SlashCommandBuilder()
        .setName('calculate_gas_range')
        .setDescription('gives transaction cost at different gwei prices given the gas limit')
        .addIntegerOption(option =>
		    option.setName('gas_limit')
		    	.setDescription('The gas limit you want to calculate')
		    	.setRequired(true)),
    new SlashCommandBuilder()
        .setName('calculate_gas_legacy')
        .setDescription('gives transaction cost with specific gwei using legacy transaction type')
        .addIntegerOption(option =>
		    option.setName('gwei')
		    	.setDescription('The gwei you want calculate')
		    	.setRequired(true))
        .addIntegerOption(option =>
		    option.setName('gas_limit')
		    	.setDescription('The gas limit you want to calculate')
		    	.setRequired(true)),
    new SlashCommandBuilder()
        .setName('calculate_gas')
        .setDescription('gives transaction cost with specific gwei and priority using EIP1559 transaction type')
        .addIntegerOption(option =>
		    option.setName('gwei')
		    	.setDescription('The gwei you want calculate')
		    	.setRequired(true))
        .addIntegerOption(option =>
		    option.setName('priority_fee')
		    	.setDescription('The priority fee you want to calculate')
		    	.setRequired(true))
        .addIntegerOption(option =>
		    option.setName('gas_limit')
		    	.setDescription('The gas limit you want to calculate')
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