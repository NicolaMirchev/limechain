package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"sync"

	"github.com/hashgraph/hedera-sdk-go/v2"
	"github.com/joho/godotenv"
)

type TransferData struct {
    From    string `json:"from"`
    Amount  string `json:"amount"`
    SigHash string `json:"sigHash"`
}

const dbPath = "./db.txt";
var db = LoadDb(dbPath);

func main() {
    client := configClient();
    var topicId hedera.TopicID;
    if db.TopicId == "" {
        topicId = *createTopic(client);
        db.AddTopicID(topicId.String());
    } else {
        topicId,_ = hedera.TopicIDFromString(db.TopicId);
    }
    if db.BridgeId == "" {
        bridgeId := configAccount(client);
        db.AddBridgeID(bridgeId.String());
    } 
    fmt.Printf("Bridge ID: %s\n Topic ID: %s\n", db.BridgeId, db.TopicId);

    // Start listening to topic

    var wg sync.WaitGroup;

    subscribeToTopic(db, topicId, client, &wg);

    arg := os.Args[1]
	number, err := strconv.ParseInt(arg, 10,64)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

    for i := 0; i < int(number) ; i++ {
        wg.Add(1);
        transfer := TransferData{
            From: "0x123" + fmt.Sprintf("%d", i),
            Amount: "100",
            SigHash: "0x123100" + fmt.Sprintf("%d", i),
        }
        submitMessageToTopic(topicId, client, transfer);
    }
    wg.Wait();
    
    db.Save(dbPath);
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
func configAccount(client *hedera.Client) *hedera.AccountID{
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
    return bridgeId;
}

// Create topic and return topic ID
func createTopic(client *hedera.Client) *hedera.TopicID{
    transaction := hedera.NewTopicCreateTransaction();
    
    fmt.Println("Creating new topic.");
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

func serializeToJSON(transactionData TransferData) ([]byte) {
    result, err := json.Marshal(transactionData)
    if err != nil {
        panic(err);
    }
	return result;
}

func deserializeFromJSON(data []byte) (TransferData) {
    var result TransferData;
    err := json.Unmarshal(data, &result);
    if err != nil {
        panic(err);
    }
    return result;
}

// Subscribe to topic and write data to db
func subscribeToTopic(db *Database, topicID hedera.TopicID, client *hedera.Client, wg *sync.WaitGroup){
    _, err := hedera.NewTopicMessageQuery().
    SetTopicID(topicID).
    Subscribe(client, func(message hedera.TopicMessage)  {
          sequenceNumber := message.SequenceNumber;
        fmt.Printf("Received message %d:\n", sequenceNumber);
        if db.LastProcceesedTopic < sequenceNumber {
            wg.Done();
            fmt.Println("Writing data to db...");
            writeToDb(db, message); 
        }
    })

    if err != nil {
        panic(err)
    }

}
// Submit message to topic for corresponding trasfer which occured
func submitMessageToTopic(topicID hedera.TopicID, client *hedera.Client, message TransferData){
    fmt.Println("Submitting new topic message.");
    submitTrx, err := hedera.NewTopicMessageSubmitTransaction().
    SetMessage([]byte(serializeToJSON(message))).
    SetTopicID(topicID).
    Execute(client);

    if err != nil{
        println(err.Error(), ": error executing topic message submit transaction");
        return
    }
    receipt, err := submitTrx.GetReceipt(client)
    
        // Log the transaction status
	transactionStatus := receipt.Status
	fmt.Println("The transaction message status " + transactionStatus.String())   
}
func writeToDb(db *Database, message hedera.TopicMessage){
    sequenceNumber := message.SequenceNumber;
    contents := message.Contents;  
    transferData := deserializeFromJSON(contents);
    transaction := Transaction{
        SequenceNumber: sequenceNumber,
        From: transferData.From,
        Amount: transferData.Amount,
        SigHash: transferData.SigHash,
    }
    db.AddTransaction(transaction);
    db.SetLastProcessedTopic(sequenceNumber);
}


// DB part:


