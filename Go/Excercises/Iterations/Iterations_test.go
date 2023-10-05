package iterations

import (
	"testing"
)


func TestRepeat(t *testing.T){
	
	result := Repeat("a", 10);
	expected := "aaaaaaaaaa"; 

	if result != expected {
		t.Errorf("expected %q but got %q", expected, result);
	}
}

func BenchmarkRepeat(b *testing.B){
	for i := 0; i< b.N; i++ {
		Repeat("a", i);
	}
}