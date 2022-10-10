export default function remove_all_wallets(interaction, ddb) {
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
};