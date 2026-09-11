const fs = require('fs');
const gltfPipeline = require('gltf-pipeline');
const glbToGltf = gltfPipeline.glbToGltf;
const glb = fs.readFileSync('./apps/web/public/chess.glb');
glbToGltf(glb).then(function (results) {
  const gltf = results.gltf;
  console.log(
    'MATERIALS:',
    gltf.materials.map((m) => m.name),
  );
  console.log(
    'MESHES:',
    gltf.meshes.map((m) => m.name),
  );
});
