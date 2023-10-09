package concurrency

import (
	"reflect"
	"testing"
	"time"
)

type MockWebsiteChecker struct{};
func (mwc MockWebsiteChecker) CheckWebsite(url string) bool{
	time.Sleep(20 * time.Millisecond);
	if url == "http://golang.org" {
		return false;
	} else {
		return true;
	}
}


func testWebsiteChecker(t *testing.T){
	t.Run("Test website checker", func(t *testing.T){
		websites := []string{"http://google.com", "http://facebook.com", "http://golang.org"};
		mockWebsiteChecker := MockWebsiteChecker{};
		result := checkWebsites(mockWebsiteChecker, websites);
	
		expectedOutput := map[string]bool{"http://google.com": true, "http://facebook.com": true, "http://golang.org": false};
	
		if !reflect.DeepEqual(result, expectedOutput) {
			t.Errorf("got %v want %v", result, expectedOutput);
		}
	});
}

func BenchmarkWebsiteChecker(b *testing.B){
	websites := []string{"http://google.com", "http://facebook.com", "http://golang.org"};
	mockWebsiteChecker := MockWebsiteChecker{};
	b.ResetTimer();

	for i := 0; i < b.N; i++ {
		checkWebsites(mockWebsiteChecker, websites);
	}
}