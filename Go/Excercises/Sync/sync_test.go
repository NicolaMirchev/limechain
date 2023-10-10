package sync

import (
	"sync"
	"testing"
)

func assertCounter(t *testing.T, got *Counter, want int){
	t.Helper();
	if got.Value != want{
		t.Errorf("got %d want %d", got.Value, want);
	}
}
func TestCounter(t *testing.T){
	wantedCount := 1000;
	var wg sync.WaitGroup;
	wg.Add(wantedCount);
	
	counter := Counter{};
	for i := 0; i < wantedCount; i++{
		go func(){
			counter.Inc();
			wg.Done();
		}();
	}
	wg.Wait();

	assertCounter(t, &counter, wantedCount);
}