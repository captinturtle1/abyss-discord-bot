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
        let nospace = address.replace(/\s+/g, '');
        let myArray = nospace.split(",");
        let user = interaction.user.id;
        for (let i = 0; i < myArray.length; i++) {
          console.log(myArray[i]);
          if (!/^0x[a-fA-F0-9]{40}$/.test(myArray[i])) {
            await interaction.reply({ content: `${myArray[i]} is not valid`, ephemeral: true });
            return;
          }
        }

        let noDupe = myArray.filter((item, index) => myArray.indexOf(item) === index);
        
        // getting current addresses
        let getParams = {
            Key: {
             "userId": {S: `${user}`}, 
            },
            TableName: "userAddresses"
        }
        ddb.getItem(getParams, function(err, data) {
            if (err) {
                console.log("Error", err);
            } else {
                console.log("Success", data);
            }
        })
        let params = {
            Item: {
             "userId": {S: `${user}`}, 
             "addresses": {S: `${noDupe}`}
            },
            TableName: "userAddresses"
        }
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
            if (err) {
                console.log("Error", err);
                interaction.reply({ content: 'error', ephemeral: true });
            } else {
                try {
                    let justAddress = data.Item.addresses.S;
                    console.log("Success", data);
                    interaction.reply({ content: `${justAddress}`, ephemeral: true });
                } catch(err) {
                    console.log('no wallets found');
                    interaction.reply({ content: 'no wallets found', ephemeral: true });
                }
            }
        });
	} else if (interaction.commandName === 'remove_all_wallets') {
        let user = interaction.user.id;
        let params = {
            Key: {
             "userId": {S: `${user}`},
            },
            TableName: "userAddresses"
        };

        // Call DynamoDB to delete the item from the table
        ddb.deleteItem(params, function(err, data) {
          if (err) {
            console.log("Error", err);
            interaction.reply({ content: 'error', ephemeral: true });
          } else {
            console.log("Success", data);
            interaction.reply({ content: 'success', ephemeral: true });
          }
        });

    }
});


// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);