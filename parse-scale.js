const fs = require('fs');
const gltfPipeline = require('gltf-pipeline');
const glbToGltf = gltfPipeline.glbToGltf;
const glb = fs.readFileSync('./apps/web/public/chess.glb');
glbToGltf(glb).then(function (results) {
  const gltf = results.gltf;
  const pawn = gltf.meshes.find((m) => m.name.toLowerCase() === 'pawn');
  console.log(pawn);
});
