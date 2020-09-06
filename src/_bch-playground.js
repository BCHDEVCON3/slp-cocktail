// import * as slpMdm from "slp-mdm";
import Bch from "@psf/bch-js";
import BigNumber from "bignumber.js";
import * as Y from "yjs";
import * as MsgPack from "@msgpack/msgpack";
import { ACCOUNT_1, ACCOUNT_2, ACCOUNT_3, ACCOUNT_4 } from "./bch-accounts";
import { shakeIt } from "./core/coinjoin";
import { Buffer } from "buffer";

const NETWORK = "testnet";
const MAINNET_API_FREE = "https://free-main.fullstack.cash/v3/";
const TESTNET_API_FREE = "https://free-test.fullstack.cash/v3/";
const TOKENQTY = 1;
const TOKENID =
  "20fdfb9fa450af19716f5b8df8634db594a5327930614ba6cd9f15e179f4913d";

const bch = new Bch({
  restURL: NETWORK === "mainnet" ? MAINNET_API_FREE : TESTNET_API_FREE,
});

const copyInput = (t) => {
  const copy = MsgPack.decode(MsgPack.encode(t));
  copy.prevOutScript = Buffer.from(copy.prevOutScript);
  copy.signScript = Buffer.from(copy.signScript);
  copy.pubKeys = copy.pubKeys.map((pk) => Buffer.from(pk));
  copy.signatures = copy.signatures.map((s) => Buffer.from(s));
  return copy;
};

window.Y = Y;
window.shakeIt = shakeIt;
window.first = {
  wif: "cUsUScMYmrQiiAdVzWiqkgFKTbTUNop8e7rNFBEb6ztYowDAVeuE",
  tokenId: "20fdfb9fa450af19716f5b8df8634db594a5327930614ba6cd9f15e179f4913d",
  amount: 3,
  recepient: "bchtest:qps87pahpsal5uej2pf5z6s7srs6fjfgjg0sdcn2ch",
  peersSize: 2,
};
window.second = {
  wif: "cU32cq6oa9QvoEM4UgEfYqGoFCGQwHxW4XFfxiMw9rcrqRN8tuPe",
  tokenId: "20fdfb9fa450af19716f5b8df8634db594a5327930614ba6cd9f15e179f4913d",
  amount: 3,
  recepient: "bchtest:qz5wmh9fwufpxhtaw8r9yazgyav79mrezvm59kf4n3",
  peersSize: 2,
};

