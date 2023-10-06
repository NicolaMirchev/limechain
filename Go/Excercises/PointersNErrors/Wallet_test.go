package pointers

import "testing"

func TestWallet(t *testing.T){

	assertBalance := func(t testing.TB, w Wallet,b Bitcoin){
		t.Helper();
		got := w.Balance();
		if got != b {
			t.Errorf("got %s want %s", got, b);
		}
	}
	t.Run("Deposit", func(t *testing.T){
	wallet := Wallet{};
	wallet.Deposit(10);
	assertBalance(t, wallet, Bitcoin(10));
	});

	t.Run("Withdraw", func(t *testing.T){

		assertErrors := func(t testing.TB, e error, expectedError error ){
			t.Helper();
			if e == nil {
				t.Fatal("Wanted an error but didn't get one");
			}
			if e.Error() != expectedError.Error() {
				t.Errorf("got %q, want %q", e.Error(), expectedError.Error());
			}
		}

		t.Run("Withdraw with funds", func(t *testing.T){
			wallet := Wallet{balance: Bitcoin(20)};
			wallet.Withdraw(10);
			assertBalance(t, wallet, Bitcoin(10));
		});
		t.Run("Withdraw error ", func(t *testing.T){
			startingBalance := Bitcoin(20)
			wallet := Wallet{startingBalance}
			err := wallet.Withdraw(Bitcoin(100))

			assertErrors(t, err, ErrorInsufficientFunds);
			assertBalance(t, wallet, Bitcoin(20));		
		});
		
	});

	

}
