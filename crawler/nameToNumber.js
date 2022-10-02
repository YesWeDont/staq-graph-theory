const graph = require("./graph.json");
let newGraph = [];
const people = /*shuffle(*/Array.from(Object.keys(graph))/*)*/;
const index = {};

let y7 = "<sensitive>"
let y8 = "<sensitive>"
let y9 = "<sensitive>"
let eightE = "<sensitive>";

for(let i = 0; i< people.length; i++){index[people[i]] = i};
for(let i = 0; i < people.length; i++){
    newGraph.push(graph[people[i]].map(a=>index[a]).filter(a=>a));
    y7 = y7.replace(people[i], i);
    y8 = y8.replace(people[i], i);
    y9 = y9.replace(people[i], i);
    eightE = eightE.replace(people[i], i);
}

// output graph in JSON form, and the three grade filters in CSV form.
console.log("graph:")
console.log(JSON.stringify(newGraph));

console.log("8e:");
console.log(eightE)

console.log("y8:");
console.log(y8);

console.log("y7:");
console.log(y7);

console.log("y9:");
console.log(y9);

// code obtained from
// https://stackoverflow.com/questions/2450954
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}