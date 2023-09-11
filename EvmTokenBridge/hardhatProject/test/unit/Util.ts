import { ethers } from "hardhat";

/**
 * Utility func to be used to split signed transaction off-chain
 * @param sig signature to be splitted to v,r and s
 * @returns the passed param splitted to match the standard for v,r,s signature
 */
export function splitSignature(sig: string): {
  r: string;
  s: string;
  v: string;
} {
  const r = sig.slice(0, 66); // 32 bytes (64 characters) for r
  const s = "0x" + sig.slice(66, 130); // 32 bytes (64 characters) for s
  const v = "0x" + sig.slice(130, 132); // 1 byte (2 characters) for v

  return { r, s, v };
}

export async function prepareSignature(
  domainName: string,
  domainVersion: string,
  chainId: number,
  domainVerifyingContract: string,
  signer: string,
  claimer: string,
  amount: number,
  nonce: bigint
) {
  const domainData = {
    name: domainName,
    version: domainVersion,
    chainId: chainId,
    verifyingContract: domainVerifyingContract,
  };

  const types = {
    Claim: [
      { name: "claimer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const value = {
    claimer: claimer,
    amount: amount,
    nonce: nonce,
  };

  let signature = await (
    await ethers.getSigner(signer)
  ).signTypedData(domainData, types, value);

  return splitSignature(signature);
}
