// server.cjs

require("dotenv").config();
const ethers = require("ethers");
var express = require("express");
const fs = require("fs");
const app = express();
const db = require("./dbConfig.cjs");

// ------ Environment config ------

const PROVIDER_KEY = process.env.PROVIDER_KEY;
const SEPOLIA_RPC_WEB_SOCKET = process.env.SEPOLIA_WEB_SOCKET;
const MUMBAI_RPC_WEB_SOCKET = process.env.MUMBAI_WEB_SOCKET;
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS;
const port = process.env.PORT || 3000;

const destinationDomainVersion = "1";
const mumbaiChainId = 80001;

const sourceDomainName = "LMTBridge";
const sourceDomainVersion = "1";
const sepoliaChainId = 11155111;

// ------ Web3 config ------
const abiPath = "../hardhatProject/artifacts/contracts";
const rawDataBridgeContract = fs.readFileSync(
  abiPath + "/LMTBridge.sol/LMTBridge.json"
);
const bridgeAbi = JSON.parse(rawDataBridgeContract).abi;
const sourceProvider = new ethers.WebSocketProvider(SEPOLIA_RPC_WEB_SOCKET);
const bridgeContract = new ethers.Contract(
  BRIDGE_ADDRESS,
  bridgeAbi,
  sourceProvider
);

const sourceSigner = new ethers.Wallet(PROVIDER_KEY, sourceProvider);

// Destination chain
const rawDatawLMTContract = fs.readFileSync(
  abiPath + "/wERC20.sol/wERC20.json"
);
const wERC20Abi = JSON.parse(rawDatawLMTContract).abi;
const destinationProvider = new ethers.WebSocketProvider(MUMBAI_RPC_WEB_SOCKET);
const destinationSigner = new ethers.Wallet(PROVIDER_KEY, destinationProvider);
const contracts = [];

const dbValues = {
  bridgedAmount: "bridgedAmount",
  lockedAmount: "lockedAmount",
  releasedAmount: "releasedAmount",
  burnedAmount: "burnedAmount",
  actionSignature: "actionSignature",
  used: "used",
  v: "v",
  r: "r",
  s: "s",
};
const usersRef = db.ref("users");
const sourceLastProccessedBlock = db.ref("sourceLastProccessedBlock");
const destinationlastProccessedBlockRef = db.ref(
  "destinationsLastProccessedBlock"
);
const blockSource = process.argv[2];
const blockDestination = process.argv[3];

handleEventsFromBlockSource(blockSource);
handleEventDestinationAndConstructTokens(blockDestination);
// ------ Event listeners ------

