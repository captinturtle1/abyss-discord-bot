import { Client, GatewayIntentBits } from 'discord.js';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

import add_wallet from './commands/add_wallet.js';
import view_wallets from './commands/view_wallets.js';
import remove_all_wallets from './commands/remove_all_wallets.js';
import remove_wallet from './commands/remove_wallet.js';

// init aws
AWS.config.update({region: 'us-west-2'});
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

// init dotenv
dotenv.config();

// init discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'add_wallet') {
    add_wallet(interaction, ddb);
	} else if (interaction.commandName === 'view_wallets') {
    view_wallets(interaction, ddb);
	} else if (interaction.commandName === 'remove_all_wallets') {
    remove_all_wallets(interaction, ddb);
  } else if (interaction.commandName === 'remove_wallet') {
    remove_wallet(interaction, ddb);
  }
});


// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);