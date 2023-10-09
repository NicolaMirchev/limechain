package main

import (
	"fmt"
	"io"
	"os"
	"time"
)


func main(){
	standartSleeper := StandartSleeper{1 * time.Second, time.Sleep};
	Countdown(os.Stdout, &standartSleeper);
}
type StandartSleeper struct {
	duration time.Duration;
	sleep func(time.Duration);
}
func (s *StandartSleeper) Sleep(){
	s.sleep(s.duration);
}

type Sleeper interface {
	Sleep();
}
type SpyCountdownOperations struct {
	Calls []string;
}

const sleep = "sleep";
const write = "write";
func (s *SpyCountdownOperations) Sleep(){
	s.Calls = append(s.Calls, sleep);
}
func (s *SpyCountdownOperations) Write([]byte) (n int, e error){
	s.Calls = append(s.Calls, write);
	return;
}

func Countdown(w io.Writer, s Sleeper){
	for i := 3; i > 0; i-- {
		fmt.Fprintf(w, "%d\n", i);
		s.Sleep();
	}
	fmt.Fprintf(w, "Go!");
}