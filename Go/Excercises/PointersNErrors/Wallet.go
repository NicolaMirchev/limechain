package pointers

import (
	"errors"
	"fmt"
)

var ErrorInsufficientFunds = errors.New("Insufficient funds");

type Bitcoin int;

type Stringer interface{
	String() string;
}

type Wallet struct {
	balance Bitcoin;
}

func (b Bitcoin) String() string{
	return fmt.Sprintf("%d BTC", b);
}

func (w *Wallet) Deposit(amount Bitcoin){
	w.balance += amount;
}

func (w *Wallet) Withdraw(amount Bitcoin) error{
	if(w.balance < amount){
		return ErrorInsufficientFunds;
	}
	w.balance -= amount;
	return nil;
}

func (w *Wallet) Balance() Bitcoin{
	return w.balance;
}