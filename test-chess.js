const { Chess } = require('chess.js');
const chess = new Chess();
chess.move('e4');
const res = chess.move({ from: 'e7', to: 'e5', promotion: 'q' });
console.log(res);
