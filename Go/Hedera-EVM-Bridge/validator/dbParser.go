package main

import (
	"encoding/json"
	"fmt"
	"os"
)

// DB part:

type Database struct {
	BridgeId            string        `json:"bridgeId"`
	TopicId             string        `json:"topicId"`
	Transactions        []Transaction `json:"transactions"`
	LastProcceesedTopic uint64        `json:"lastProcessedTopic"`
}

func (db *Database) AddBridgeID(id string) {
	db.BridgeId = id
}

func (db *Database) AddTopicID(id string) {
	db.TopicId = id
}
func (db *Database) AddTransaction(transaction Transaction) {
	db.Transactions = append(db.Transactions, transaction)
}
func (db *Database) SetLastProcessedTopic(topicSequence uint64) {
	db.LastProcceesedTopic = topicSequence
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
	SequenceNumber uint64 `json:"transactionId"`
	From           string `json:"from"`
	Amount         string `json:"amount"`
	SigHash        string `json:"sigHash"`
}

func LoadDb(filename string) *Database {
	var data Database
	fmt.Println("Loading database...")

	// Try to read the file
	file, err := os.ReadFile(filename)
	if err != nil {
		data = Database{}
	}

	// Try to unmarshal the JSON
	if err := json.Unmarshal(file, &data); err != nil {
		// If unmarshal fails, create an empty Database struct
		data = Database{}
	}

	return &data
}
