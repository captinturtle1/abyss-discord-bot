const { Client, GatewayIntentBits } = require('discord.js');
var dotenv = require('dotenv');
dotenv.config();

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'add_wallet') {
        let address = interaction.options.getString('address');
        let user = interaction.user.id;

        if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
            await interaction.reply({ content: `${user}, ${address}`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'invalid address provided', ephemeral: true });
        }
	}
});


// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);