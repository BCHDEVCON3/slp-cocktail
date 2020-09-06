const BITBOXSDK = require("bitbox-sdk");
const BITBOX = BITBOXSDK.BITBOX;
const NETWORK = `testnet`;
const fs = require("fs");
const walletName = process.argv[2] || "account.json";

const bitbox =
  NETWORK === `mainnet`
    ? new BITBOX({ restURL: `https://rest.bitcoin.com/v2/` })
    : new BITBOX({ restURL: `https://trest.bitcoin.com/v2/` });

const lang = "english"; // Set the language of the wallet.

const outObj = {};

const mnemonic = bitbox.Mnemonic.generate(
  128,
  bitbox.Mnemonic.wordLists()[lang]
);

outObj.mnemonic = mnemonic;

// root seed buffer
const rootSeed = bitbox.Mnemonic.toSeed(mnemonic);

// master HDNode
const masterHDNode = bitbox.HDNode.fromSeed(rootSeed, NETWORK);

// Generate the first 10 seed addresses.
for (let i = 0; i < 10; i++) {
  const childNode = masterHDNode.derivePath(`m/44'/145'/0'/0/${i}`);

  // Save the first seed address for use in the .json output file.
  if (i === 0) {
    outObj.cashAddress = bitbox.HDNode.toCashAddress(childNode);
    outObj.legacyAddress = bitbox.HDNode.toLegacyAddress(childNode);
    outObj.WIF = bitbox.HDNode.toWIF(childNode);
  }
}

// Write out the basic information into a json file for other example apps to use.
fs.writeFile(walletName, JSON.stringify(outObj, null, 2), function (err) {
  if (err) return console.error(err);
  console.log(`${walletName} written successfully.`);
});
