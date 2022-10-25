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
let alreadyWarned = false;

// function gets called when command is ran
export default async function check_profit(interaction, ddb) {
  alreadyWarned = false;
  
  // checks if contract provided is valid address
  if (!/^0x[a-fA-F0-9]{40}$/.test(interaction.options.getString('contract_address'))) {
    console.log('invalid address provided');
    await interaction.reply({content: 'Invalid addres provided', ephemeral: true});
  } else {
    alchemy.core.getCode(interaction.options.getString('contract_address')).then(async value => {

      // checks if address is user wallet or contract (user wallets have no code)
      if (value == "0x") {
        console.log('address provided not a contract')
        await interaction.reply({content: 'Address provided is not a contract', ephemeral: true});
      } else {
        
        // check to see if its currently calculating from somewhere else. This is to prevent rate limiting
        if (currentlyBeingUsed) {
          console.log("already in use");
          await interaction.reply('Currently being used, try again in a bit.');
        } else {
          currentlyBeingUsed = true;
          
          // defines profit table to track all the stats
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
          let user = interaction.user.id;

          // params to retrieve from database
          let params = {
            Key: {
             "userId": {S: `${user}`}, 
            },
            TableName: "userAddresses"
          };

          await interaction.reply({content: 'Getting wallets', allowed_mentions: { users: [user]}, ephemeral: true});

          // retrieve from aws dynamoDB
          ddb.getItem(params, async function(err, data) {
            if (err) {
              console.log("Error", err);
              interaction.editReply({ content: 'error: unable to access wallets', ephemeral: true });
              currentlyBeingUsed = false;
            } else {
              // checks if no addresses
              if (Object.keys(data).length == 0) {
                console.log('no wallets found');
                interaction.editReply({ content: 'error: no wallets found', ephemeral: true });
                currentlyBeingUsed = false;
              } else {
                let totalAddressArray = data.Item.addresses.S.split(',')
                let contractAddress = interaction.options.getString('contract_address');
                let resultNftsIn;
                console.log(`got ${totalAddressArray.length} wallets`);
                await interaction.editReply({ content: `Got ${totalAddressArray.length} wallet(s)`, ephemeral: true });
                // loopes for each address user has tracked
                for (let i = 0; i < totalAddressArray.length; i++) {
                  let currentAddress = totalAddressArray[i].toLowerCase()
                  let resultNftsOut = await getNftsOut(interaction, profitTable, currentAddress, contractAddress);
                  resultNftsIn = await getNftsIn(interaction, resultNftsOut, currentAddress, contractAddress);
                }
                let resultFinal = await getFloor(interaction, resultNftsIn, totalAddressArray, contractAddress);
                currentlyBeingUsed = false;
                // final reply
                await interaction.editReply({ content: 'done', ephemeral: true });
                await interaction.editReply({ embeds: [resultFinal], ephemeral: true});
              }
            }
          });
        }
      }
    }).catch(async err => {
      console.log(err);
      await interaction.editReply({ content: 'error: error accessing api 7', ephemeral: true });
    });
  }
}

// get nft out transfers
function getNftsOut(interaction, profitTable, userAddress, contractAddress) {
  return new Promise(async resolve => {
    console.log(`getting nfts out for ${userAddress}`);
    await interaction.editReply({ content: `Getting nfts out ${userAddress}`, ephemeral: true });
    // checks nfts that came out of wallet
    alchemy.core.getAssetTransfers({
      fromBlock: "0x0",
      fromAddress: `${userAddress}`,
      contractAddresses: [`${contractAddress}`],
      excludeZeroValue: false,
      category: ["erc721", "erc1155"],
    }).then( value => {
      let checkedTxs = [];
      console.log('got alchemy transfers out');
      // checks if there are any transfers out
      if (value.transfers.length == 0) {
        console.log("none tracked out");
        resolve(profitTable);
      }
      // for each nft transfered in
      for (let i = 0; i < value.transfers.length; i++) {
        // calls etherscan internal tx api for each transaction
        setTimeout(() => { fetch(`https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=${value.transfers[i].hash}&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9`)
        .then(response => response.json())
        .then(async response => {
          console.log('etherscan transfers out: ', response.result.length, ', transfer: ', i);
          // rate limit check
          if (response.result == 'Max rate limit reached' && alreadyWarned == false) {
            console.log('rate limited');
            await interaction.followUp({ content: 'api being rate limited, results may not be accurate', ephemeral: true });
            alreadyWarned = true;
          }
          // checks to see if tx was already tracked (this is to prevent double tracking from multiple sales included in 1 tx like a gem sweep)
          if (checkedTxs.includes(value.transfers[i].hash) == false) {
            checkedTxs.push(value.transfers[i].hash);
            // loops for each internal tx
            for (let j = 0; j < response.result.length; j++) {
              // checks each internal tx to make sure its the one with the funds going to user wallet
              if (response.result[j].to == userAddress) {
                  let soldInEth = response.result[j].value / 1000000000000000000;
                  profitTable.totalMoneyIn += soldInEth;
                  profitTable.totalAmountSold += 1;
              }
            }
          }
          // checks to make sure all transfers in are tracked before resolving
          if (i == value.transfers.length-1) {
            console.log(`done tracking out for ${userAddress}`);
            resolve(profitTable);
          }
        }).catch(async err => {
          console.error(err);
          await interaction.editReply({ content: 'error: error accessing api 1', ephemeral: true });
          currentlyBeingUsed = false;
        }); }, 250 * (i + 1) );
      }
    }).catch(async err => {
      console.error(err);
      await interaction.editReply({ content: 'error: error accessing api 2', ephemeral: true });
      currentlyBeingUsed = false;
    });
  });
}

