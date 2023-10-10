package sync

import "sync"

type Counter struct {
	mu sync.Mutex;
	Value int;
}

func (c *Counter) Inc(){
	c.mu.Lock();
	defer c.mu.Unlock();
	c.Value++;
}

