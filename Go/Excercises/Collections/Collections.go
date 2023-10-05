package collections

func Sum(numbers[] int) (sum int){
	for _,number := range numbers {
		sum += number;
	}
	return sum;
}

func SumAll(numbersToSum... []int) ([]int){
	lengthOfNumbers := len(numbersToSum);
	var sums = make([]int, lengthOfNumbers);

	for i, numbers := range numbersToSum {
		sums[i] = Sum(numbers);
	}
	return sums;
}

func SumAllTails(numbersToSum... []int) ([]int){
	lengthOfNumbers := len(numbersToSum);
	var result = make([]int, lengthOfNumbers);

	for i, numbers := range numbersToSum {
		if(len(numbers) == 0){
			result[i] = 0;
		}else{
			tail := numbers[1:];
			result[i] = Sum(tail);
		}
	}
	return result;
}