// get nft in transfers
function getNftsIn(interaction, profitTable, userAddress, contractAddress) {
  return new Promise(async resolve => {
    console.log(`getting nfts in for ${userAddress}`);
    await interaction.editReply({ content: `Getting nfts in ${userAddress}`, ephemeral: true });
    // checks nfts that came into wallet
    alchemy.core.getAssetTransfers({
      fromBlock: "0x0",
      contractAddresses: [`${contractAddress}`],
      toAddress: `${userAddress}`,
      excludeZeroValue: false,
      category: ["erc721", "erc1155"],
    }).then(value => {
      console.log('got alchemy transfers in');
      let checkedTxs = [];
      // checks if there are any nft transfers in
      if (value.transfers.length == 0) {
        console.log("no tracking in");
        resolve(profitTable);
      }
      // runs for each nfts transfer in
      for (let i = 0; i < value.transfers.length; i++) {
        let blocknum = parseInt(value.transfers[i].blockNum, 16)
        // gets specific transaction details with etherscan api
        setTimeout(() => { fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=${blocknum}&endblock=${blocknum}&page=1&offset=10&sort=desc&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9`)
        .then(response => response.json())
        .then(async response => {
          console.log('etherscan transfers in: ', response.result.length, ', transfer: ', i);
          // rate limit check
          if (response.result == 'Max rate limit reached' && alreadyWarned == false) {
            console.log('rate limited');
            await interaction.followUp({ content: 'api being rate limited, results may not be accurate, try again if results aren\'t right', ephemeral: true });
            alreadyWarned = true;
          }
          // runs for each tx
          for (let j = 0; j < response.result.length; j++) {
            // checks each tx to make sure it matches nft transfer tx to get around etherscan weird api
            if (response.result[j].hash == value.transfers[i].hash) {
              // checks if minted or somewhere else
              if (value.transfers[i].from == "0x0000000000000000000000000000000000000000") {
                // if minted
                if (checkedTxs.includes(response.result[j].hash) == false) {
                  checkedTxs.push(response.result[j].hash);
                  let mintCost = response.result[j].value.toString() / 1000000000000000000;
                  let mintGasCost = response.result[j].gasPrice * response.result[j].gasUsed / 1000000000000000000;
                  profitTable.mintGasFees += mintGasCost;
                  profitTable.mintCost += mintCost;
                }
                profitTable.totalAmountMinted += 1;
              } else {
                // if somewhere else
                if (checkedTxs.includes(response.result[j].hash) == false) {
                  checkedTxs.push(response.result[j].hash);
                  let secondaryCost = response.result[j].value / 1000000000000000000;
                  let buyinGasCost = response.result[j].gasPrice * response.result[j].gasUsed / 1000000000000000000;
                  profitTable.buyInGasFee += buyinGasCost;
                  profitTable.buyInCost += secondaryCost;
                }
                profitTable.totalAmountBoughtSecondary += 1;
              };
            } else {
              console.log("no match...");
            }
          }
          // checks to make sure all transfers in are tracked
          if (i == value.transfers.length-1) {
            console.log(`done tracking in for ${userAddress}`);
            await interaction.editReply({ content: `Done tracking in ${userAddress}`, ephemeral: true });
            // gets current holding for address
            alchemy.core.getTokenBalances(userAddress, [contractAddress]).then(getTokenBalancesValue => {
              let amountOwned = parseInt(getTokenBalancesValue.tokenBalances[0].tokenBalance, 16)
              profitTable.currentlyHeld += amountOwned;
              console.log(`done getting held for ${userAddress}`);
              resolve(profitTable);
            }).catch(async err => {
              console.error(err);
              await interaction.editReply({ content: 'error: error accessing api 5', ephemeral: true });
              currentlyBeingUsed = false;
            });
          }
        }).catch(async err => {
          console.error(err);
          await interaction.editReply({ content: 'error: error accessing api 3', ephemeral: true });
          currentlyBeingUsed = false;
        }); }, 250 * (i + 1) );
      }
    }).catch(async err => {
      console.error(err);
      await interaction.editReply({ content: 'error: error accessing api 4', ephemeral: true });
      currentlyBeingUsed = false;
    });
  });
}

// gets collection floor and other details, also creates final embed
function getFloor(interaction, profitTable, totalAddressArray, contractAddress) {
  return new Promise(async resolve => {
    await interaction.editReply({ content: `Getting collection details for ${contractAddress}`, ephemeral: true });
    let options = {method: 'GET', headers: {accept: '*/*', 'x-api-key': `${process.env.RESERVOIR_KEY}`}};
    // gets collection details
    fetch(`https://api.reservoir.tools/collections/v5?id=${contractAddress}&includeTopBid=false&sortBy=allTimeVolume&limit=20`, options)
      .then(response => response.json())
      .then(async response => {
        // final calculations
        profitTable.currentFloor = response.collections[0].floorAsk.price.amount.decimal
        profitTable.realizedProfit = profitTable.totalMoneyIn - (profitTable.buyInCost + profitTable.buyInGasFee + profitTable.mintCost + profitTable.mintGasFees);
        if (profitTable.currentlyHeld > 0) {
          profitTable.unrealizedProfit = profitTable.realizedProfit + (profitTable.currentlyHeld * profitTable.currentFloor);
        }
        console.log(profitTable);
        // final embed
        let finalEmbed = new EmbedBuilder()
	        .setColor([15, 23, 42])
	        .setTitle(response.collections[0].name)
          .setURL(`https://opensea.io/collection/${response.collections[0].slug}`)
          .setAuthor({ name: 'Profit/Loss Calculator' })
	        .setThumbnail(response.collections[0].image)
	        .addFields(
	        	{ name: 'Total minted', value: `${profitTable.totalAmountMinted}`, inline: true },
	        	{ name: 'Mint cost', value: `${profitTable.mintCost.toPrecision(5)}`, inline: true },
            { name: 'Mint fee', value: `${profitTable.mintGasFees.toPrecision(5)}`, inline: true },
            { name: 'Total secondary', value: `${profitTable.totalAmountBoughtSecondary}`, inline: true },
            { name: 'Secondary cost', value: `${profitTable.buyInCost.toPrecision(5)}`, inline: true },
            { name: 'Secondary fee', value: `${profitTable.buyInGasFee.toPrecision(5)}`, inline: true },
            { name: 'Amount sold', value: `${profitTable.totalAmountSold}`, inline: true },
            { name: 'ETH from sales', value: `${profitTable.totalMoneyIn.toPrecision(5)}`, inline: true },
            { name: 'Realized', value: `${profitTable.realizedProfit.toPrecision(5)}`, inline: true },
            { name: 'Holding', value: `${profitTable.currentlyHeld}`, inline: true },
            { name: 'Floor', value: `${profitTable.currentFloor.toPrecision(5)}`, inline: true },
            { name: 'Unrealized', value: `${profitTable.unrealizedProfit.toPrecision(5)}`, inline: true },
            { name: '\u200B', value: '\u200B' },
            { name: 'Wallets checked', value: `${totalAddressArray.length}` },
	        )
	        .setTimestamp()
	        .setFooter({ text: 'bot by captinturtle', iconURL: 'https://cdn.discordapp.com/avatars/205967038986977280/0560eac6f0d23e31f966653046c4dd3d.png'
        });
        resolve(finalEmbed);    
    }).catch(async err => {
      console.error(err);
      await interaction.editReply({ content: 'error: error accessing api 6', ephemeral: true });
      currentlyBeingUsed = false;
    });
  });
}