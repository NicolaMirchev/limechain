package collections

import (
	"reflect"
	"testing"
)


func TestSum(t *testing.T){

	checkSum := func(t testing.TB, expected, actual []int){
		t.Helper();
		if !reflect.DeepEqual(expected, actual){
			t.Errorf("expected %d but got %d", expected, actual);
		}
	};
	t.Run("Fixed size collection", func(t *testing.T){
	numbers := []int{1,2,3,4,5};
	sum := Sum(numbers);
	expected:= 15;
	
	if sum != expected{
		t.Errorf("expected %d but got %d", expected, sum);
	}
	});

	t.Run("Variable size collection", func(t *testing.T){
		numbers := []int{5,6,1};
		result := Sum(numbers);
		
		if result != 12{
		t.Errorf("expected %d but got %d", 12, result);	
		}
	});

	t.Run("Sum all slices", func(t *testing.T){
		numbers1 := []int{1,2,3};
		numbers2 := []int{5,6,7};

		result := SumAll(numbers1, numbers2);
		expected := []int{6,18};

		checkSum(t, expected, result);
	});

	t.Run("Sum all tails", func(t *testing.T){
		numbers1 := []int{1,2,3};
		numbers2 := []int{5,6,7};

		result := SumAllTails(numbers1, numbers2);
		expected := []int{5,13};

		checkSum(t, expected, result);
	});
}