var { Client, GatewayIntentBits } = require('discord.js');
var AWS = require('aws-sdk');
var dotenv = require('dotenv');

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
    let user = interaction.user.id;

    // params for getting current address(s)
    let getParams = {
      Key: {
       "userId": {S: `${user}`}, 
      },
      TableName: "userAddresses"
    }
    
    ddb.getItem(getParams, function(err, data) {
      if (err) {
        console.log("Error", err);
        interaction.reply({ content: 'error', ephemeral: true });
      } else {
        // gets user inputted address(s) and converts to array
        let address = interaction.options.getString('address');
        let nospace = address.replace(/\s+/g, '');
        let myArray = nospace.split(",");

        let newArray;

        // checks if there are existing addresses
        if (Object.keys(data).length !== 0) {
          //if there are existing addresses
          let currentAddresses = data.Item.addresses.S.split(",");
          console.log(`current addresses is defined, ${currentAddresses}`);
          newArray = currentAddresses.concat(myArray);
          console.log(`${newArray} is the newArray after adding`);
        } else {
          // if no existing addresses
          newArray = myArray;
        }

        // removes any duplicated addresses from new address array
        let noDupe = newArray.filter((item, index) => newArray.indexOf(item) === index);

        // scans thru array to make sure all items are valid addresses
        for (let i = 0; i < noDupe.length; i++) {
          console.log(`${noDupe[i]} is data in ${i} position`);
          if (!/^0x[a-fA-F0-9]{40}$/.test(noDupe[i])) {
            interaction.reply({ content: `${noDupe[i]} is not valid`, ephemeral: true });
            return;
          }
        }
        

        // users item db entry
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
      }
    })

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
                if (Object.keys(data).length !== 0) {
                    let justAddress = data.Item.addresses.S;
                    let nospace = justAddress.replace(/,/g, '\n');
                    console.log("Success", data);
                    interaction.reply({ content: `${nospace}`, ephemeral: true });
                } else {
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

    } else if (interaction.commandName === 'remove_wallet') {
      let user = interaction.user.id;
      let getParams = {
        Key: {
         "userId": {S: `${user}`}, 
        },
        TableName: "userAddresses"
      };

      ddb.getItem(getParams, function(err, data) {
        if (err) {
            console.log("Error", err);
            interaction.reply({ content: 'error', ephemeral: true });
        } else {
          if (Object.keys(data).length !== 0) {
            let address = interaction.options.getString('address');
            let nospace = address.replace(/\s+/g, '');
            let addressArray = nospace.split(",");
            let currentAddresses = data.Item.addresses.S.split(",");
            let responseText = "";
            for (let i = 0; i < addressArray.length; i++) {
              if (currentAddresses.includes(addressArray[i])) {
                let found = currentAddresses.findIndex(element => element === addressArray[i]);
                console.log(found);
                console.log(`${currentAddresses} is before splice`);
                currentAddresses.splice(found, 1);
                responseText = responseText + `${addressArray[i]} removed\n`;
                console.log(`${currentAddresses} is after splice`);
              } else {
                console.log(`${addressArray[i]} not being tracked`);
                responseText = responseText + `${addressArray[i]} not being tracked\n`;
              };
            }
            let params = {
              Item: {
               "userId": {S: `${user}`}, 
               "addresses": {S: `${currentAddresses}`}
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
                interaction.reply({ content: `${responseText}`, ephemeral: true });
              }
            });
          } else {
            interaction.reply({ content: 'no wallets being tracked', ephemeral: true });
          };
        }
      });
    }
});


// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);