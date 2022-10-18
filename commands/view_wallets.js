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
    ddb.getItem(params, async function(err, data) {
        if (err) {
            console.log("Error", err);
            await interaction.reply({ content: 'error', ephemeral: true });
        } else {
            if (Object.keys(data).length !== 0) {
                console.log("Success", data);
                let addressArray = data.Item.addresses.S.split(',');
                console.log('addressArray.length', addressArray.length)
                if (addressArray.length > 30) {
                    let addressRemaineder = addressArray.length % 30;
                    console.log('addressRemaineder', addressRemaineder);
                    let addressLoopAmount = (addressArray.length - addressRemaineder) / 30
                    console.log('addressLoopAmount', addressLoopAmount);
                    let hasReplied = false;
                    for (let i = 0; i < addressLoopAmount; i++) {
                        let currentBlock = '';
                        for (let j = 0; j < 30; j++) {
                            currentBlock = currentBlock + '\n' + addressArray[j];
                        }
                        if (hasReplied) {
                            await interaction.followUp({ content: `${codeBlock(currentBlock)}`, ephemeral: true });
                        } else {
                            await interaction.reply({ content: `${addressArray.length} addresses being tracked ${codeBlock(currentBlock)}`, ephemeral: true });
                            hasReplied = true;
                        }
                    }
                    if (addressRemaineder > 0) {
                        let currentBlock = '';
                        for (let j = 0; j < addressRemaineder; j++) {
                            currentBlock = currentBlock + '\n' + addressArray[j + (addressLoopAmount * 30)];
                        }
                        await interaction.followUp({ content: `${codeBlock(currentBlock)}`, ephemeral: true });
                    }
                    //console.log(addressArray);
                } else {
                    let formattedAddresses = data.Item.addresses.S.replace(/,/g, '\n');
                    await interaction.reply({ content: `${addressArray.length} address(s) being tracked ${codeBlock(formattedAddresses)}`, ephemeral: true });
                }
            } else {
                console.log('no wallets found');
                await interaction.reply({ content: 'no wallets found', ephemeral: true });
            }
        }
    });
};