// We can add one more event listener, which will listen for tokens added and add them to contracts[].
// Currently, if the token is new, we first construct it and add it to the contracts[] array.
// Source chain
bridgeContract.on("TokenLocked", async (token, user, amount, event) => {
  const currentUserRef = usersRef.child(user).child("tokens").child(token);

  // Here we should sign a transaction to mint tokens on the destination chain from the provider and return the signature.
  const destinationContract =
    await bridgeContract.destinationChainTokenAddresses(token);
  // If the token address is new, we should create new contract.
  if (!contracts.some((contract) => contract.token === destinationContract)) {
    addToken(token, destinationContract);
    await db
      .ref("contracts")
      .set({ source: token, destination: destinationContract });
  }
  wERC20 = contracts.find(
    (contract) => contract.token === destinationContract
  ).contract;

  const { r, s, v } = await prepareSignature(
    await wERC20.name(),
    destinationDomainVersion,
    mumbaiChainId,
    destinationContract,
    destinationSigner,
    user,
    amount,
    await wERC20.nonces(user)
  );
  try {
    const locked = await currentUserRef.child(dbValues.lockedAmount).get();

    if (locked.exists()) {
      currentUserRef
        .child(dbValues.lockedAmount)
        .set(locked.val() + Number(amount));
    } else {
      currentUserRef.child(dbValues.lockedAmount).set(Number(amount));
      currentUserRef.child(dbValues.bridgedAmount).set(0);
      currentUserRef.child(dbValues.releasedAmount).set(0);
      currentUserRef.child(dbValues.burnedAmount).set(0);
    }

    currentUserRef
      .child(dbValues.actionSignature)
      .child(dbValues.used)
      .set(false);
    currentUserRef.child(dbValues.actionSignature).child(dbValues.v).set(v);
    currentUserRef.child(dbValues.actionSignature).child(dbValues.r).set(r);
    currentUserRef.child(dbValues.actionSignature).child(dbValues.s).set(s);
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  setLastProccessedBlock("source");
  console.log("R, s, v ", r, s, v);
});
// ------ Event listeners ------
bridgeContract.on("TokenReleased", async (token, user, amount, event) => {
  try {
    const currentUserRef = usersRef.child(user).child("tokens").child(token);
    currentUserRef
      .child(dbValues.releasedAmount)
      .transaction((currentValue) => {
        return currentValue + Number(amount);
      });
    currentUserRef
      .child(dbValues.actionSignature)
      .child(dbValues.used)
      .set(true);

    // Write data to db.
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  setLastProccessedBlock("source");
});

async function setLastProccessedBlock(chain) {
  let lastBlock;
  if (chain == "source") {
    lastBlock = await sourceProvider.getBlockNumber();
    await sourceLastProccessedBlock.set(lastBlock);
  } else if (chain == "destination") {
    lastBlock = await destinationProvider.getBlockNumber();
    await destinationlastProccessedBlockRef.set(lastBlock);
  }
}

async function handleEventsFromBlockSource(fromSourceBlockNumber) {
  const lastProccessedBlock = (await sourceLastProccessedBlock.get()).val();
  if (!fromSourceBlockNumber) {
    fromSourceBlockNumber = lastProccessedBlock;
  }
  const lastXblocks =
    (await sourceProvider.getBlockNumber()) - fromSourceBlockNumber;
  // If block number isn't provided, we get the latest block number.

  const lockedEvents = await bridgeContract.queryFilter(
    "TokenLocked",
    -lastXblocks
  );

  const releasedEvents = await bridgeContract.queryFilter(
    "TokenReleased",
    -lastXblocks
  );
  let lockedLastBlock = 0;
  lockedEvents.forEach(async (event) => {
    const tokenAddress = event.args[0];
    const user = event.args[1];
    const amount = event.args[2];
    if (lastProccessedBlock < event.blockNumber) {
      lockedLastBlock = event.blockNumber;
      await usersRef
        .child(user)
        .child("tokens")
        .child(tokenAddress)
        .child(dbValues.lockedAmount)
        .transaction((currentValue) => {
          return currentValue + Number(amount);
        });
    }
  });
  let releasedLastBlock = 0;
  releasedEvents.forEach(async (event) => {
    const tokenAddress = event.args[0];
    const user = event.args[1];
    const amount = event.args[2];
    if (lastProccessedBlock < event.blockNumber) {
      releasedLastBlock = event.blockNumber;
      usersRef
        .child(user)
        .child("tokens")
        .child(tokenAddress)
        .child(dbValues.releasedAmount)
        .transaction((currentValue) => {
          return currentValue + Number(amount);
        });
    }
  });

  if (lockedLastBlock > 0 || releasedLastBlock > 0) {
    db.ref("sourceLastProccessedBlock").set(
      lockedLastBlock > releasedLastBlock ? lockedLastBlock : releasedLastBlock
    );
  }
}

async function handleEventsFromBlockDestination(
  fromDestinationBlockNumber,
  wERC20,
  sourceTokenAddress
) {
  const lastProccessedBlock = (
    await destinationlastProccessedBlockRef.get()
  ).val();
  // If block number isn't provided, we get the latest block number.
  if (!fromDestinationBlockNumber) {
    fromDestinationBlockNumber = lastProccessedBlock;
  }
  const lastXblocks =
    (await sourceProvider.getBlockNumber()) - fromDestinationBlockNumber;

  const claimedEvents = await wERC20.queryFilter("TokenClaimed", -lastXblocks);

  const releasedEvents = await wERC20.queryFilter("TokenBurned", -lastXblocks);

  let claimedLastBlock = 0;
  claimedEvents.forEach(async (event) => {
    const user = event.args[1];
    const amount = event.args[2];
    if (lastProccessedBlock < event.blockNumber) {
      claimedLastBlock = event.blockNumber;
      await usersRef
        .child(user)
        .child("tokens")
        .child(sourceTokenAddress)
        .child(dbValues.bridgedAmount)
        .transaction((currentValue) => {
          return currentValue + Number(amount);
        });
    }
  });
  let burnedLastBlock = 0;
  releasedEvents.forEach(async (event) => {
    const user = event.args[1];
    const amount = event.args[2];
    if (lastProccessedBlock < event.blockNumber) {
      burnedLastBlock = event.blockNumber;
      usersRef
        .child(user)
        .child("tokens")
        .child(sourceTokenAddress)
        .child(dbValues.burnedAmount)
        .transaction((currentValue) => {
          return currentValue + Number(amount);
        });
    }
  });

  if (claimedLastBlock > 0 || burnedLastBlock > 0) {
    destinationlastProccessedBlockRef.set(
      claimedLastBlock > burnedLastBlock ? claimedLastBlock : burnedLastBlock
    );
  }
}
async function handleEventDestinationAndConstructTokens(blockDestination) {
  const snap = await db.ref("contracts").once("value");

  snap.forEach(async (snapshot) => {
    const { source, destination } = snap.val();

    if (source && destination) {
      const wERC20 = new ethers.Contract(
        destination,
        wERC20Abi,
        destinationProvider
      );
      await addToken(source, destination);
      handleEventsFromBlockDestination(blockDestination, wERC20, source);
    }
  });
}
async function addToken(sourceAddress, destinationAddress) {
  const wERC20 = new ethers.Contract(
    destinationAddress,
    wERC20Abi,
    destinationProvider
  );
  contracts.push({ token: destinationAddress, contract: wERC20 });

  wERC20.on(
    "TokenClaimed",
    async (claimedTokenAddress, claimer, amount, event) => {
      try {
        await currentUserRef
          .child(dbValues.bridgedAmount)
          .transaction((currentValue) => {
            return currentValue + Number(amount);
          });

        await currentUserRef
          .child(dbValues.actionSignature)
          .child(dbValues.used)
          .set(true);
      } catch (error) {
        console.log("Errror trying to input event data into db: " + error);
      }
      console.log("Claimed event: ", claimer, amount);
      setLastProccessedBlock("destination");
    }
  );
  wERC20.on(
    "TokenBurned",
    async (burnedTokenAddress, burner, burnedAmount, event) => {
      const { r, s, v } = await prepareSignatureUnlock(
        sourceDomainName,
        sourceDomainVersion,
        sepoliaChainId,
        BRIDGE_ADDRESS,
        sourceAddress,
        sourceSigner,
        burner,
        burnedAmount,
        await bridgeContract.nonces(burner)
      );
      try {
        await currentUserRef
          .child(dbValues.burnedAmount)
          .transaction((currentValue) => {
            return currentValue + Number(amount);
          });
        currentUserRef.child(dbValues.actionSignature).child(dbValues.v).set(v);
        currentUserRef.child(dbValues.actionSignature).child(dbValues.r).set(r);
        currentUserRef.child(dbValues.actionSignature).child(dbValues.s).set(s);
        currentUserRef
          .child(dbValues.actionSignature)
          .child(dbValues.used)
          .set(false);
      } catch (error) {
        console.log("Errror trying to input event data into db: " + error);
      }
      setLastProccessedBlock("destination");
    }
  );
}

// ------ API endpoints ------
app.get("/for-claim", async (req, res) => {
  try {
    const usersRefSnapshot = await usersRef.once("value");
    const users = [];

    usersRefSnapshot.forEach((userSnapshot) => {
      const user = userSnapshot.val();

      // Check if the user has tokens
      if (user.tokens) {
        // Iterate through the user's tokens
        Object.entries(user.tokens).forEach(([tokenId, tokenData]) => {
          console.log("Token data: ", tokenData);
          if (tokenData.bridgedAmount < tokenData.lockedAmount) {
            users.push({
              userId: userSnapshot.key,
              tokenId,
              tokenData,
            });
          }
        });
      }
    });

    // Send the users array as a response
    res.send(users);
  } catch (error) {
    console.log("Error trying to get tokens for claim: ", error);
    // Handle the error and send an appropriate response
    res.status(500).send("Internal Server Error");
  }
});
app.get("/for-release", async (req, res) => {
  try {
    const userSnapshot = await usersRef.once("value");
    const users = [];
    userSnapshot.forEach((snapshot) => {
      const user = snapshot.val();

      // Check if the user has tokens
      if (user.tokens) {
        // Iterate through the user's tokens
        Object.entries(user.tokens).forEach(([tokenId, tokenData]) => {
          if (tokenData.releasedAmount < tokenData.burnedAmount) {
            users.push({
              userId: snapshot.key,
              tokenId,
              tokenData,
            });
          }
        });
      }
    });
    res.send(users);
  } catch (error) {
    console.log("Error trying to get tokens for release: ", error);
    // Handle the error and send an appropriate response
    res.status(500).send("Internal Server Error");
  }
});

app.get("/all-bridged/:user", async (req, res) => {
  try {
    const user = req.params.user;
    const usersSnapshot = await usersRef.once("value");
    const result = { user: usersSnapshot.val(), tokens: [] };
    usersSnapshot.forEach((snapshot) => {
      if (snapshot.val() == user) {
        if (snapshot.val().tokens) {
          // Iterate through the user's tokens
          Object.entries(user.tokens).forEach(([tokenId, tokenData]) => {
            if (tokenData.bridgedAmount > 0) {
              result.tokens.push({
                tokenId,
              });
            }
          });
        }
      }
    });
    res.send(result);
  } catch (error) {
    console.log("API error obtaining user bridged tokens" + error);
    // Handle the error and send an appropriate response
    res.status(500).send("Internal Server Error");
  }
});

app.get("/all-bridged-tokens", async (req, res) => {
  try {
    const userSnapshot = await usersRef.once("value");
    let result = [];
    userSnapshot.forEach((snapshot) => {
      const user = snapshot.val();
      if (user.tokens) {
        // Iterate through the user's tokens
        Object.entries(user.tokens).forEach(([tokenId, tokenData]) => {
          if (tokenData.bridgedAmount > 0) {
            result.push({
              tokenId,
            });
          }
        });
      }
    });

    res.send(result);
  } catch (error) {
    console.log("Error trying to get all bridged tokens " + error);
    // Handle the error and send an appropriate response
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log("App is running on port: ", port);
});

/**
 * Utility func to be used to split signed transaction off-chain
 * @param sig signature to be splitted to v,r and s
 * @returns the passed param splitted to match the standard for v,r,s signature
 */
function splitSignature(sig) {
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
async function prepareSignature(
  domainName,
  domainVersion,
  chainId,
  domainVerifyingContract,
  signer,
  claimer,
  amount,
  nonce
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
  console.log("Domain data: ", domainData);
  console.log("Signer: ", signer);
  console.log("Value: ", value);
  let signature = await signer.signTypedData(domainData, types, value);
  console.log("Signature: ", signature);
  return splitSignature(signature);
}

async function prepareSignatureUnlock(
  domainName,
  domainVersion,
  chainId,
  domainVerifyingContract,
  tokenAddress,
  signer,
  claimer,
  amount,
  nonce
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
  console.log("Domain data: ", domainData);
  console.log("Signer: ", signer);
  console.log("Value: ", value);
  let signature = await signer.signTypedData(domainData, types, value);
  return splitSignature(signature);
}
