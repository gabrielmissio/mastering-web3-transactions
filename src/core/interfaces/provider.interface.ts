// TODO: Review error handling logic later...
export interface RpcProvider {
    call(args: any): Promise<[any, Error | null]>;
    getNetworkInfo(): Promise<[any, Error | null]>;
    getBlockNumber(): Promise<[any, Error | null]>;
    getTransactionCount(address: string): Promise<[any, Error | null]>;
    sendRawTransaction(signedRawTx: string): Promise<[any, Error | null]>;
    estimateGasPrice(): Promise<[any, Error | null]>;
    estimateGasUsage(args: any): Promise<[any, Error | null]>;
    estimateFeeData(): Promise<[any, Error | null]>;
}
