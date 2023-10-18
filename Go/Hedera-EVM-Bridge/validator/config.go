package main

import (
	"fmt"
	"os"

	"github.com/hashgraph/hedera-sdk-go/v2"
	"github.com/joho/godotenv"
)

const dbPath = "./db.txt";

func main() {
    client := configClient();
    db := LoadDb(dbPath);
    if db.BridgeId == "" {
        bridgeId := configAccount(client);
        db.AddBridgeID(bridgeId.String());
        db.Save(dbPath);
    } else {
        fmt.Println("Bridge ID already exists");
        // Proccess topic messages, which we haven't
    }

    // See how to obtain topic ID from string id
    // subscribeToTopic(db.TopicId, client);
    // Start listening to topic
}

// Configure hashgraph client from .env file
func configClient() *hedera.Client{
    err := godotenv.Load(".env")
    if err != nil {
        panic(fmt.Errorf("Unable to load environment variables from .env file. Error:\n%v\n", err))
    }

    myAccountId, err := hedera.AccountIDFromString(os.Getenv("MY_ACCOUNT_ID"))
    if err != nil {
        panic(err)
    }

    myPrivateKey, err := hedera.PrivateKeyFromString(os.Getenv("MY_PRIVATE_KEY"))
    if err != nil {
        panic(err)
    }

    client := hedera.ClientForTestnet()
    client.SetOperator(myAccountId, myPrivateKey)

    client.SetDefaultMaxTransactionFee(hedera.HbarFrom(100, hedera.HbarUnits.Hbar))
    client.SetDefaultMaxQueryPayment(hedera.HbarFrom(50, hedera.HbarUnits.Hbar))
    return client;
}

// Create account and return account ID
func configAccount(client *hedera.Client) hedera.AccountID{
    newAccountPrivateKey, err := hedera.PrivateKeyGenerateEd25519()

    if err != nil {
     panic(err)
    }

    newAccountPublicKey := newAccountPrivateKey.PublicKey()

    //Create new account and assign the public key
    newAccount, err := hedera.NewAccountCreateTransaction().
    SetKey(newAccountPublicKey).
    SetInitialBalance(hedera.HbarFrom(1000, hedera.HbarUnits.Tinybar)).
    Execute(client);

    if err != nil {
        panic(err)
    }
    accountReciept,err := newAccount.GetReceipt(client);

    if err != nil {
        panic(err)
    }
    bridgeId := accountReciept.AccountID;
    return *bridgeId;
}

// Create topic and return topic ID
func createTopic(client *hedera.Client) *hedera.TopicID{
    transaction := hedera.NewTopicCreateTransaction();

    txResponse, err := transaction.Execute(client);

    if err != nil {
        panic(err)
    }

    topicRecepit, err := txResponse.GetReceipt(client);

    if err != nil {
        panic(err);
    }
    topicId := topicRecepit.TopicID;
    return topicId;
}

// Subscribe to topic and write data to db
func subscribeToTopic(topicID hedera.TopicID, client *hedera.Client){
    _, err := hedera.NewTopicMessageQuery().
    SetTopicID(topicID).
    Subscribe(client, func(message hedera.TopicMessage) {
        go writeToDb(dbPath, message);
    })

    if err != nil {
        panic(err)
    }
}

func submitMessageToTopic(topicID hedera.TopicID, client *hedera.Client){
    submitMessage, err := hedera.NewTopicMessageSubmitTransaction().
    SetMessage([]byte("Hello, HCS!")).
    SetTopicID(topicID).
    Execute(client)

    if err != nil {
        println(err.Error(), ": error submitting to topic")
        return
    
    }
    receipt, err := submitMessage.GetReceipt(client)
        
        // Log the transaction status
	transactionStatus := receipt.Status
	fmt.Println("The transaction message status " + transactionStatus.String())   
}

func writeToDb(dbPath string, message hedera.TopicMessage){
    // Write to db
}