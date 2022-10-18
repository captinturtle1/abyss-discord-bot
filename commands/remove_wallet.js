import { codeBlock } from 'discord.js';

export default function remove_all_wallets(interaction, ddb) {
    let user = interaction.user.id;
    let getParams = {
      Key: {
       "userId": {S: `${user}`}, 
      },
      TableName: "userAddresses"
    };
    
    ddb.getItem(getParams, async function(err, data) {
      if (err) {
          console.log("Error", err);
          interaction.reply({ content: 'error', ephemeral: true });
      } else {
        if (Object.keys(data).length !== 0) {
          let address = interaction.options.getString('address');
          let nospace = address.replace(/\s+/g, '');
          let addressArray = nospace.split(",");
          let currentAddresses = data.Item.addresses.S.split(",");
          let amountRemoved = 0;
          for (let i = 0; i < addressArray.length; i++) {
            if (currentAddresses.includes(addressArray[i])) {
              let found = currentAddresses.findIndex(element => element === addressArray[i]);
              currentAddresses.splice(found, 1);
              amountRemoved++;
            } else {
              console.log(`${addressArray[i]} not being tracked`);
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
          ddb.putItem(params, async function(err, data) {
            if (err) {
              console.log("Error", err);
              await interaction.reply({ content: 'error', ephemeral: true });
            } else {
              console.log("Success", data);
              if (amountRemoved == 0) {
                await interaction.reply({ content: 'no addresses provided', ephemeral: true });
              } else {
                await interaction.reply({ content: `removed ${amountRemoved} address(s)`, ephemeral: true });
              }
              
            }
          });
        } else {
          await interaction.reply({ content: 'no wallets being tracked', ephemeral: true });
        };
      }
    });
};