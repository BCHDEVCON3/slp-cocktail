const BigNumber = require("bignumber.js");
const BCHJS = require("@psf/bch-js");
const slpMdm = require("slp-mdm");

class CoinJoin {
  constructor(network = "testnet") {
    const MAINNET_API_FREE = "https://free-main.fullstack.cash/v3/";
    const TESTNET_API_FREE = "https://free-test.fullstack.cash/v3/";
    this.network = network;
    this.bchjs = new BCHJS({
      restURL: network === "mainnet" ? MAINNET_API_FREE : TESTNET_API_FREE,
    });
  }

  async prepareTransaction(
    cashAddresses,
    receiverSlpAddresses,
    amount,
    tokenId,
    txFee
  ) {
    let transactionBuilder = new this.bchjs.TransactionBuilder(this.network);
    let insInfo = cashAddresses.reduce((a, b) => ((a[b] = []), a), {});
    let reminders = [];
    let commonTokenUtxo = [];
    let changes = [];
    let ix = 0;
    for (let i = 0; i < cashAddresses.length; i++) {
      let cashAddress = cashAddresses[i];

      // fetch all utxo
      const data = await this.bchjs.Electrumx.utxo(cashAddress);
      const utxos = data.utxos;

      if (utxos.length === 0) throw new Error("No UTXOs to spend! Exiting.");

      let allUtxos = await this.bchjs.SLP.Utils.tokenUtxoDetails(utxos);

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
        throw new Error(
          "No token UTXOs for the specified token could be found."
        );
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
      const bchUtxo = this.findUtxo(bchUtxos, txFee);

      // add inputs
      transactionBuilder.addInput(bchUtxo.tx_hash, bchUtxo.tx_pos);
      insInfo[cashAddress].push({ index: ix++, amount: bchUtxo.value });
      for (let i = 0; i < tokenUtxos.length; i++) {
        transactionBuilder.addInput(
          tokenUtxos[i].tx_hash,
          tokenUtxos[i].tx_pos
        );
        insInfo[cashAddress].push({ index: ix++, amount: tokenUtxos[i].value });
      }

      // calculate BCH change
      reminders.push([
        this.bchjs.Address.toLegacyAddress(cashAddress),
        bchUtxo.value - txFee,
      ]);
    }

    // generate op return script
    const slpSendObj = this.generateSendOpReturn(
      commonTokenUtxo,
      Array(receiverSlpAddresses.length).fill(amount).concat(changes)
    );
    const slpData = slpSendObj.script;

    // add OP_RETURN
    transactionBuilder.addOutput(slpData, 0);

    // add outouts to receivers
    receiverSlpAddresses.forEach((receiverSlpAddress) => {
      transactionBuilder.addOutput(
        this.bchjs.SLP.Address.toLegacyAddress(receiverSlpAddress),
        546
      );
    });

    // add outouts with token change
    cashAddresses.forEach((cashAddress) => {
      transactionBuilder.addOutput(
        this.bchjs.SLP.Address.toLegacyAddress(cashAddress),
        546
      );
    });

    // add outouts with BCH change
    reminders.forEach((reminder) => {
      transactionBuilder.addOutput(reminder[0], reminder[1]);
    });
    return [transactionBuilder, insInfo];
  }

  generateSendOpReturn(tokenUtxos, sendQtys) {
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
        let baseQty = new BigNumber(sendQty).times(10 ** decimals);
        baseQty = baseQty.absoluteValue();
        baseQty = Math.floor(baseQty);
        baseQty = baseQty.toString();
        amounts.push(new slpMdm.BN(baseQty));
      });

      script = slpMdm.TokenType1.send(tokenId, amounts);

      return { script, outputs: sendQtys.length };
    } catch (err) {
      console.log(`Error in generateSendOpReturn()`);
      throw err;
    }
  }

  signTransaction(transactionBuilder, keyPair, insInfo) {
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

  async broadcastTransaction(transactionBuilder) {
    const tx = transactionBuilder.build();
    const hex = tx.toHex();
    const txidStr = await this.bchjs.RawTransactions.sendRawTransaction([hex]);
    return [hex, txidStr];
  }

  findUtxo(utxos, amount) {
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
  async getBCHBalance(cashAddress) {
    try {
      const balance = await this.bchjs.Electrumx.balance(cashAddress);

      return balance;
    } catch (err) {
      throw err;
    }
  }

  async getSLPBalance(slpAddress) {
    try {
      const tokens = await this.bchjs.SLP.Utils.balancesForAddress(slpAddress);
      return tokens;
    } catch (err) {
      throw err;
    }
  }
}
module.exports = CoinJoin;
