export default function add_wallet(interaction, ddb) {
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
};