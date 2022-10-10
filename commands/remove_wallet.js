export default function remove_all_wallets(interaction, ddb) {
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
};