const fs = require('fs');
const gltfPipeline = require('gltf-pipeline');
const glbToGltf = gltfPipeline.glbToGltf;
const glb = fs.readFileSync('./apps/web/public/chess.glb');
glbToGltf(glb).then(function (results) {
  const gltf = results.gltf;
  const a1 = gltf.nodes.find((n) => n.name === 'a1');
  const pawn = gltf.nodes.find((n) => n.name.toLowerCase() === 'pawn');
  console.log('a1 translation:', a1 ? a1.translation : 'None');
  console.log('pawn scale:', pawn ? pawn.scale : 'None');
});
