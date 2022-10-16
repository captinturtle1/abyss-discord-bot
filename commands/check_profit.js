import { EmbedBuilder, userMention  } from 'discord.js';
import { Alchemy, Network } from "alchemy-sdk";
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// init dotenv
dotenv.config();

const alchemyConfig = {
  apiKey: process.env.ALCHEMY_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(alchemyConfig);

let currentlyBeingUsed = false;

export default async function check_profit(interaction, ddb) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(interaction.options.getString('contract_address'))) {
    console.log('invalid address provided');
    interaction.reply({content: 'Invalid addres provided', ephemeral: true});
  } else {
    alchemy.core.getCode(interaction.options.getString('contract_address')).then(async value => {
      console.log(value);
      if (value == "0x") {
        console.log('address provided not a contract')
        interaction.reply({content: 'Address provided is not a contract', ephemeral: true});
      } else {
        if (!currentlyBeingUsed) {
          currentlyBeingUsed = true;
          
          let profitTable = {
            totalMoneyIn: 0,
            mintCost: 0,
            mintGasFees: 0,
            buyInCost: 0,
            buyInGasFee: 0,
            totalAmountSold: 0,
            totalAmountMinted: 0,
            totalAmountBoughtSecondary: 0,
            currentlyHeld: 0,
            currentFloor: 0,
            unrealizedProfit: 0,
            realizedProfit: 0,
          };

          await interaction.reply({content: 'Calculating...', allowed_mentions: { users: [interaction.user.id]}, ephemeral: true});
          let user = interaction.user.id;
          let params = {
            Key: {
             "userId": {S: `${user}`}, 
            },
            TableName: "userAddresses"
          };
          interaction.editReply({ content: 'Getting wallets', ephemeral: true });
          ddb.getItem(params, function(err, data) {
            if (err) {
              console.log("Error", err);
              interaction.editReply({ content: 'error: unable to access wallets', ephemeral: true });
              currentlyBeingUsed = false;
            } else {

              if (Object.keys(data).length !== 0) {
                let justAddress = data.Item.addresses.S;
                let totalAddressArray = justAddress.split(',')
                console.log("Success", totalAddressArray);
                interaction.editReply({ content: `Got ${totalAddressArray.length} wallet(s)`, ephemeral: true });
                let i = 0;
                function myLoop() {
                	setTimeout(function() {
                		console.log("loop!")
                    getNftsOut(interaction, totalAddressArray, profitTable, totalAddressArray[i].toLowerCase(), i);
                		if (i < totalAddressArray.length-1) {
                		  myLoop();
                		}
                    i++;
                	}, 10000 * (i + 1))
                }
                myLoop();
              } else {
                console.log('no wallets found');
                interaction.editReply({ content: 'error: no wallets found', ephemeral: true });
                currentlyBeingUsed = false;
              }
            }
          });
        } else {
          interaction.reply('Currently being used, try again in a bit.');
        }
      }
    }).catch(err => {
      console.log(err);
    });
  }
}


function getNftsOut(interaction, totalAddressArray, profitTable, userAddress, currentAddressIndex) {
  let contractAddress = interaction.options.getString('contract_address');
  console.log("getting stuff");
  interaction.editReply({ content: `Getting nfts out ${userAddress}`, ephemeral: true });
  // checks nfts that came out of wallet
  alchemy.core.getAssetTransfers({
    fromBlock: "0x0",
    fromAddress: `${userAddress}`,
    contractAddresses: [`${contractAddress}`],
    excludeZeroValue: false,
    category: ["erc721", "erc1155"],
  }).then( value => {
    console.log(value);
    interaction.editReply({ content: `Got nfts out ${userAddress} alchemy`, ephemeral: true });
    // for each nft transfered in
    for (let i = 0; i < value.transfers.length; i++) {

      // calls etherscan internal tx api for each transaction
      setTimeout(() => { fetch(`https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=${value.transfers[i].hash}&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9`)
      .then(response => response.json())
      .then(response => {
        console.log(response);
        interaction.editReply({ content: `Got nfts out etherscan: ${i}`, ephemeral: true });
        for (let j = 0; j < response.result.length; j++) {

          interaction.editReply({ content: `NFTs out internal: ${j}, etherscan: ${i}, ${userAddress}`, ephemeral: true });
          // checks each internal tx to make sure its the one with the funds going to user wallet
          if (response.result[j].to == userAddress) {
            let soldInEth = response.result[j].value / 1000000000000000000;
            profitTable.totalMoneyIn += soldInEth;
            profitTable.totalAmountSold += 1;
          };
        }
        if (profitTable.totalAmountSold == value.transfers.length) {
          console.log("done tracking out");
          interaction.editReply({ content: `Done nfts out ${userAddress}`, ephemeral: true });
          getNftsIn(contractAddress, interaction, profitTable, totalAddressArray, userAddress, currentAddressIndex);
        }
      }).catch(err => {
        console.error(err)
        interaction.editReply({ content: 'error: error accessing api 1', ephemeral: true });
        currentlyBeingUsed = false;
      }); }, 500 * (i + 1));
    }
  }).catch(err => {
    console.error(err)
    interaction.editReply({ content: 'error: error accessing api 2', ephemeral: true });
    currentlyBeingUsed = false;
  });
}

