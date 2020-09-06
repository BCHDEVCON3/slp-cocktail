// imports
const CoinJoin = require("./lib.js");

// accounts
const walletName0 = process.argv[2] || "account0.json";
const walletName1 = process.argv[3] || "account1.json";
const receiverWalletName0 = process.argv[4] || "account2.json";
const receiverWalletName1 = process.argv[4] || "account3.json";
const walletInfo0 = require("./" + walletName0);
const walletInfo1 = require("./" + walletName1);
const receiverInfo0 = require("./" + receiverWalletName0);
const receiverInfo1 = require("./" + receiverWalletName1);

// token
const TOKENQTY = 1;
const TOKENID =
  "20fdfb9fa450af19716f5b8df8634db594a5327930614ba6cd9f15e179f4913d";
async function joinTokens() {
  try {
    let coinJoin = new CoinJoin();

    // 1. prepare transaction (done by every user, the result is the same)
    let [transactionBuilder, insInfo] = await coinJoin.prepareTransaction(
      [walletInfo0.cashAddress, walletInfo1.cashAddress],
      [receiverInfo0.cashAddress, receiverInfo1.cashAddress],
      TOKENQTY,
      TOKENID,
      250 + 546 * 2
    );

    // 2. chose keys to sign inputs (done by every user, the result is different)
    const keyPair0 = coinJoin.bchjs.ECPair.fromWIF(walletInfo0.WIF);
    const keyPair1 = coinJoin.bchjs.ECPair.fromWIF(walletInfo1.WIF);

    // 3. sign inputs (done by every user, the result is different,
    // probably it is better to share the signed transaction in circle)
    transactionBuilder = coinJoin.signTransaction(
      transactionBuilder,
      keyPair0,
      insInfo[walletInfo0.cashAddress]
    );
    transactionBuilder = coinJoin.signTransaction(
      transactionBuilder,
      keyPair1,
      insInfo[walletInfo1.cashAddress]
    );

    // 4. broadcast transaction (by anyone)
    const [hex, txidStr] = await coinJoin.broadcastTransaction(
      transactionBuilder
    );

    console.log(`Transaction raw hex: `, hex);
    console.log(`Transaction ID: ${txidStr}`);
    console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`);
  } catch (err) {
    console.error("Error in sendToken: ", err);
    console.log(`Error message: ${err.message}`);
  }
}

joinTokens();
