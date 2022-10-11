import dotenv from 'dotenv';

// init dotenv
dotenv.config();

export default function check_profit(interaction, ddb){
  let user = interaction.user.id;
  let collectionAddress = interaction.options.getString('contractaddress');
  console.log(collectionAddress);
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
        let myArray = justAddress.split(",");

        let userGetString = "";
        for (let i = 0; i < myArray.length; i++) {
          if (i == 0) {
            userGetString = userGetString + '?users=' + myArray[i];
          } else {
            userGetString = userGetString + '&users=' + myArray[i];
          }
        }

        console.log(`https://api.reservoir.tools/users/activity/v3${userGetString}&limit=20&sortBy=eventTimestamp`);

        const options = {method: 'GET', headers: {accept: '*/*', 'x-api-key': `${process.env.RESERVOIR_KEY}`}};

        fetch(`https://api.reservoir.tools/users/activity/v3${userGetString}&limit=5&sortBy=eventTimestamp`, options)
          .then(response => response.json())
          .then(response => {
            console.log(response.activities.length);
            interaction.reply({ content: 'success', ephemeral: true });
          })
          .catch(err => {
            console.error(err)
            interaction.reply({ content: 'error', ephemeral: true });
          });

        
      } else {
        console.log('no wallets found');
        interaction.reply({ content: 'no wallets found', ephemeral: true });
      }
    }
  });
};