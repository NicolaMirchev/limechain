package racer

import (
	"fmt"
	"net/http"
	"time"
)

func ping(url string) chan struct{}{
	ch := make(chan struct{});
	go func(){
		http.Get(url);
		close(ch);
	}();
	return ch;
}


func Racer(a, b string) (string, error){
	select {
		case <- ping(a):
			return a, nil;
		case <- ping(b):
			return b, nil;
		case <- time.After(10 * time.Second):
			return "", fmt.Errorf("Timeout");
	}
}