window.joincoin = async () => {
  try {
    let [transactionBuilder1, insInfo1] = await prepareTransaction(
      [ACCOUNT_1.cashAddress],
      [ACCOUNT_3.cashAddress, ACCOUNT_4.cashAddress],
      TOKENQTY,
      TOKENID,
      250 + 546 * 2
    );

    // console.info("INITED", copyDeep(transactionBuilder));

    const keyPair0 = bch.ECPair.fromWIF(ACCOUNT_1.WIF);
    const keyPair1 = bch.ECPair.fromWIF(ACCOUNT_2.WIF);

    transactionBuilder1 = signTransaction(
      transactionBuilder1,
      keyPair0,
      insInfo1[ACCOUNT_1.cashAddress]
    );
    console.info(transactionBuilder1);
    console.info(Object.keys(transactionBuilder1.transaction.inputs));

    let [transactionBuilder2, insInfo2] = await prepareTransaction(
      [ACCOUNT_1.cashAddress, ACCOUNT_2.cashAddress],
      [ACCOUNT_3.cashAddress, ACCOUNT_4.cashAddress],
      TOKENQTY,
      TOKENID,
      250 + 546 * 2
    );

    transactionBuilder2 = signTransaction(
      transactionBuilder2,
      keyPair1,
      insInfo2[ACCOUNT_2.cashAddress]
    );

    const first = transactionBuilder1.transaction.inputs[0];
    const second = transactionBuilder1.transaction.inputs[1];

    transactionBuilder2.transaction.inputs[0] = copyInput(first);
    transactionBuilder2.transaction.inputs[1] = copyInput(second);

    // transactionBuilder2.transaction.inputs[0] = MsgPack.decode(
    //   MsgPack.encode(first)
    // );
    // transactionBuilder2.transaction.inputs[1] = MsgPack.decode(
    //   MsgPack.encode(second)
    // );

    // console.info("SIGNED 2", copyDeep(transactionBuilder));

    const [hex, txidStr] = await broadcastTransaction(transactionBuilder2);

    console.log(`Transaction raw hex: `, hex);
    console.log(`Transaction ID: ${txidStr}`);
    console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`);
  } catch (err) {
    console.error(err);
  }
};

async function prepareTransaction(
  cashAddresses,
  receiverSlpAddresses,
  amount,
  tokenId,
  txFee
) {
  let transactionBuilder = new bch.TransactionBuilder(NETWORK);
  let insInfo = cashAddresses.reduce((a, b) => ((a[b] = []), a), {});
  let reminders = [];
  let commonTokenUtxo = [];
  let changes = [];
  let ix = 0;
  for (let i = 0; i < cashAddresses.length; i++) {
    let cashAddress = cashAddresses[i];

    // fetch all utxo
    const data = await bch.Electrumx.utxo(cashAddress);
    const utxos = data.utxos;

    if (utxos.length === 0) throw new Error("No UTXOs to spend! Exiting.");

    let allUtxos = await bch.SLP.Utils.tokenUtxoDetails(utxos);

    // filter bch utxos
    const bchUtxos = utxos.filter((utxo, index) => {
      const tokenUtxo = allUtxos[index];
      if (!tokenUtxo.isValid) return true;
    });

    if (bchUtxos.length === 0) {
      throw new Error("Wallet does not have a BCH UTXO to pay miner fees.");
    }

    // filter token Utxos
    const tokenUtxos = allUtxos.filter((utxo, index) => {
      if (utxo && utxo.tokenId === tokenId && utxo.utxoType === "token") {
        return true;
      }
    });
    if (tokenUtxos.length === 0) {
      throw new Error("No token UTXOs for the specified token could be found.");
    }

    // collect all tokens
    commonTokenUtxo = commonTokenUtxo.concat(tokenUtxos);

    // calculate token change
    let totalTokens = 0;
    for (let i = 0; i < tokenUtxos.length; i++)
      totalTokens += tokenUtxos[i].tokenQty;
    const change = totalTokens - amount;
    changes.push(change);

    // find bch utxo for fee
    const bchUtxo = findUtxo(bchUtxos, txFee);

    // add inputs
    transactionBuilder.addInput(bchUtxo.tx_hash, bchUtxo.tx_pos);
    insInfo[cashAddress].push({ index: ix++, amount: bchUtxo.value });
    for (let i = 0; i < tokenUtxos.length; i++) {
      transactionBuilder.addInput(tokenUtxos[i].tx_hash, tokenUtxos[i].tx_pos);
      insInfo[cashAddress].push({ index: ix++, amount: tokenUtxos[i].value });
    }

    // calculate BCH change
    reminders.push([
      bch.Address.toLegacyAddress(cashAddress),
      bchUtxo.value - txFee,
    ]);
  }

  // generate op return script
  const slpSendObj = generateSendOpReturn(
    commonTokenUtxo,
    Array(receiverSlpAddresses.length).fill(amount).concat(changes)
  );
  const slpData = slpSendObj.script;

  // add OP_RETURN
  transactionBuilder.addOutput(slpData, 0);

  // add outouts to receivers
  receiverSlpAddresses.forEach((receiverSlpAddress) => {
    transactionBuilder.addOutput(
      bch.SLP.Address.toLegacyAddress(receiverSlpAddress),
      546
    );
  });

  // add outouts with token change
  cashAddresses.forEach((cashAddress) => {
    transactionBuilder.addOutput(
      bch.SLP.Address.toLegacyAddress(cashAddress),
      546
    );
  });

  // add outouts with BCH change
  reminders.forEach((reminder) => {
    transactionBuilder.addOutput(reminder[0], reminder[1]);
  });
  return [transactionBuilder, insInfo];
}

function generateSendOpReturn(tokenUtxos, sendQtys) {
  try {
    const tokenId = tokenUtxos[0].tokenId;
    const decimals = tokenUtxos[0].decimals;

    let totalTokens = 0;
    let sendQty = 0;
    for (let i = 0; i < tokenUtxos.length; i++)
      totalTokens += tokenUtxos[i].tokenQty;
    for (let i = 0; i < sendQtys.length; i++) sendQty += sendQtys[i];

    let script;
    let amounts = [];
    sendQtys.forEach((sendQty) => {
      amounts.push(
        new BigNumber(sendQty)
          .times(10 ** decimals)
          .integerValue(BigNumber.ROUND_DOWN)
      );
    });

    script = window.slpMdm.TokenType1.send(tokenId, amounts);

    return { script, outputs: sendQtys.length };
  } catch (err) {
    console.log(`Error in generateSendOpReturn()`);
    throw err;
  }
}

function signTransaction(transactionBuilder, keyPair, insInfo) {
  insInfo.forEach((inInfo) => {
    let redeemScript;
    transactionBuilder.sign(
      inInfo.index,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      inInfo.amount
    );
  });
  return transactionBuilder;
}

async function broadcastTransaction(transactionBuilder) {
  const tx = transactionBuilder.build();
  const hex = tx.toHex();
  const txidStr = await bch.RawTransactions.sendRawTransaction([hex]);
  return [hex, txidStr];
}

function findUtxo(utxos, amount) {
  utxos.sort((a, b) => {
    if (a.value < b.value) {
      return -1;
    }
    if (a.value > b.value) {
      return 1;
    }
    return 0;
  });

  for (let i = 0; i < utxos.length; i++) {
    if (utxos[i].value >= amount) {
      return utxos[i];
    }
  }
  throw new Error(`Wallet does not have a BCH UTXO to pay.`);
}
async function getBCHBalance(cashAddress) {
  try {
    const balance = await bch.Electrumx.balance(cashAddress);

    return balance;
  } catch (err) {
    throw err;
  }
}

async function getSLPBalance(slpAddress) {
  try {
    const tokens = await bch.SLP.Utils.balancesForAddress(slpAddress);
    return tokens;
  } catch (err) {
    throw err;
  }
}
