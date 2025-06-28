import {
    Signer,
    Wallet,
    NonceManager,
    JsonHttpProvider,
    TransactionBuilder,
} from "../src/index.mjs"

export function setupWallet() {
    const rpcProvider = new JsonHttpProvider({ url: process.env.RPC_URL });
    const nonceManager = new NonceManager({ provider: rpcProvider });
    // const signer = new Signer({ privateKey: process.env.PRIVATE_KEY });
    const signer = new Signer();
    const txBuilder = new TransactionBuilder({ rpcProvider, nonceManager, signer }); // review whether we need to pass the signer here

    const wallet = new Wallet({
        signer,
        txBuilder,
        rpcProvider,
    }, {
        eip155: true,
        freeGas: process.env.IS_GASLESS_NETWORK === 'true',
    });

    return wallet;
}
