// import slm from "slp-mdm";
import Bch from "@psf/bch-js";

const NETWORK: string = "testnet";
const MAINNET_API_FREE = "https://free-main.fullstack.cash/v3/";
const TESTNET_API_FREE = "https://free-test.fullstack.cash/v3/";

const bch = new Bch({
  restURL: NETWORK === "mainnet" ? MAINNET_API_FREE : TESTNET_API_FREE,
});

const tb = new bch.TransactionBuilder(NETWORK);

console.info(tb);
