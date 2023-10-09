package main

import (
	"bytes"
	"reflect"
	"testing"
	"time"
)

func TestCountdown(t *testing.T){
	t.Run("Test countdown prind desired output", func(t *testing.T){
		buffer := bytes.Buffer{};
		Countdown(&buffer, &StandartSleeper{1 * time.Second, time.Sleep});
		got := buffer.String();
		want := `3
2
1
Go!`;
	
		if got != want {
			t.Errorf("got %q want %q", got, want);
		}
	});
	t.Run("Test countdown sleep between printing", func(t *testing.T){
		spyCountdownOperations := &SpyCountdownOperations{};

		Countdown(spyCountdownOperations,spyCountdownOperations);
		want := []string{"write",
		"sleep",
		"write",
		"sleep",
		"write",		
		"sleep",
		"write"}
		
		if !reflect.DeepEqual(want, spyCountdownOperations.Calls){
			t.Errorf("wanted calls %v got %v", want, spyCountdownOperations.Calls);
		}
	});

}