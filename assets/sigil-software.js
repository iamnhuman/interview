"use strict";

// Draw the same mesh to a depth buffer when the browser cannot create a WebGL context.
function createSoftwareSigil(canvas, turntable) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable");
  turntable.updateMatrixWorld(true);
  const inverse = turntable.matrixWorld.clone().invert();
  const meshes = [];
  const point = new THREE.Vector3();
  const direction = new THREE.Vector3();

  turntable.traverse(mesh => {
    if (!mesh.isMesh) return;
    const { geometry, material } = mesh;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    const matrix = inverse.clone().multiply(mesh.matrixWorld);
    const vertices = new Float32Array(position.count * 7);
    const projected = new Float32Array(position.count * 4);
    const indices = geometry.index?.array ?? Uint32Array.from({ length: position.count }, (_, index) => index);

    let texture;
    if (uv && material.map?.image) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 256;
      const sampler = tile.getContext("2d", { willReadFrequently: true });
      sampler.drawImage(material.map.image, 0, 0, 256, 256);
      texture = sampler.getImageData(0, 0, 256, 256).data;
    }

    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(matrix);
      direction.fromBufferAttribute(normal, index).transformDirection(matrix);
      const offset = index * 7;
      vertices[offset] = point.x;
      vertices[offset + 1] = point.y;
      vertices[offset + 2] = point.z;
      vertices[offset + 3] = direction.x;
      vertices[offset + 4] = direction.y;
      vertices[offset + 5] = direction.z;
      let albedo = .85;
      if (texture) {
        const x = Math.max(0, Math.min(255, Math.floor(uv.getX(index) * 256)));
        const y = Math.max(0, Math.min(255, Math.floor(uv.getY(index) * 256)));
        const pixel = (y * 256 + x) * 4;
        albedo = (texture[pixel] + texture[pixel + 1] + texture[pixel + 2]) / 765;
      }
      vertices[offset + 6] = .5 + .5 * albedo;
    }
    meshes.push({ vertices, projected, indices });
  });

  let size = 0;
  let frame, depth;

  function draw(matrix, width) {
    const targetSize = Math.min(640, Math.max(240, Math.round(width)));
    if (size !== targetSize) {
      size = canvas.width = canvas.height = targetSize;
      frame = context.createImageData(size, size);
      depth = new Float32Array(size * size);
    }
    frame.data.fill(0);
    depth.fill(0);
    const center = size / 2;
    const focal = center / Math.tan(Math.PI * 16 / 180);

    for (const { vertices, projected, indices } of meshes) {
      for (let source = 0, out = 0; source < vertices.length; source += 7, out += 4) {
        const x = vertices[source], y = vertices[source + 1], z = vertices[source + 2];
        const nx = vertices[source + 3], ny = vertices[source + 4], nz = vertices[source + 5];
        const albedo = vertices[source + 6];
        const distance = 1 / (4.15 - (x * matrix[2] + y * matrix[6] + z * matrix[10]));
        projected[out] = center + (x * matrix[0] + y * matrix[4] + z * matrix[8]) * focal * distance;
        projected[out + 1] = center - (x * matrix[1] + y * matrix[5] + z * matrix[9]) * focal * distance;
        projected[out + 2] = distance;
        const facing = nx * matrix[2] + ny * matrix[6] + nz * matrix[10];
        const reflectionX = 2 * facing * (nx * matrix[0] + ny * matrix[4] + nz * matrix[8]);
        const reflectionY = 2 * facing * (nx * matrix[1] + ny * matrix[5] + nz * matrix[9]);
        const panel = Math.max(0, 1 - Math.abs(reflectionX + .38) * 1.35 - Math.abs(reflectionY - .47));
        const strip = Math.max(0, 1 - Math.abs(reflectionX - .44) * 4 - Math.abs(reflectionY - .18) * .9);
        projected[out + 3] = albedo * (40 + 52 * Math.abs(facing) + 190 * panel + 150 * strip);
      }

      for (let index = 0; index < indices.length; index += 3) {
        const a = indices[index] * 4, b = indices[index + 1] * 4, c = indices[index + 2] * 4;
        const ax = projected[a], ay = projected[a + 1];
        const bx = projected[b], by = projected[b + 1];
        const cx = projected[c], cy = projected[c + 1];
        const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if (area >= -1e-5) continue;
        const left = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
        const right = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
        const top = Math.max(0, Math.floor(Math.min(ay, by, cy)));
        const bottom = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
        const weightStepA = (by - cy) / area;
        const weightStepB = (cy - ay) / area;
        const depthA = projected[a + 2] - projected[c + 2];
        const depthB = projected[b + 2] - projected[c + 2];
        const lightA = projected[a + 3] - projected[c + 3];
        const lightB = projected[b + 3] - projected[c + 3];
        for (let y = top; y <= bottom; y++) {
          let weightA = ((cx - bx) * (y + .5 - by) - (cy - by) * (left + .5 - bx)) / area;
          let weightB = ((ax - cx) * (y + .5 - cy) - (ay - cy) * (left + .5 - cx)) / area;
          for (let x = left; x <= right; x++, weightA += weightStepA, weightB += weightStepB) {
            if (weightA < 0 || weightB < 0 || weightA + weightB > 1) continue;
            const pixel = y * size + x;
            const distance = projected[c + 2] + weightA * depthA + weightB * depthB;
            if (distance <= depth[pixel]) continue;
            depth[pixel] = distance;
            const light = projected[c + 3] + weightA * lightA + weightB * lightB;
            const offset = pixel * 4;
            frame.data[offset] = light * .96;
            frame.data[offset + 1] = light * .99;
            frame.data[offset + 2] = light;
            frame.data[offset + 3] = 255;
          }
        }
      }
    }
    context.putImageData(frame, 0, 0);
  }

  return { draw };
}
