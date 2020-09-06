import BchJS from "@psf/bch-js";
import { uuidv4 } from "lib0/random";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import {
  prepareTransaction,
  signTransaction,
  broadcastTransaction,
} from "./bch";

type SnakeItParams = {
  wif: string;
  tokenId: string;
  amount: number | string;
  recepient: string;
  peersSize: number;
};

type DoneParams = {
  hex: string;
  txidStr: string;
  explorerUrl: string;
};

const TESTNET_API_FREE = "https://free-test.fullstack.cash/v3/";

const bchjs = new BchJS({ restURL: TESTNET_API_FREE });

interface PoolItem {
  id: string;
  from: string;
  to: string;
}

export function shakeIt(
  { wif, tokenId, amount, recepient, peersSize }: SnakeItParams,
  done: (doneParams: DoneParams) => void,
  onError?: (err: Error) => void
) {
  const roomName = [tokenId, amount, peersSize].join("_");
  const ecpair = bchjs.ECPair.fromWIF(wif);
  const myAddress: string = bchjs.ECPair.toCashAddress(ecpair);

  const doc = new Y.Doc();
  const wrtcProvider = new WebrtcProvider(roomName, doc, {
    password: "slp_coctail_secret",
  } as any);

  const me = getMe();
  const pool = doc.getArray<PoolItem>("pool");
  const ready = doc.getMap("ready");
  const inputs = doc.getMap("inputs");

  let currentTB: any;
  let currentHex: any;
  let currentMyInsInfo: any;
  let t: any;

  const handlePoolChange = async () => {
    let poolArray = pool.toArray();
    // console.info("POOL", poolArray);
    const index = poolArray.findIndex((p) => p.id === me);
    if (index === -1) {
      pool.push([{ id: me, from: myAddress, to: recepient }]);
      return;
    } else {
      const myPoolItem = poolArray[index];
      if (myPoolItem.from !== myAddress || myPoolItem.to !== recepient) {
        doc.transact(() => {
          pool.delete(index);
          pool.push([{ id: me, from: myAddress, to: recepient }]);
        });
        return;
      }
    }

    if (pool.length >= peersSize) {
      let poolArray = pool.toArray();
      const [transactionBuilder, insInfo] = await prepareTransaction(
        poolArray.map(({ from }) => from),
        poolArray.map(({ to }) => to),
        amount,
        tokenId,
        250 + 546 * 2
      );
      currentTB = transactionBuilder;
      currentMyInsInfo = insInfo[myAddress];

      const tx = transactionBuilder.transaction.buildIncomplete();
      const hex = tx.toHex();
      currentHex = hex;

      ready.set(me, hex);

      clearTimeout(t);
      t = setTimeout(() => {
        if (ready.size < pool.length) {
          doc.transact(() => {
            pool.forEach((p, i) => {
              if (!ready.has(p.id)) {
                pool.delete(i);
              }
            });
          });
        }
      }, 10_000);
    }
  };

  const handleReadyChange = () => {
    // console.info("READY", ready.toJSON());
    if (
      Array.from(ready.values()).filter((h) => h === currentHex).length >=
      peersSize
    ) {
      stopPooling();

      signTransaction(currentTB, ecpair, currentMyInsInfo);
      doc.transact(() => {
        for (const key of Object.keys(currentTB.transaction.inputs)) {
          const input = currentTB.transaction.inputs[key];
          if (input.value) {
            inputs.set(key, input);
          }
        }
      });
    } else {
      startPooling();
    }
  };

  let building = false;
  const handleInputsChange = async () => {
    if (building) return;
    building = true;

    // console.info("INPUTS", inputs.toJSON());

    if (inputs.size === currentTB.transaction.inputs.length) {
      for (const key of Object.keys(currentTB.transaction.inputs)) {
        if (!currentTB.transaction.inputs[key]?.value) {
          const input = { ...inputs.get(key) };
          serealizeInput(input);
          currentTB.transaction.inputs[key] = input;
        }
      }
      // console.info(currentTB);

      try {
        const [hex, txidStr] = await broadcastTransaction(currentTB);

        done({
          hex,
          txidStr,
          explorerUrl: `https://explorer.bitcoin.com/tbch/tx/${txidStr}`,
        });
      } catch (err) {
        console.error(err);
        if (onError) onError(err);
      } finally {
        cleanup();
      }
    }
    building = false;
  };

  let pooling = false;
  const startPooling = () => {
    if (!pooling) {
      pool.observe(handlePoolChange);
      handlePoolChange();
      pooling = true;
    }
  };
  const stopPooling = () => {
    clearTimeout(t);
    if (pooling) {
      // const index = pool.toArray().findIndex((p) => p.id === me);
      // if (index !== -1) {
      //   pool.delete(index);
      // }
      pool.unobserve(handlePoolChange);
      pooling = false;
    }
  };

  startPooling();
  ready.observe(handleReadyChange);
  inputs.observe(handleInputsChange);

  const cleanup = () => {
    stopPooling();
    ready.unobserve(handleReadyChange);
    inputs.unobserve(handleInputsChange);
    wrtcProvider.destroy();
  };
  return cleanup;
}

export function getMe() {
  return (
    localStorage.getItem("me") ??
    (() => {
      const newMe: string = uuidv4();
      localStorage.setItem("me", newMe);
      return newMe;
    })()
  );
}

function serealizeInput(input: any) {
  input.prevOutScript = Buffer.from(input.prevOutScript);
  input.signScript = Buffer.from(input.signScript);
  input.pubKeys = input.pubKeys.map((pk: any) => Buffer.from(pk));
  input.signatures = input.signatures.map((s: any) => Buffer.from(s));
}
