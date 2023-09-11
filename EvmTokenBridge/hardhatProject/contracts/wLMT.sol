// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


/** 
 * @author  . Nikola Mirchev
 * @title   . Wrapped Lime Token
 * @dev     . The owner of the contract is the relyer, who track the authenticity of the original assets being propperly locked and unlocked.
 * @notice  . The wLMT contract is a ERC20 token that is minted when LMT is deposited on the source chain and burned when LMT should be is redeemed.
 */

contract wLMT is ERC20Burnable, Ownable, EIP712{

    bytes32 private constant MINT_TYPEHASH =
        keccak256("Mint(address claimer,uint256 amount, uint256 nonce)");
    
    // @dev    . Nonces for replay protection. Key is the address, which should recieve the minted tokens. The provider signes the nonce for given address.
    mapping(address => uint256) public nonces;

    event TokenClaimed(address indexed _claimer, uint256 _amount);
    event TokenBurned(address indexed _burner, uint256 _amount);
    constructor() ERC20Burnable() Ownable() ERC20("Wrapped LMT", "wLMT") EIP712("Wrapped LMT", "1") {
    }

    /**
     * @notice  . User mints himself wLMT tokens using signature from trusted validator.
     * @dev     . The signature is generated by the validator using the claimer address and the amount of LMT to be minted.
     * @dev     . Currenly we don't have deadline for the signature, but it is good to consider one.
     * @param   claimer  . The address of the user, who has locked his funds on the first blockchain and is claiming the wLMT tokens.
     * @param   amount  . The amount of LMT to be minted.
     * @param   r  . first part of the sig
     * @param   s  . second part of the sig
     * @param   v  . recovery identifier
     */
    function mintWithSignature(address claimer, uint256 amount, uint8 v, bytes32 r, bytes32 s) external {
        bytes32 structHash  = keccak256(abi.encode(MINT_TYPEHASH, claimer, amount, nonces[claimer]));
        nonces[claimer]++;
        
        bytes32 digest = _hashTypedDataV4(structHash);
        
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == owner(), "wLMT Mint: Invalid signature");
 

        _mint(claimer, amount);
        emit TokenClaimed(claimer, amount);
    }

    function burn(uint256 amount) override public {
        super.burn(amount);
        emit TokenBurned(msg.sender, amount);
    }
}