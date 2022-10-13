// Setup: npm install alchemy-sdk
import { Alchemy, Network } from "alchemy-sdk";
import dotenv from 'dotenv';

// init dotenv
dotenv.config();

const alchemyConfig = {
  apiKey: process.env.ALCHEMY_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(alchemyConfig);

const contractAddress = "0x29d7ebca656665c1a52a92f830e413e394db6b4f".toLowerCase();
const userAddress = "0x894c3F27a6359B7d4667F9669E98E27786EB0AbF".toLowerCase();
const zeroAddress = "0x0000000000000000000000000000000000000000".toLowerCase();

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
};


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
          console.log(profitTable);
        };
      }
    }).catch(console.error);
  }
}).catch(console.log);


// checks nfts that came into wallet
alchemy.core.getAssetTransfers({
  fromBlock: "0x0",
  contractAddresses: [`${contractAddress}`],
  toAddress: `${userAddress}`,
  excludeZeroValue: false,
  category: ["erc721", "erc1155"],
}).then(value => {
  let checkedTxs = [];
  for (let i = 0; i < value.transfers.length; i++) {
    let blocknum = parseInt(value.transfers[i].blockNum, 16)
    // gets specific transaction details
    fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=${blocknum}&endblock=${blocknum}&page=1&offset=10&sort=desc&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9`)
    .then(response => response.json())
    .then(response => {
      for (let j = 0; j < response.result.length; j++) {
        // checks each tx to make sure it matches nft transfer tx to get around etherscan weird api
        if (response.result[j].hash == value.transfers[i].hash) {
          // checks if minted or somewhere else
          if (value.transfers[i].from == zeroAddress) {
            // if minted
            if (checkedTxs.includes(response.result[j].hash) == false) {
              let mintCost = response.result[j].value.toString() / 1000000000000000000;
              let mintGasCost = response.result[j].gasPrice * response.result[j].gasUsed / 1000000000000000000;
              profitTable.mintGasFees += mintGasCost;
              profitTable.mintCost += mintCost;
            }
            profitTable.totalAmountMinted += 1;
            checkedTxs.push(response.result[j].hash);
            console.log(profitTable);
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
            console.log(profitTable);
          };
        } else {
          console.log("no match...");
        }
      }
    }).catch(console.error);
  }
}).catch(console.log);
