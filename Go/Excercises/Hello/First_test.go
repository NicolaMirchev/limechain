package main

import (
	"testing"
)
const (spanish, english, bulgarian = "Spanish", "English", "Bulgarian");
func TestHello(t *testing.T){
	t.Run("Say hello to the Maan", func (t *testing.T){
		got := Hello("Maaan", spanish);
		expected := "Holla, Maaan";
	
		HelperAssert(t, expected, got);
	})
	t.Run("Say hello to me", func (t *testing.T){
		got := Hello("Me", bulgarian);
		expected := "Zdr, Me";
		HelperAssert(t, expected, got);
	})
}

func HelperAssert(t testing.TB, expected, got string){
	t.Helper();
	if got != expected {
		t.Errorf("got %q expected %q", got, expected);
	}
}