# Hedera <-> EVM blockchain bridge

## This is an excercise project to experiment with hedera SDK and HCS (topics)

As you've already read Hashport is a crypto bridge that is responsible for asset transfer between the Hedera network and EVM compatible blockchains (Ethereum, Polygon, etc.). The following tasks are part of the basic concepts used in the Hashport, please complete them:

EVM:

- Create a simple smart contract with a few events in it.
- Create a small app that is listening to the events and records them in a DB.
- The app should keep the state so in case it stops or errors it should start from the last state and do NOT start from the beginning.

Hedera:

- Create a topic.
- Create a script to submit the topic.
- Create a small app that is listening to the topic and sending messages.
- The app should keep the state so in case it stops or errors it should start from the last state and do NOT start from the beginning.

## Architecture:

**Solidity files**

- Bridge contract on source chain
- ERC20 wrapper on destination chain
  **GO files**
- Hedera:
  - Listener and submitter for topics
- Main application signing mint/unlock transaction messages for both chains
- Persistence module to write/read data from "db"

**Additional Notes**