function getNftsIn(contractAddress, interaction, profitTable, totalAddressArray, userAddress, currentAddressIndex) {

  interaction.editReply({ content: `Getting nfts in ${userAddress}`, ephemeral: true });
  // checks nfts that came into wallet
  alchemy.core.getAssetTransfers({
    fromBlock: "0x0",
    contractAddresses: [`${contractAddress}`],
    toAddress: `${userAddress}`,
    excludeZeroValue: false,
    category: ["erc721", "erc1155"],
  }).then(value => {
    interaction.editReply({ content: `Got nfts in ${userAddress}`, ephemeral: true });
    let checkedTxs = [];
    for (let i = 0; i < value.transfers.length; i++) {
      let blocknum = parseInt(value.transfers[i].blockNum, 16)

      interaction.editReply({ content: `Getting nfts in tx: ${i} ${userAddress}`, ephemeral: true });
      // gets specific transaction details
      setTimeout(() => { fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=${blocknum}&endblock=${blocknum}&page=1&offset=10&sort=desc&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9`)
      .then(response => response.json())
      .then(response => {
        interaction.editReply({ content: `Got nfts in tx: ${i} ${userAddress}`, ephemeral: true });
        for (let j = 0; j < response.result.length; j++) {
          
          // checks each tx to make sure it matches nft transfer tx to get around etherscan weird api
          if (response.result[j].hash == value.transfers[i].hash) {

            // checks if minted or somewhere else
            if (value.transfers[i].from == "0x0000000000000000000000000000000000000000") {
              // if minted

              interaction.editReply({ content: `tx: ${i} is minted ${userAddress}`, ephemeral: true });
              if (checkedTxs.includes(response.result[j].hash) == false) {
                let mintCost = response.result[j].value.toString() / 1000000000000000000;
                let mintGasCost = response.result[j].gasPrice * response.result[j].gasUsed / 1000000000000000000;
                profitTable.mintGasFees += mintGasCost;
                profitTable.mintCost += mintCost;
              }
              profitTable.totalAmountMinted += 1;
              checkedTxs.push(response.result[j].hash);
            } else {
              // if somewhere else

              interaction.editReply({ content: `tx: ${i} is not minted ${userAddress}`, ephemeral: true });
              if (checkedTxs.includes(response.result[j].hash) == false) {
                let secondaryCost = response.result[j].value / 1000000000000000000;
                let buyinGasCost = response.result[j].gasPrice * response.result[j].gasUsed / 1000000000000000000;
                profitTable.buyInGasFee += buyinGasCost;
                profitTable.buyInCost += secondaryCost;
              }
              profitTable.totalAmountBoughtSecondary += 1;
              checkedTxs.push(response.result[j].hash);
            };
          } else {
            console.log("no match...");
          }
        }
        if (i == value.transfers.length-1) {
          console.log("done tracking in");
          interaction.editReply({ content: `Done tracking in ${userAddress}`, ephemeral: true });
          console.log(currentAddressIndex, totalAddressArray.length-1);
          if (currentAddressIndex == totalAddressArray.length-1){
            console.log("done");
            getFloor(contractAddress, interaction, profitTable, totalAddressArray, userAddress);
          }
          //getFloor(contractAddress, interaction, profitTable, totalAddressArray, userAddress);
        }
      }).catch(err => {
        console.error(err)
        interaction.editReply({ content: 'error: error accessing api 3', ephemeral: true });
        currentlyBeingUsed = false;
      }); }, 500 * (i + 1));
    }
  }).catch(err => {
    console.error(err)
    interaction.editReply({ content: 'error: error accessing api 4', ephemeral: true });
    currentlyBeingUsed = false;
  });
}

function getFloor(contractAddress, interaction, profitTable, totalAddressArray, userAddress) {
  interaction.editReply({ content: `Getting collection details for ${contractAddress}`, ephemeral: true });
  let options = {method: 'GET', headers: {accept: '*/*', 'x-api-key': `${process.env.RESERVOIR_KEY}`}};
  fetch(`https://api.reservoir.tools/collections/v5?id=${contractAddress}&includeTopBid=false&sortBy=allTimeVolume&limit=20`, options)
    .then(response => response.json())
    .then(response => {
    profitTable.currentFloor = response.collections[0].floorAsk.price.amount.decimal
    alchemy.core.getTokenBalances(userAddress, [contractAddress]).then(value => {
      interaction.editReply({ content: `Calculating final numbers...`, ephemeral: true });
      let amountOwned = parseInt(value.tokenBalances[0].tokenBalance, 16)
      profitTable.currentlyHeld = amountOwned;
      profitTable.unrealizedProfit = profitTable.currentlyHeld * profitTable.currentFloor;
      profitTable.realizedProfit = profitTable.totalMoneyIn - (profitTable.buyInCost + profitTable.buyInGasFee + profitTable.mintCost + profitTable.mintGasFees);
      console.log(profitTable);
      const exampleEmbed = new EmbedBuilder()
	      .setColor([15, 23, 42])
	      .setTitle(response.collections[0].name)
        .setURL(`https://opensea.io/collection/${response.collections[0].slug}`)
        .setAuthor({ name: 'Profit calculator', iconURL: 'https://www.abyssfnf.com/logo.png' })
	      .setThumbnail(response.collections[0].image)
	      .addFields(
	      	{ name: 'Total minted', value: `${profitTable.totalAmountMinted}`, inline: true },
	      	{ name: 'Mint cost', value: `${profitTable.mintCost.toPrecision(5)}`, inline: true },
          { name: 'Mint fee', value: `${profitTable.mintGasFees.toPrecision(5)}`, inline: true },
          { name: 'Total secondary', value: `${profitTable.totalAmountBoughtSecondary}`, inline: true },
          { name: 'Secondary cost', value: `${profitTable.buyInCost.toPrecision(5)}`, inline: true },
          { name: 'Secondary fee', value: `${profitTable.buyInGasFee.toPrecision(5)}`, inline: true },
          { name: 'ETH from sales', value: `${profitTable.totalMoneyIn}`, inline: true },
          { name: 'Amount sold', value: `${profitTable.totalAmountSold}`, inline: true },
          { name: 'Realized', value: `${profitTable.realizedProfit.toPrecision(5)}`, inline: true },
          { name: 'Floor', value: `${profitTable.currentFloor}`, inline: true },
          { name: 'Holding', value: `${profitTable.currentlyHeld}`, inline: true },
          { name: 'Unrealized', value: `${profitTable.unrealizedProfit.toPrecision(5)}`, inline: true },
          { name: '\u200B', value: '\u200B' },
          { name: 'Wallets checked', value: `${totalAddressArray.length}` },
	      )
	      .setTimestamp()
	      .setFooter({ text: 'bot by captinturtle', iconURL: 'https://cdn.discordapp.com/avatars/205967038986977280/0560eac6f0d23e31f966653046c4dd3d.png'});
        currentlyBeingUsed = false;
        interaction.editReply({ content: 'done', ephemeral: true });
        interaction.followUp({ content: `${userMention(interaction.user.id)}`, embeds: [exampleEmbed], allowed_mentions: { users: [interaction.user.id]}});
    }).catch(err => {
      console.error(err)
      interaction.editReply({ content: 'error: error accessing api 5', ephemeral: true });
      currentlyBeingUsed = false;
    });
  }).catch(err => {
    console.error(err)
    interaction.editReply({ content: 'error: error accessing api 6', ephemeral: true });
    currentlyBeingUsed = false;
  });
}