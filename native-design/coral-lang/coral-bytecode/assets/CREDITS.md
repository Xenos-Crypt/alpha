# Native town assets

Photographic surfaces are converted from Poly Haven's CC0 color maps; see sources.json for exact source pages. The sky and normal/roughness maps from the browser prototype are not used by this native renderer.

woman.obj / woman.bmp: Michelle by Adobe Mixamo, provided in Three.js r180 examples. man.obj / man.bmp: Soldier by Adobe Mixamo from the same repository. The meshes are exported in a sampled idle pose, with human scale and authored UVs and smooth normals. Michelle's pose is adapted from the matching Mixamo skeleton. These are static posed meshes in this native design pass, not a native skeletal animation system.

Sources: https://github.com/mrdoob/three.js/tree/r180/examples/models/gltf
Model attribution examples: https://threejs.org/examples/webgl_animation_skinning_blending.html and https://github.com/mrdoob/three.js/blob/r180/examples/webgpu_skinning.html
Adobe's video-game usage terms: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

Signs, leaf cutout artwork and primitive meshes are generated for this project. Character assets are not claimed to be CC0 or covered by Three.js's software license. Three.js is used only in offline asset preparation; the native executable renders through the project's own C/OpenGL backend.
