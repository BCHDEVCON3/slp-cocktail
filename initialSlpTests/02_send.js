const BigNumber = require("bignumber.js");
const BCHJS = require("@psf/bch-js");
let Utils = require("slpjs").Utils;

const NETWORK = `testnet`;
const walletName = process.argv[2] || "account0.json";
const receiverWalletName = process.argv[3] || "account1.json";

const MAINNET_API_FREE = "https://free-main.fullstack.cash/v3/";
const TESTNET_API_FREE = "https://free-test.fullstack.cash/v3/";
let bchjs;
if (NETWORK === "mainnet") bchjs = new BCHJS({ restURL: MAINNET_API_FREE });
else bchjs = new BCHJS({ restURL: TESTNET_API_FREE });

const walletInfo = require("./" + walletName);
const receiverInfo = require("./" + receiverWalletName);
const TOKENQTY = 10;
const TOKENID =
  "20fdfb9fa450af19716f5b8df8634db594a5327930614ba6cd9f15e179f4913d";
let TO_SLPADDR = Utils.toSlpAddress(receiverInfo.cashAddress);

async function sendToken() {
  try {
    const mnemonic = walletInfo.mnemonic;

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic);
    // master HDNode
    let masterHDNode;
    if (NETWORK === "mainnet") masterHDNode = bchjs.HDNode.fromSeed(rootSeed);
    else masterHDNode = bchjs.HDNode.fromSeed(rootSeed, "testnet"); // Testnet

    // HDNode of BIP44 account
    const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/145'/0'");
    const change = bchjs.HDNode.derivePath(account, "0/0");

    // Generate an EC key pair for signing the transaction.
    const keyPair = bchjs.HDNode.toKeyPair(change);

    // get the cash address
    const cashAddress = bchjs.HDNode.toCashAddress(change);
    const slpAddress = bchjs.HDNode.toSLPAddress(change);

    // Get UTXOs held by this address.
    const data = await bchjs.Electrumx.utxo(cashAddress);
    const utxos = data.utxos;
    console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`);

    if (utxos.length === 0) throw new Error("No UTXOs to spend! Exiting.");

    // Identify the SLP token UTXOs.
    let tokenUtxos = await bchjs.SLP.Utils.tokenUtxoDetails(utxos);
    console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`);

    // Filter out the non-SLP token UTXOs.
    const bchUtxos = utxos.filter((utxo, index) => {
      const tokenUtxo = tokenUtxos[index];
      if (!tokenUtxo.isValid) return true;
    });
    console.log(`bchUTXOs: ${JSON.stringify(bchUtxos, null, 2)}`);

    if (bchUtxos.length === 0) {
      throw new Error("Wallet does not have a BCH UTXO to pay miner fees.");
    }

    // Filter out the token UTXOs that match the user-provided token ID.
    tokenUtxos = tokenUtxos.filter((utxo, index) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === TOKENID && // UTXO matches the token ID.
        utxo.utxoType === "token" // UTXO is not a minting baton.
      ) {
        return true;
      }
    });
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`);

    if (tokenUtxos.length === 0) {
      throw new Error("No token UTXOs for the specified token could be found.");
    }

    // Choose a UTXO to pay for the transaction.
    const bchUtxo = findBiggestUtxo(bchUtxos);
    // console.log(`bchUtxo: ${JSON.stringify(bchUtxo, null, 2)}`);

    // Generate the OP_RETURN code.
    const slpSendObj = bchjs.SLP.TokenType1.generateSendOpReturn(
      tokenUtxos,
      TOKENQTY
    );
    const slpData = slpSendObj.script;
    // console.log(`slpOutputs: ${slpSendObj.outputs}`);

    // BEGIN transaction construction.

    // instance of transaction builder
    let transactionBuilder;
    if (NETWORK === "mainnet") {
      transactionBuilder = new bchjs.TransactionBuilder();
    } else transactionBuilder = new bchjs.TransactionBuilder("testnet");

    // Add the BCH UTXO as input to pay for the transaction.
    const originalAmount = bchUtxo.value;
    transactionBuilder.addInput(bchUtxo.tx_hash, bchUtxo.tx_pos);

    // add each token UTXO as an input.
    for (let i = 0; i < tokenUtxos.length; i++) {
      transactionBuilder.addInput(tokenUtxos[i].tx_hash, tokenUtxos[i].tx_pos);
    }

    // get byte count to calculate fee. paying 1 sat
    // Note: This may not be totally accurate. Just guessing on the byteCount size.
    // const byteCount = this.BITBOX.BitcoinCash.getByteCount(
    //   { P2PKH: 3 },
    //   { P2PKH: 5 }
    // )
    // //console.log(`byteCount: ${byteCount}`)
    // const satoshisPerByte = 1.1
    // const txFee = Math.floor(satoshisPerByte * byteCount)
    // console.log(`txFee: ${txFee} satoshis\n`)
    const txFee = 250;

    // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - txFee - 546 * 2;
    if (remainder < 1) {
      throw new Error("Selected UTXO does not have enough satoshis");
    }
    // console.log(`remainder: ${remainder}`)

    // Add OP_RETURN as first output.
    transactionBuilder.addOutput(slpData, 0);

    // Send the token back to the same wallet if the user hasn't specified a
    // different address.
    if (TO_SLPADDR === "") TO_SLPADDR = walletInfo.slpAddress;

    // Send dust transaction representing tokens being sent.
    transactionBuilder.addOutput(
      bchjs.SLP.Address.toLegacyAddress(TO_SLPADDR),
      546
    );

    // Return any token change back to the sender.
    if (slpSendObj.outputs > 1) {
      transactionBuilder.addOutput(
        bchjs.SLP.Address.toLegacyAddress(slpAddress),
        546
      );
    }

    // Last output: send the BCH change back to the wallet.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      remainder
    );

    // Sign the transaction with the private key for the BCH UTXO paying the fees.
    let redeemScript;
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    );

    // Sign each token UTXO being consumed.
    for (let i = 0; i < tokenUtxos.length; i++) {
      const thisUtxo = tokenUtxos[i];

      transactionBuilder.sign(
        1 + i,
        keyPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        thisUtxo.value
      );
    }

    // build tx
    const tx = transactionBuilder.build();

    // output rawhex
    const hex = tx.toHex();
    // console.log(`Transaction raw hex: `, hex)

    // END transaction construction.

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex]);
    console.log(`Transaction ID: ${txidStr}`);

    console.log("Check the status of your transaction on this block explorer:");
    if (NETWORK === "testnet") {
      console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`);
    } else console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`);
  } catch (err) {
    console.error("Error in sendToken: ", err);
    console.log(`Error message: ${err.message}`);
  }
}
sendToken();

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo(utxos) {
  let largestAmount = 0;
  let largestIndex = 0;

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i];

    if (thisUtxo.value > largestAmount) {
      largestAmount = thisUtxo.value;
      largestIndex = i;
    }
  }

  return utxos[largestIndex];
}
