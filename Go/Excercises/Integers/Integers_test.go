package integers

import "testing"

func TestAdder(t *testing.T){
	sum := Add(5, 5);
	expected := 10;

	if sum != expected {
		t.Errorf("expected %d but got %d", expected, sum);
	}
}