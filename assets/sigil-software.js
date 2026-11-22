"use strict";

function softwareChromeLight(nx, ny, nz, albedo) {
  const reflectionX = 2 * nz * nx, reflectionY = 2 * nz * ny;
  const panel = Math.max(0, 1 - Math.abs(reflectionX + .38) * 1.35 - Math.abs(reflectionY - .47));
  const strip = Math.max(0, 1 - Math.abs(reflectionX - .44) * 4 - Math.abs(reflectionY - .18) * .9);
  return albedo * (40 + 52 * Math.abs(nz) + 190 * panel + 150 * strip);
}

function softwareMeshAlbedo(geometry, material) {
  const albedo = new Float32Array(geometry.getAttribute("position").count).fill(.925);
  const uv = geometry.getAttribute("uv");
  if (!uv || !material.map?.image) return albedo;
  const size = 256;
  const tile = document.createElement("canvas");
  tile.width = tile.height = size;
  const sampler = tile.getContext("2d", { willReadFrequently: true });
  if (!sampler) return albedo;
  let texture;
  try {
    sampler.drawImage(material.map.image, 0, 0, size, size);
    texture = sampler.getImageData(0, 0, size, size).data;
  } catch {
    return albedo;
  }
  for (let index = 0; index < albedo.length; index++) {
    const x = Math.max(0, Math.min(size - 1, Math.floor(uv.getX(index) * size)));
    const y = Math.max(0, Math.min(size - 1, Math.floor(uv.getY(index) * size)));
    const pixel = (y * size + x) * 4;
    albedo[index] = .5 + .5 * (texture[pixel] + texture[pixel + 1] + texture[pixel + 2]) / 765;
  }
  return albedo;
}

// Rasterize the original triangles into a depth buffer when WebGL is unavailable.
function createSoftwareMeshRasterizer(canvas) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable");
  let frame, depth;

  return function draw(width, height, meshes) {
    if (!frame || canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      frame = context.createImageData(width, height);
      depth = new Float32Array(width * height);
    }
    frame.data.fill(0);
    depth.fill(-Infinity);

    for (const { projected, indices } of meshes) {
      for (let index = 0; index < indices.length; index += 3) {
        const a = indices[index] * 4, b = indices[index + 1] * 4, c = indices[index + 2] * 4;
        const ax = projected[a], ay = projected[a + 1];
        const bx = projected[b], by = projected[b + 1];
        const cx = projected[c], cy = projected[c + 1];
        const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if (area >= -1e-5) continue;
        const left = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
        const right = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
        const top = Math.max(0, Math.floor(Math.min(ay, by, cy)));
        const bottom = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
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
            const pixel = y * width + x;
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
  };
}

function createSoftwareSigil(canvas, turntable) {
  const rasterize = createSoftwareMeshRasterizer(canvas);
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
    const matrix = inverse.clone().multiply(mesh.matrixWorld);
    const linear = matrix.clone().setPosition(0, 0, 0);
    const normalMatrix = linear.clone().invert().transpose();
    const albedo = softwareMeshAlbedo(geometry, material);
    const vertices = new Float32Array(position.count * 6);
    const projected = new Float32Array(position.count * 4);
    const indices = geometry.index?.array ?? Uint32Array.from({ length: position.count }, (_, index) => index);
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(matrix).toArray(vertices, index * 6);
      direction.fromBufferAttribute(normal, index).applyMatrix4(normalMatrix).toArray(vertices, index * 6 + 3);
    }
    const morphs = geometry.morphAttributes.position?.map((positions, target) => {
      const normals = geometry.morphAttributes.normal?.[target];
      const deltas = new Float32Array(vertices.length);
      for (let index = 0, offset = 0; index < position.count; index++, offset += 6) {
        point.fromBufferAttribute(positions, index).applyMatrix4(linear).toArray(deltas, offset);
        if (normals) direction.fromBufferAttribute(normals, index).applyMatrix4(normalMatrix).toArray(deltas, offset + 3);
      }
      return deltas;
    });
    meshes.push({ vertices, albedo, projected, indices, morphs, weights: mesh.morphTargetInfluences });
  });

  function draw(matrix, width, cameraDistance) {
    const size = Math.min(640, Math.max(240, Math.round(width)));
    const center = size / 2;
    const focal = center / Math.tan(Math.PI * 16 / 180);
    for (const { vertices, albedo, projected, morphs, weights } of meshes) {
      const bending = morphs && weights?.some(Boolean);
      for (let index = 0, offset = 0, out = 0; index < albedo.length; index++, offset += 6, out += 4) {
        let x = vertices[offset], y = vertices[offset + 1], z = vertices[offset + 2];
        let nx = vertices[offset + 3], ny = vertices[offset + 4], nz = vertices[offset + 5];
        if (bending) {
          for (let target = 0; target < morphs.length; target++) {
            const delta = morphs[target], weight = weights[target];
            x += delta[offset] * weight;
            y += delta[offset + 1] * weight;
            z += delta[offset + 2] * weight;
            nx += delta[offset + 3] * weight;
            ny += delta[offset + 4] * weight;
            nz += delta[offset + 5] * weight;
          }
        }
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= length;
        ny /= length;
        nz /= length;
        const distance = 1 / (cameraDistance - (x * matrix[2] + y * matrix[6] + z * matrix[10]));
        projected[out] = center + (x * matrix[0] + y * matrix[4] + z * matrix[8]) * focal * distance;
        projected[out + 1] = center - (x * matrix[1] + y * matrix[5] + z * matrix[9]) * focal * distance;
        projected[out + 2] = distance;
        projected[out + 3] = softwareChromeLight(nx * matrix[0] + ny * matrix[4] + nz * matrix[8],
          nx * matrix[1] + ny * matrix[5] + nz * matrix[9], nx * matrix[2] + ny * matrix[6] + nz * matrix[10], albedo[index]);
      }
    }
    rasterize(size, size, meshes);
  }

  return { draw };
}
