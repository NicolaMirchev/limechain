package main

import (
	"encoding/json"
	"os"
)



type Database struct{
	BridgeId string `json:"bridgeId"`
	TopicId string `json:"topicId"`
	Transactions []Transaction `json:"transactions"`
	LastProcceesedTopic string `json:"lastProcessedTopic"`
}

func (db *Database) AddBridgeID(id string) {
    db.BridgeId = id
}

func (db *Database) AddTopicID(id string) {
	db.TopicId = id
}
func (db *Database) AddTransaction(transaction Transaction) {
	db.Transactions = append(db.Transactions, transaction);
}
func (db *Database) Save(filename string) error {
    data, err := json.MarshalIndent(db, "", "    ")
    if err != nil {
        return err
    }
    err = os.WriteFile(filename, data, 0644)
    if err != nil {
        return err
    }

    return nil

}

type Transaction struct {
	TopicNumber string `json:"transactionId"`
	From string `json:"from"`
	Amount string `json:"amount"`
	SigHash string `json:"sigHash"`
}

func LoadDb(filename string) Database{
	var db Database;
	file, err := os.ReadFile(filename);
	if err != nil {
		panic(err);
	}
	json.Unmarshal(file, &db);
	return db;
}



