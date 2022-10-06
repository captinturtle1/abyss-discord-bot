const AWS = require('aws-sdk');
const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

AWS.config.update({region: 'us-west-2'});
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

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
            // getting current addresses
            let getParams = {
                Key: {
                 "userId": {S: `${user}`}, 
                },
                TableName: "userAddresses"
            };

            let currentAddresses;

            ddb.getItem(getParams, function(err, data) {
                currentAddresses = data.Item.addresses.S;
                if (err) {
                    console.log("Error", err);
                } else {
                    console.log("Success", data);
                }
            });
            //


            // adding addresses
            let params = {
                Item: {
                 "userId": {S: `${user}`}, 
                 "addresses": {S: `${currentAddresses}, ${address}`}
                },
                TableName: "userAddresses"
            };

              // Call DynamoDB to add the item to the table
              ddb.putItem(params, function(err, data) {
                if (err) {
                  console.log("Error", err);
                  interaction.reply({ content: 'error', ephemeral: true });
                } else {
                  console.log("Success", data);
                  interaction.reply({ content: 'success', ephemeral: true });
                }
              });
        } else {
            await interaction.reply({ content: 'invalid address provided', ephemeral: true });
        }
	} else if (interaction.commandName === 'add_multiple_wallet') {
        let address = interaction.options.getString('address');
        let user = interaction.user.id;
        if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
            let params = {
                Item: {
                 "userId": {S: `${user}`}, 
                 "addresses": {S: `${address}`}
                },
                TableName: "userAddresses"
            };

              // Call DynamoDB to add the item to the table
              ddb.putItem(params, function(err, data) {
                if (err) {
                  console.log("Error", err);
                  interaction.reply({ content: 'error', ephemeral: true });
                } else {
                  console.log("Success", data);
                  interaction.reply({ content: 'success', ephemeral: true });
                }
              });
        } else {
            await interaction.reply({ content: 'invalid address provided', ephemeral: true });
        }
	} else if (interaction.commandName === 'view_wallets') {
        let user = interaction.user.id;
        let params = {
            Key: {
             "userId": {S: `${user}`}, 
            },
            TableName: "userAddresses"
        };

        // Call DynamoDB to read the item from the table
        ddb.getItem(params, function(err, data) {
            let justAddress = data.Item.addresses.S;
            if (err) {
                console.log("Error", err);
                interaction.reply({ content: 'error', ephemeral: true });
            } else {
            
                console.log("Success", data);
                interaction.reply({ content: `${justAddress}`, ephemeral: true });
            }
        });
	}
});


// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);