#! /usr/bin/env node
console.log(
  "Hello World This is the first program! this is the first program!"
);

const yargs = require("yargs");
const sourceChainProvider = "";
const destinationChainProvider = "";

const options = yargs
  .usage("Select action to perform on the bridge.")
  .command(
    "lock <address> <amount>",
    "Lock amount of funds on source chain.",
    (yargs) => {
      yargs
        .positional("amount", {
          describe: "The amount to lock",
          type: "string",
        })
        .positional("address", {
          describe: "The address of ERC20 token ",
          type: "string",
        });
    }
  )
  .command(
    "claim <amount>",
    "Claim amount of funds on destination chain.",
    (yargs) => {
      yargs.positional("amount", {
        describe: "The amount to claim",
        type: "string",
      });
    }
  )
  .command("burn <amount>", "Burn funds on destination chain.", (yargs) => {
    yargs.positional("amount", {
      describe: "The amount to burn",
      type: "string",
    });
  })
  .command(
    "release <amount>",
    "Release locked funds on source chain.",
    (yargs) => {
      yargs.positional("amount", {
        describe: "The amount to release",
        type: "string",
      });
    }
  )
  .demandCommand(1, "You must specify one of: lock, claim, burn, release.")
  .help().argv;

// Get the command and amount from the parsed options
const command = options._[0];
const amount = options.amount;

// Perform actions based on the selected command
switch (command) {
  case "lock":
    // Perform lock action with the specified amount
    console.log(`Locking ${amount} on source chain.`);
    // Add your logic here
    break;
  case "claim":
    // Perform claim action with the specified amount
    console.log(`Claiming ${amount} on destination chain.`);
    // Add your logic here
    break;
  case "burn":
    // Perform burn action with the specified amount
    console.log(`Burning ${amount} on destination chain.`);
    // Add your logic here
    break;
  case "release":
    // Perform release action with the specified amount
    console.log(`Releasing ${amount} on source chain.`);
    // Add your logic here
    break;
  default:
    // Handle invalid or unsupported commands
    console.error("Invalid command. Use one of: lock, claim, burn, release.");
}
