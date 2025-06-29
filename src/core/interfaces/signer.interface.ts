export interface Signer {
    getAddress(): string;
    getPublicKey(): string;
    signWithRecoverableECDSA(digest: any): any;

    // getAddress(): Promise<string>;
    // getPublicKey(): Promise<string>;
    // signWithRecoverableECDSA(digest: any): Promise<any>;
}

// export interface HDSigner {}
