import {
    Wallet,
    SimpleSigner,
    SimpleNonceManager,
    JsonHttpProvider,
    TransactionBuilder,
} from "../src/index"

const rpcProvider = new JsonHttpProvider({ url: process.env.RPC_URL });
const nonceManager = new SimpleNonceManager({ provider: rpcProvider });

export function setupWallet(privateKey?: string): Wallet {
    const signer = new SimpleSigner({ privateKey });
    // TODO: Review TransactionBuilder args...
    const txBuilder = new TransactionBuilder({ rpcProvider, nonceManager, signer });

    const wallet = new Wallet({
        signer,
        txBuilder,
        rpcProvider,
    }, {
        eip155: true,
        freeGas: process.env.IS_GASLESS_NETWORK === "true",
        defaultTxType: "type2", // Default to type2 transactions
    });

    return wallet;
}

// Anvil's default first account private key (WARNING: For development use only - never use in production)
export const ANVIL_DEFAULT_FIRST_ACCOUNT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const EIP7702_BATCH_AND_SPONSORED_TXS_CONTRACT_ADDRESS = "0x69e2C6013Bd8adFd9a54D7E0528b740bac4Eb87C"; // Replace with actual contract address

export const USDC_TOKEN_CONTRACT_ADDRESS = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
