package maps

import "errors"

type Dictionary map[string]string;
type DictionaryErr error;

func Search(dict map[string]string, key string) (string, error){
	if dict[key] == "" {
		return "", errors.New("Key not found");
	}
	return dict[key], nil;
}

func (d Dictionary) Add(key string, value string){
	d[key] = value;
}

