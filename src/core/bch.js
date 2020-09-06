/* eslint-disable */

// import BchJS from "@psf/bch-js";
import BigNumber from "bignumber.js";

const NETWORK = "testnet";
const TESTNET_API_FREE = "https://free-test.fullstack.cash/v3/";
const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmNTU1OWExY2U1MjBmMDAxOTA3ZDcyMyIsImVtYWlsIjoiYml0b2Zmb2dAZ21haWwuY29tIiwiYXBpTGV2ZWwiOjAsInJhdGVMaW1pdCI6MywiaWF0IjoxNTk5NDI5MDQ5LCJleHAiOjE2MDIwMjEwNDl9.NekXZiTIaQOWdtdoJkDa_U8fcW2q4W3RRC_F618TND8";

export const bchjs = new BchJS({
  restURL: TESTNET_API_FREE,
  apiToken: API_TOKEN,
});

export async function prepareTransaction(
  cashAddresses,
  receiverSlpAddresses,
  amount,
  tokenId,
  txFee
) {
  let transactionBuilder = new bchjs.TransactionBuilder(NETWORK);
  let insInfo = cashAddresses.reduce((a, b) => ((a[b] = []), a), {});
  let reminders = [];
  let commonTokenUtxo = [];
  let changes = [];
  let ix = 0;
  for (let i = 0; i < cashAddresses.length; i++) {
    let cashAddress = cashAddresses[i];

    // fetch all utxo
    const data = await bchjs.Electrumx.utxo(cashAddress);
    const utxos = data.utxos;

    if (utxos.length === 0) throw new Error("No UTXOs to spend! Exiting.");

    let allUtxos = await bchjs.SLP.Utils.tokenUtxoDetails(utxos);

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
      bchjs.Address.toLegacyAddress(cashAddress),
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
      bchjs.SLP.Address.toLegacyAddress(receiverSlpAddress),
      546
    );
  });

  // add outouts with token change
  cashAddresses.forEach((cashAddress) => {
    transactionBuilder.addOutput(
      bchjs.SLP.Address.toLegacyAddress(cashAddress),
      546
    );
  });

  // add outouts with BCH change
  reminders.forEach((reminder) => {
    transactionBuilder.addOutput(reminder[0], reminder[1]);
  });
  return [transactionBuilder, insInfo];
}

export function generateSendOpReturn(tokenUtxos, sendQtys) {
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

export function signTransaction(transactionBuilder, keyPair, insInfo) {
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

export async function broadcastTransaction(transactionBuilder) {
  const tx = transactionBuilder.build();
  const hex = tx.toHex();
  const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex]);
  return [hex, txidStr];
}

export function findUtxo(utxos, amount) {
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

export async function getBCHBalance(cashAddress) {
  try {
    const balance = await bchjs.Electrumx.balance(cashAddress);

    return balance;
  } catch (err) {
    throw err;
  }
}

export async function getSLPBalance(cashAddress) {
  try {
    // doest work:
    // const tokens = await bchjs.SLP.Utils.balancesForAddress(slpAddress);

    // try:
    const data = await bchjs.Electrumx.utxo(cashAddress);
    const utxos = data.utxos;

    let allUtxos = await bchjs.SLP.Utils.tokenUtxoDetails(utxos);
    let tokens = {};
    allUtxos.forEach((utxo) => {
      if (utxo && utxo.utxoType === "token") {
        tokens[utxo.tokenId] = tokens[utxo.tokenId] || {
          tokenId: utxo.tokenId,
          balance: 0,
          slpAddress: bchjs.SLP.Address.toSLPAddress(cashAddress),
          decimalCount: utxo.decimals,
          tokenTicker: utxo.tokenTicker,
          tokenName: utxo.tokenName,
        };
        tokens[utxo.tokenId].balance += utxo.tokenQty;
      }
    });
    return Object.values(tokens);
  } catch (err) {
    throw err;
  }
}
