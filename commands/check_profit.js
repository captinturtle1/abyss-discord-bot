import { EmbedBuilder } from 'discord.js';
import { Alchemy, Network } from "alchemy-sdk";
import dotenv from 'dotenv';

// init dotenv
dotenv.config();

const alchemyConfig = {
  apiKey: process.env.ALCHEMY_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(alchemyConfig);

//const userAddress = "0x894c3F27a6359B7d4667F9669E98E27786EB0AbF".toLowerCase();

export default async function check_profit(interaction, ddb) {

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

  await interaction.deferReply({ ephemeral: true });
  let user = interaction.user.id;
  let params = {
      Key: {
       "userId": {S: `${user}`}, 
      },
      TableName: "userAddresses"
  };
  ddb.getItem(params, function(err, data) {
    if (err) {
        console.log("Error", err);
        interaction.editReply({ content: 'error', ephemeral: true });
    } else {
        if (Object.keys(data).length !== 0) {
            let justAddress = data.Item.addresses.S;
            let totalAddressArray = justAddress.split(',')
            console.log("Success", totalAddressArray);

            /*
            let i = 0;
            function myLoop() {
            	setTimeout(function() {
            		console.log("loop!")
                getNftsOut(interaction, totalAddressArray, profitTable, totalAddressArray[i].toLowerCase(), i);
            		if (i == totalAddressArray.length-1){
            			console.log("done");
            		}
            		if (i < totalAddressArray.length-1) {
            		  myLoop();
            		}
                i++;
            	}, 1000)
            }
            myLoop();*/

            getNftsOut(interaction, totalAddressArray, profitTable, totalAddressArray[0].toLowerCase(), 0);
        } else {
            console.log('no wallets found');
            interaction.editReply({ content: 'no wallets found', ephemeral: true });
        }
    }
});
}


function getNftsOut(interaction, totalAddressArray, profitTable, userAddress, currentAddressIndex) {
  let contractAddress = interaction.options.getString('contractaddress');
  console.log("getting stuff");
  // checks nfts that came out of wallet
  alchemy.core.getAssetTransfers({
    fromBlock: "0x0",
    fromAddress: `${userAddress}`,
    contractAddresses: [`${contractAddress}`],
    excludeZeroValue: false,
    category: ["erc721", "erc1155"],
  }).then( value => {
    // for each nft transfered in
    for (let i = 0; i < value.transfers.length; i++) {
      // calls etherscan interal tx api for each transaction
      fetch(`https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=${value.transfers[i].hash}&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9`)
      .then(response => response.json())
      .then(response => {
        for (let j = 0; j < response.result.length; j++) {
          // checks each internal tx to make sure its the one with the funds going to user wallet
          if (response.result[j].to == userAddress) {
            let soldInEth = response.result[j].value / 1000000000000000000;
            profitTable.totalMoneyIn += soldInEth;
            profitTable.totalAmountSold += 1;
          };
        }
        if (profitTable.totalAmountSold == value.transfers.length) {
          console.log("done tracking out");
          getNftsIn(contractAddress, interaction, profitTable, totalAddressArray, userAddress, currentAddressIndex);
        }
      }).catch(console.error);
    }
  }).catch(console.log);
}

function getNftsIn(contractAddress, interaction, profitTable, totalAddressArray, userAddress, currentAddressIndex) {
// checks nfts that came into wallet
  alchemy.core.getAssetTransfers({
    fromBlock: "0x0",
    contractAddresses: [`${contractAddress}`],
    toAddress: `${userAddress}`,
    excludeZeroValue: false,
    category: ["erc721", "erc1155"],
  }).then(value => {
    console.log('alchemy', value);
    let checkedTxs = [];
    for (let i = 0; i < value.transfers.length; i++) {
      let blocknum = parseInt(value.transfers[i].blockNum, 16)
      // gets specific transaction details
      fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=${blocknum}&endblock=${blocknum}&page=1&offset=10&sort=desc&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9`)
      .then(response => response.json())
      .then(response => {
        console.log('etherscan', response);
        for (let j = 0; j < response.result.length; j++) {
          // checks each tx to make sure it matches nft transfer tx to get around etherscan weird api
          if (response.result[j].hash == value.transfers[i].hash) {
            // checks if minted or somewhere else
            if (value.transfers[i].from == "0x0000000000000000000000000000000000000000") {
              // if minted
              if (checkedTxs.includes(response.result[j].hash) == false) {
                let mintCost = response.result[j].value.toString() / 1000000000000000000;
                let mintGasCost = response.result[j].gasPrice * response.result[j].gasUsed / 1000000000000000000;
                profitTable.mintGasFees += mintGasCost;
                profitTable.mintCost += mintCost;
              }
              profitTable.totalAmountMinted += 1;
              checkedTxs.push(response.result[j].hash);
            } else {
              // if bought secondary
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
        if (profitTable.totalAmountBoughtSecondary + profitTable.totalAmountMinted == value.transfers.length) {
          console.log("done tracking in");
          if (currentAddressIndex == totalAddressArray.length-1){
            console.log("done");
          }
          getFloor(contractAddress, interaction, profitTable, totalAddressArray, userAddress)
        }
      }).catch(console.error);
    }
  }).catch(console.log);
}

function getFloor(contractAddress, interaction, profitTable, totalAddressArray, userAddress) {
  alchemy.nft
  .getFloorPrice(contractAddress)
  .then(response => {
    profitTable.currentFloor = response.openSea.floorPrice;
    alchemy.core.getTokenBalances(userAddress, [contractAddress]).then(value => {
      let amountOwned = parseInt(value.tokenBalances[0].tokenBalance, 16)
      profitTable.currentlyHeld = amountOwned;
      profitTable.unrealizedProfit = profitTable.currentlyHeld * profitTable.currentFloor;
      profitTable.realizedProfit = profitTable.totalMoneyIn - (profitTable.buyInCost + profitTable.buyInGasFee + profitTable.mintCost + profitTable.mintGasFees);
      console.log(profitTable);
      const exampleEmbed = new EmbedBuilder()
	      .setColor([15, 23, 42])
	      .setTitle('Your profit info')
	      .setThumbnail('https://www.abyssfnf.com/banner.png')
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
	      .setFooter({ text: 'by captinturtle'});
        interaction.editReply({ embeds: [exampleEmbed], ephemeral: true });
    });
  });
}