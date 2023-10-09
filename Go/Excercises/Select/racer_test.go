package racer

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRacer(t *testing.T){
	t.Run("Before 10 sec", func (t *testing.T)  {
		slowServer := makeDelayedServer(20 * time.Millisecond);
		fastServer := makeDelayedServer(0);
	
		defer slowServer.Close();
		defer fastServer.Close();
	
		want := fastServer.URL;
		got,_ := Racer(slowServer.URL, fastServer.URL);
		if got != want{
			t.Errorf("got %q want %q", got, want);
		}
	});
	t.Run("After 10 sec", func (t *testing.T)  {
		slowServer := makeDelayedServer(11 * time.Second);
		fastServer := makeDelayedServer(12 * time.Second);
	
		defer slowServer.Close();
		defer fastServer.Close();
	
		want := "Timeout";
		_,err := Racer(slowServer.URL, fastServer.URL);
		if err == nil{
			t.Errorf("got %q want %q", err, want);
		}
	});
}


func makeDelayedServer(delay time.Duration) *httptest.Server{
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(delay)
		w.WriteHeader(http.StatusOK)
	}));
}