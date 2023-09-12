# EVM Token Bridge with BЕ

## Description

The goal of this project is to create an EVM Token bridge. It should allow users to bridge any ERC-20 token between two EVM compatible networks.
Acceptance Criteria:
Technological Level with Smart Contracts (Hardhat project)
Minimum 3 contracts:
One contract for the bridge itself
Two contracts for ERC-20 token -> One generic and one wrapped
Unit tests for the bridge contract with > 95% code coverage
Events need to be emitted on each major action from the contracts
Deployment Scripts:
Automatic deployment scripts for desired testnets
Technological level with dApp

## CLI

A simple CLI tool must be created that will interact with the contracts and act as an interface for the bridge.
Simple commands should be supported such as:
lock - receives a target ERC-20 token address and amount to be locked (bridged)
claim - claim an amount of locked tokens from a source chain
burn - burn tokens from the target chain before releasing them to the source
release - release tokens from the target network to the source
Event Listener Service (Indexer)
Indexer should be able to read blocks from a starting point(block)
Indexer should be able to continue from the last processed block when it’s restarted
Indexer should be able to listen for events emitted by the contract
TokenLocked
TokenClaimed
TokenReleased
TokenBurned
Indexer should be able to parse these events
Parsed events should be stored in DB

## API

All endpoints should have proper input validation and error handling
API endpoint for fetching all tokens waiting to be claimed (TokenLocked event)
API endpoint for fetching all tokens waiting to be released
API endpoint for fetching all bridged tokens by wallet address
API endpoint for fetching all bridged ERC-20 tokens
Bonus features
Authentication
Implement authentication between the BE server and the CLiI using Sign-with-Ethereum (https://login.xyz)

- API Login with wallet
  Logout
  Completeness of the project:
  Repository with BE and Contract Implementation
  Contracts deployed on the desired testnet
  BE connected with those contracts
  Short video with the functionalities.
  Suggestion: Please do the project in the following order: contract -> cli -> listener -> api
