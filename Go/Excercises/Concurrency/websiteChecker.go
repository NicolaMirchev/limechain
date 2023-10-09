package concurrency


type WebsiteChecker interface{
	CheckWebsite(string) bool;
}

type result struct {
	string;
	bool;
}

func checkWebsites(wc WebsiteChecker,websites []string) map[string]bool{
	results := make(map[string]bool);
	channel := make (chan result);
	
	for _, url := range websites {
		go func (u string){
			channel <- result{u, wc.CheckWebsite(u)};
		}(url);		
	}
	for i := 0; i < len(websites); i++ {
		currentResult := <- channel;
		results[currentResult.string] = currentResult.bool;
	}
	return results;
}
