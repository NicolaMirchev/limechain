package maps

import "testing"


func MapsTest(t *testing.T){
	dict := Dictionary{"data": "some data"};
	t.Run("Search for a key that exist", func(t *testing.T){
		got,_ := Search(dict, "data");
		want := "some data";
	
		if got != want {
			t.Errorf("got %s want %s", got, want);
		}
	});
	t.Run("Search for a key that doesn't exist", func(t *testing.T){
		_,error := Search(dict, "key");

		if error == nil {
			t.Errorf("Expected an error");
		}
	});

	t.Run("Add a new key", func(t *testing.T){
		dict.Add("key", "value");
		got,_ := Search(dict, "key");
		want := "value";

		if got != want {
			t.Errorf("got %s want %s", got, want);
		}
	});
}