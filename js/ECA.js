// Create a circle shaped path with its center at the center
// of the view and a radius of 30:
keepalive="true"
nCells = 8;
cyclic = true;
initialConfig = [1,1,0,1,0,0,0,0];
rule = 110;

cellList = [];
ruleList = [];


// var path = new Path.Circle({
// 	center: view.center,
// 	radius: 60,
// 	strokeColor: 'black'
// });

// function onResize(event) {
// 	// Whenever the window is resized, recenter the path:
// 	path.position = view.center;
// }

class Cell {
	constructor(state) {
		this.state = state;
	}
	
}
Cell.prototype.toString = function() {
	return this.state? 1 : 0;
  }

function cyclcicArrayAt(idx, list) {
	idx = idx % list.length;
	return list[abs(idx)];
}

function main(nCells, cyclic, rule) {
	for(i = 0; i < nCells; i++) {
		cellList.push(new Cell(initialConfig[i]));
	}
	ruleList = ruleByteToCaseList(rule);
}

function iterate() {
	newList = [];
	for(i = 0; i < cellList.length; i++) {
		newList[i] = new Cell(getNextState[cellList, i, ruleList]);
	}
	cellList = newList;

	console.log(cellList);

}

function getNextState(cellList, idx, rules) {
	localStates = [cyclcicArrayAt(idx-1), cyclcicArrayAt(idx), cyclcicArrayAt(idx+1)];
	if(localStates[0] && localStates[1] && localStates[2]) {
		//111
		return rules[7];
	} else if(localStates[0] && localStates[1] && !localStates[2]) {
		//110
		return rules[6];
	} else if(localStates[0] && !localStates[1] && localStates[2]) {
		//101
		return rules[5];
	} else if(localStates[0] && !localStates[1] && !localStates[2]) {
		//100
		return rules[4];
	} else if(!localStates[0] && localStates[1] && localStates[2]) {
		//011
		return rules[3];
	} else if(!localStates[0] && localStates[1] && !localStates[2]) {
		//010
		return rules[2];
	} else if(!localStates[0] && !localStates[1] && localStates[2]) {
		//001
		return rules[1];
	} else if(!localStates[0] && !localStates[1] && !localStates[2]) {
		//000
		return rules[0];
	} 
}

function ruleByteToCaseList(rule) {
	retlist = [];
	for(i = 7; i >= 0; i--) {
		retlist.push(rule & (1<<i));
	}
}
main(nCells, cyclic);

const input = document.querySelector("input");
input.addEventListener("keypress", iterate);