package main

import "fmt"

func main() {
	fmt.Println(Hello("World", "Spanish"));
}

const (
	helloInSpanish = "Holla"
	helloInBulgarian = "Zdr"
	helloInEnglish = "Hello"
	);

func Hello(name,language string) string{
	switch language {
		case "Spanish":
			return helloInSpanish + ", " + name;
		case "Bulgarian":
			return helloInBulgarian + ", " + name;
		default:
			return helloInEnglish + ", " + name;
		}
}