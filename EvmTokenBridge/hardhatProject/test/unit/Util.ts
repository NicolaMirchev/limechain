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
/**
 * Utility func to be used to prepare the signature off-chain. Struct is defined to match the typed data, which we use for the bridge functionallity
 * to validate ownership of the tokens and amount.
 * @param domainName name of the domain
 * @param domainVersion version of the domain
 * @param chainId chainId of the domain
 * @param domainVerifyingContract address of the domain
 * @param signer address of the signer
 * @param claimer address of the claimer
 * @param amount amount of tokens to be locked
 * @param nonce nonce of the claimer
 * @returns the splitted signature
 * */
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

export async function prepareSignatureRelease(
  domainName: string,
  domainVersion: string,
  chainId: number,
  domainVerifyingContract: string,
  tokenAddress: string,
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
      { name: "tokenAddress", type: "address" },
      { name: "claimer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const value = {
    tokenAddress: tokenAddress,
    claimer: claimer,
    amount: amount,
    nonce: nonce,
  };

  let signature = await (
    await ethers.getSigner(signer)
  ).signTypedData(domainData, types, value);

  return splitSignature(signature);
}
