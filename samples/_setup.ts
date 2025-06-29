import {
    Wallet,
    SimpleSigner,
    SimpleNonceManager,
    JsonHttpProvider,
    TransactionBuilder,
} from "../src/index"

export function setupWallet(): Wallet {
    const rpcProvider = new JsonHttpProvider({ url: process.env.RPC_URL });
    const nonceManager = new SimpleNonceManager({ provider: rpcProvider });
    // const signer = new SimpleSigner({ privateKey: process.env.PRIVATE_KEY });
    const signer = new SimpleSigner();
    const txBuilder = new TransactionBuilder({ rpcProvider, nonceManager, signer }); // review whether we need to pass the signer here

    const wallet = new Wallet({
        signer,
        txBuilder,
        rpcProvider,
    }, {
        eip155: true,
        freeGas: process.env.IS_GASLESS_NETWORK === "true",
    });

    return wallet;
}
