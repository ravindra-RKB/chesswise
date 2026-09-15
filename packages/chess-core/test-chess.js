const { Chess } = require('chess.js');
const chess = new Chess();
chess.move('e4');
try {
  const res = chess.move({ from: 'e7', to: 'e5', promotion: 'q' });
  console.log('SUCCESS:', res);
} catch (err) {
  console.log('ERROR:', err.message);
}
