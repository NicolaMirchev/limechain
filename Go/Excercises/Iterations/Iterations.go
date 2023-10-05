package iterations

func Repeat(char string, times int) (result string){
	for i := 0; i < times; i++ {
		result += char;
	}
	return result;
}