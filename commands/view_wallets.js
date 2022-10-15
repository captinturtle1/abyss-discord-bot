import { codeBlock } from 'discord.js';

export default function view_wallets(interaction, ddb) {
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
                interaction.reply({ content: `${codeBlock(nospace)}`, ephemeral: true });
            } else {
                console.log('no wallets found');
                interaction.reply({ content: 'no wallets found', ephemeral: true });
            }
        }
    });
};