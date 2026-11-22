"use strict";

(() => {
  const sourceSize = 1024;
  const slice = .32;
  const stageWave = { amplitude: 8, frequency: 12, rate: 2.2 };

  // Align the media with the inner edges of the front-facing GLB models.
  const frameArt = {
    woven: {
      bounds: [10, 23.482, 1004, 977.036],
      openingRect: [54, 85, 966, 944],
      railCenter: [56, 76, 974, 945],
    },
    "cover-stage": {
      bounds: [20, 17, 984, 979],
      railCenter: [136, 160, 873, 873],
      opening: [
        [564, 155], [609, 156], [654, 164], [696.3, 163.1], [699, 163], [724, 175], [727, 181],
        [772, 179], [781, 192], [797, 185], [807, 185], [819, 189], [832, 201], [833, 220],
        [843, 214], [849, 215], [854, 217], [863, 228], [866, 238], [864, 268], [861, 280],
        [854, 290], [861, 289], [869, 294], [876.5, 327.7], [879, 339], [879, 355], [872, 371],
        [873, 382], [870, 393], [856, 412], [861, 413], [869, 421], [879, 446], [879, 476],
        [869, 516], [869, 545], [878, 582], [880, 605], [876, 620], [869, 627], [860, 629],
        [870, 639], [872, 649], [858, 679], [857, 691], [859.4, 696.3], [876, 733], [873, 739],
        [854, 741], [869, 754], [874, 766], [872, 781], [862, 801], [854, 812], [834, 830],
        [803, 843], [789, 840], [777, 830], [763, 846], [742, 856], [710, 856], [696.3, 850.8],
        [681, 845], [681, 852], [674, 857], [628, 866], [612, 864], [610, 872], [601, 878],
        [564, 884], [531, 882], [479, 868], [453, 864], [393, 875], [356, 865], [352, 856],
        [335, 865], [327.7, 865.6], [311, 867], [293, 862], [276, 853], [260, 838], [250, 824],
        [245, 831], [238, 834], [215, 834], [203, 828], [192, 835], [176, 831], [156, 809],
        [138, 770], [138, 757], [148, 739], [136, 741], [131, 739], [126, 732], [130.1, 696.3],
        [134, 662], [140, 643], [146, 636], [132, 634], [126, 628], [123, 619], [135, 522],
        [135, 503], [127, 479], [126, 462], [137, 418], [152, 404], [141, 397], [138, 388],
        [138, 361], [134, 352], [133, 327.7], [133, 327], [138, 313], [146, 304], [155, 300],
        [159, 301], [167, 290], [172, 289], [164, 284], [148, 266], [152, 242], [165, 221],
        [169, 205], [176, 199], [198, 195], [218, 183], [245, 177], [258, 180], [265, 168],
        [293, 159], [327.7, 158.2], [335, 158], [361, 165], [400, 166], [447, 156], [460, 156],
        [480, 159], [500, 166], [511, 173], [529, 162],
      ],
    },
    "cover-detail": {
      bounds: [21, 10, 981, 995],
      opening: [
        [340, 127], [368, 130], [405, 156], [427, 148], [465, 143], [567, 140], [640, 132],
        [650, 132], [656, 138], [660, 138], [670, 128], [684, 127], [696.3, 129.3], [758, 141],
        [781, 150], [790, 159], [814, 160], [823, 165], [828, 173], [841, 174], [853, 186],
        [857, 202], [866, 214], [865, 232], [871, 240], [873, 254], [872.3, 327.7], [872, 364],
        [859, 404], [867, 404], [875, 411], [878, 430], [880, 551], [876, 562], [874, 584],
        [867, 598], [867, 605], [874, 616], [878, 647], [884, 663], [884.9, 696.3], [885, 700],
        [876, 776], [871, 785], [866, 787], [866, 802], [857, 816], [855, 828], [841, 844],
        [828, 845], [824, 851], [811, 857], [789, 857], [780, 867], [754, 876], [723, 884],
        [698, 887], [696.3, 887], [683, 887], [678, 883], [673, 883], [668, 888], [565, 889],
        [540, 880], [533, 870], [537, 861], [508, 871], [436, 870], [374, 874], [345, 872],
        [338, 878], [327.7, 878.6], [321, 879], [302, 885], [249, 871], [242, 868], [233, 857],
        [209, 857], [196, 845], [190, 847], [182, 844], [170, 832], [165, 814], [157, 805],
        [158, 788], [150, 780], [148, 771], [145, 711], [150, 696.3], [156, 679], [156, 665],
        [150, 665], [146, 661], [141, 644], [145, 460], [150, 455], [151, 405], [156, 399],
        [156, 393], [149, 381], [148, 356], [143, 341], [143.9, 327.7], [149, 248], [154, 235],
        [158, 232], [158, 214], [165, 204], [168, 189], [182, 174], [194, 172], [199, 165],
        [212, 159], [233, 160], [242, 150], [258, 144], [327.7, 129.6],
      ],
    },
  };

  function frameCoordinate(pixel, length, cap) {
    const value = pixel / sourceSize;
    if (value < slice) return value / slice * cap;
    if (value > 1 - slice) return length - (1 - value) / slice * cap;
    return cap + (value - slice) / (1 - 2 * slice) * (length - 2 * cap);
  }

  function stageSideOffset(u, v, phase, amount, offset) {
    const x = 2 * u, y = 2 * v;
    const across = 1 - x * x, down = 1 - y * y;
    offset[0] = amount * x * down * down * Math.sin(stageWave.frequency * v + x + phase);
    offset[1] = amount * y * across * across * Math.sin(stageWave.frequency * u - y - phase);
  }

  function fitFrameStrands(photo, width, height, cap, artwork) {
    const spread = artwork === frameArt["cover-stage"] ? .3 : 0;
    const innerScale = parseFloat(getComputedStyle(photo).getPropertyValue("--cover-frame-inner-scale")) || 0;
    if (!spread && !innerScale) return null;
    const [x1, y1, x2, y2] = artwork.railCenter;
    const left = frameCoordinate(x1, width, cap), right = frameCoordinate(x2, width, cap);
    const top = frameCoordinate(y1, height, cap), bottom = frameCoordinate(y2, height, cap);
    const centerX = width / 2, centerY = height / 2;
    const outerLipOffset = .065 * cap;

    return (x, y, result) => {
      // Widen the strands across their centerlines, tapering into the corners.
      const across = Math.max(0, 1 - ((x - centerX) / (centerX - cap)) ** 2);
      const down = Math.max(0, 1 - ((y - centerY) / (centerY - cap)) ** 2);
      const extraX = spread * down * down, extraY = spread * across * across;
      const inwardX = x < centerX ? 1 : -1, inwardY = y < centerY ? 1 : -1;
      const dx = x - (inwardX > 0 ? left : right), dy = y - (inwardY > 0 ? top : bottom);
      // The extra width starts at the outer lip and extends toward the photo.
      const innerX = Math.max(0, dx * inwardX + outerLipOffset);
      const innerY = Math.max(0, dy * inwardY + outerLipOffset);
      const stretchX = innerScale * down * down, stretchY = innerScale * across * across;
      result[0] = x + extraX * dx + stretchX * innerX * inwardX;
      result[1] = y + extraY * dy + stretchY * innerY * inwardY;
      result[2] = 1 + extraX + (innerX ? stretchX : 0);
      result[3] = 1 + extraY + (innerY ? stretchY : 0);
    };
  }

  function fitFrameOpening(photo, opening, width, height, cap, left, top, fitStrands) {
    const fitted = opening.map(([x, y]) => [frameCoordinate(x, width, cap), frameCoordinate(y, height, cap)]);
    const halfWidth = photo.clientWidth / 2, halfHeight = photo.clientHeight / 2;
    const maxMove = fitStrands ? stageWave.amplitude * cap / 108 : 0;
    const outline = [];
    const offset = new Float64Array(2);
    const strand = new Float64Array(4);
    let zoom = 1;

    for (let i = 0; i < fitted.length; i++) {
      const [x, y] = fitted[i], [nextX, nextY] = fitted[(i + 1) % fitted.length];
      const dx = nextX - x, dy = nextY - y;
      const steps = fitStrands ? Math.max(1, Math.ceil(30 * Math.max(Math.abs(dx) / width, Math.abs(dy) / height))) : 1;
      for (let step = 0; step < steps; step++) {
        let fx = x + dx * step / steps, fy = y + dy * step / steps;
        if (fitStrands) {
          fitStrands(fx, fy, strand);
          fx = strand[0];
          fy = strand[1];
        }
        const px = left + fx, py = top + fy;
        const u = fx / width - .5, v = .5 - fy / height;
        const roomX = maxMove * Math.abs(2 * u) * (1 - 4 * v * v) ** 2;
        const roomY = maxMove * Math.abs(2 * v) * (1 - 4 * u * u) ** 2;
        zoom = Math.max(zoom, (Math.abs(px - halfWidth) + 1 + roomX) / halfWidth,
          (Math.abs(py - halfHeight) + 1 + roomY) / halfHeight);
        outline.push({ px, py, u, v });
      }
    }

    // The photo's opening follows the same wave as the metal at its inner lip.
    function paint(phase, amount) {
      const polygon = outline.map(({ px, py, u, v }) => {
        stageSideOffset(u, v, phase, amount, offset);
        return `${(px + offset[0]).toFixed(2)}px ${(py - offset[1]).toFixed(2)}px`;
      });
      photo.style.setProperty("--frame-photo-clip", `polygon(${polygon.join(", ")})`);
    }
    photo.style.setProperty("--frame-photo-scale", String(zoom));
    paint(0, 0);
    return fitStrands ? paint : null;
  }

  function fitStageFallbackWave(photo, width, height, cap, left, top, padding) {
    const artwork = frameArt["cover-stage"];
    const fitStrands = fitFrameStrands(photo, width, height, cap, artwork);
    const paintOpening = fitFrameOpening(photo, artwork.opening, width, height, cap, left, top, fitStrands);
    const offset = new Float64Array(2);
    const strand = new Float64Array(4);
    return (points, time, strength) => {
      const phase = stageWave.rate * time;
      const amount = stageWave.amplitude * cap / 108 * strength;
      for (const point of points) {
        const x = point.x - padding, y = point.y - padding;
        fitStrands(x, y, strand);
        stageSideOffset(strand[0] / width - .5, .5 - strand[1] / height, phase, amount, offset);
        point.px += strand[0] - x + offset[0];
        point.py += strand[1] - y - offset[1];
      }
      paintOpening(phase, amount);
    };
  }

  function createFrameTwist(geometry, width, height, cap, railCenter) {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const restPositions = position.array.slice();
    const restNormals = normal.array.slice();
    const flex = geometry.getAttribute("frameFlex").array;
    const [x1, y1, x2, y2] = railCenter;
    const left = frameCoordinate(x1, width, cap) - width / 2;
    const right = frameCoordinate(x2, width, cap) - width / 2;
    const top = height / 2 - frameCoordinate(y1, height, cap);
    const bottom = height / 2 - frameCoordinate(y2, height, cap);
    const centerX = (left + right) / 2, centerY = (top + bottom) / 2;
    const radius = .18 * cap;
    const scale = cap / 108;
    const path = new Float32Array(position.count * 5);

    for (let i = 0, offset = 0; i < position.count; i++, offset += 3) {
      const x = restPositions[offset], y = restPositions[offset + 1];
      const dx = x - Math.max(left + radius, Math.min(right - radius, x));
      const dy = y - Math.max(bottom + radius, Math.min(top - radius, y));
      const distance = Math.hypot(dx, dy);
      const phase = 5 * Math.atan2((centerY - y) / height, (x - centerX) / width) + .037 * restPositions[offset + 2];
      path[i * 5] = dx / (distance || 1);
      path[i * 5 + 1] = dy / (distance || 1);
      path[i * 5 + 2] = distance - radius;
      path[i * 5 + 3] = Math.sin(phase);
      path[i * 5 + 4] = Math.cos(phase);
    }

    return (time, strength) => {
      const sinTime = Math.sin(3.2 * time), cosTime = Math.cos(3.2 * time);
      for (let i = 0, offset = 0, vertex = 0; i < position.count; i++, offset += 3, vertex += 5) {
        const amount = strength * flex[i];
        const nx = path[vertex], ny = path[vertex + 1], radial = path[vertex + 2];
        const wave = path[vertex + 3] * cosTime - path[vertex + 4] * sinTime;
        const crest = path[vertex + 4] * cosTime + path[vertex + 3] * sinTime;
        const angle = amount * (.56 * wave + .2 * wave * crest);
        const cosine = Math.cos(angle), sine = Math.sin(angle);
        const z = restPositions[offset + 2];
        const shift = radial * (cosine - 1) - z * sine;
        const along = amount * scale * (10 * wave + 4 * wave * crest);
        position.setXYZ(i, restPositions[offset] + nx * shift + ny * along,
          restPositions[offset + 1] + ny * shift - nx * along, z * cosine + radial * sine);

        const normalX = restNormals[offset], normalY = restNormals[offset + 1], normalZ = restNormals[offset + 2];
        const radialNormal = normalX * nx + normalY * ny;
        const bend = radialNormal * (cosine - 1) - normalZ * sine;
        normal.setXYZ(i, normalX + nx * bend, normalY + ny * bend, normalZ * cosine + radialNormal * sine);
      }
      position.needsUpdate = true;
      normal.needsUpdate = true;
    };
  }

  function showFallback(photo) {
    photo.removeAttribute("data-cover-frame-live");
    photo.removeAttribute("data-cover-frame-cpu");
    photo.toggleAttribute("data-cover-frame-fallback", true);
    if (typeof animateCoverFrameFallback === "function") animateCoverFrameFallback(photo, fitStageFallbackWave);
  }

  function createSoftwareFrame(canvas, { geometry, material }, uniforms, wovenFrame) {
    const rasterize = createSoftwareMeshRasterizer(canvas);
    const positions = geometry.getAttribute("position").array;
    const normals = geometry.getAttribute("normal").array;
    const flex = geometry.getAttribute("frameFlex").array;
    const albedo = softwareMeshAlbedo(geometry, material);
    const projected = new Float32Array(flex.length * 4);
    const indices = geometry.index?.array ?? Uint32Array.from({ length: flex.length }, (_, index) => index);
    const meshes = [{ projected, indices }];
    const sideOffset = new Float64Array(2);

    return function draw(width, height) {
      const longSide = Math.max(width, height);
      const scale = wovenFrame ? Math.min(2, 1440 / longSide) : Math.min(1, 900 / longSide);
      const pixelWidth = Math.max(1, Math.round(width * scale));
      const pixelHeight = Math.max(1, Math.round(height * scale));
      const scaleX = pixelWidth / width, scaleY = pixelHeight / height;
      const { x: frameWidth, y: frameHeight } = uniforms.frameSize.value;
      const { x: pointerX, y: pointerY } = uniforms.framePointer.value;
      const time = uniforms.frameTime.value;
      const motion = uniforms.frameMotion.value;
      const sideMotion = uniforms.frameSideMotion.value;
      const sidePhase = uniforms.frameSidePhase.value;
      const phaseOffsetA = -2.1 * time;
      const phaseOffsetB = 1.34 * time + .43 * Math.sin(time * .71);

      // Match the WebGL deformation, including the fixed lip around the photograph.
      for (let index = 0, offset = 0, out = 0; index < flex.length; index++, offset += 3, out += 4) {
        let x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
        let nx = normals[offset], ny = normals[offset + 1], nz = normals[offset + 2];
        const u = x / frameWidth, v = y / frameHeight;
        if (motion && flex[index]) {
          const focus = .58 + .42 / (1 + 12 * ((u - pointerX) ** 2 + (v - pointerY) ** 2));
          const amount = flex[index] * motion * focus;
          const a = 16 * u + 5 * v + phaseOffsetA;
          const b = -7 * u + 15 * v + phaseOffsetB;
          const sinA = Math.sin(a), cosA = Math.cos(a), sinB = Math.sin(b), cosB = Math.cos(b);
          x += amount * (9 * sinA + 4 * sinB);
          y += amount * (9 * cosB + 4 * cosA);
          z += amount * (12 * cosA + 11 * sinB);
          const slopeA = -12 * sinA, slopeB = 11 * cosB;
          nx -= nz * amount * (16 * slopeA - 7 * slopeB) / frameWidth;
          ny -= nz * amount * (5 * slopeA + 15 * slopeB) / frameHeight;
          const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          nx /= length;
          ny /= length;
          nz /= length;
        }
        if (sideMotion) {
          stageSideOffset(u, v, sidePhase, sideMotion, sideOffset);
          x += sideOffset[0];
          y += sideOffset[1];
        }
        projected[out] = (x + width / 2) * scaleX;
        projected[out + 1] = (height / 2 - y) * scaleY;
        projected[out + 2] = z;
        projected[out + 3] = softwareChromeLight(nx, ny, nz, albedo[index]);
      }
      rasterize(pixelWidth, pixelHeight, meshes);
    };
  }

  function mountFrame(source, artwork, viewerPhoto) {
    const canvas = source.querySelector(".cover-frame-canvas");
    if (!canvas) { showFallback(source); return; }

    const isOverlay = source.parentElement?.hasAttribute("data-photo");
    const trigger = isOverlay ? source.parentElement : source;
    const autoplay = source.hasAttribute("data-cover-frame-idle");
    const motionRate = source.dataset.coverFrameDirection === "reverse" ? -.72 : 1;
    let photo = source;
    const events = new AbortController();
    const { signal } = events;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const openingRect = artwork.openingRect;
    const ripples = artwork === frameArt["cover-stage"];
    const pointer = new THREE.Vector2();
    const uniforms = {
      frameTime: { value: 0 },
      frameMotion: { value: 0 },
      frameSideMotion: { value: 0 },
      frameSidePhase: { value: 0 },
      frameSize: { value: new THREE.Vector2(1, 1) },
      framePointer: { value: new THREE.Vector2() },
    };
    let renderer, scene, camera, mesh, points, normals, metalness, reflections;
    let softwareCanvas, drawSoftware, weave, paintOpening;
    let unavailable = false, contextLost = false, gpuFailed = false, gpuNeedsFit = true, gpuNeedsLight = true;
    let fitted = false, visible = true, hovered = false, canvasWidth = 0, canvasHeight = 0, started = false;
    let frame = 0, previous = 0, strength = 0, capScale = 1;

    function prepareModel(model) {
      const bounds = new THREE.Box3().setFromObject(model);
      const spans = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const part = model.getObjectByProperty("isMesh", true);
      const { geometry, material } = part;
      const positions = geometry.getAttribute("position");
      const surface = geometry.getAttribute("normal");
      const value = new THREE.Vector3();
      const [left, top, width, height] = artwork.bounds;
      const segments = artwork.opening?.map(([x, y], index) => {
        const [endX, endY] = artwork.opening[(index + 1) % artwork.opening.length];
        const dx = endX - x, dy = endY - y;
        return { x, y, dx, dy, inverseLengthSquared: 1 / (dx * dx + dy * dy) };
      }) ?? [];
      points = new Float32Array(positions.count * 3);
      normals = new Float32Array(surface.count * 3);
      const flex = new Float32Array(positions.count);

      for (let index = 0; index < positions.count; index++) {
        const offset = index * 3;
        value.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld);
        const x = left + width * (bounds.max.z - value.z) / spans.z;
        const y = top + height * (bounds.max.y - value.y) / spans.y;
        points[offset] = x;
        points[offset + 1] = y;
        points[offset + 2] = (value.x - center.x) / spans.z;
        value.fromBufferAttribute(surface, index).transformDirection(part.matrixWorld);
        normals[offset] = -value.z;
        normals[offset + 1] = value.y;
        normals[offset + 2] = value.x;

        if (openingRect) {
          // Hold a narrow strip over the edge of the opening as the strands twist on either side.
          const [left, top, right, bottom] = openingRect;
          const distance = Math.abs(Math.max(left - x, x - right, top - y, y - bottom));
          const freedom = Math.min(1, Math.max(0, (distance - 5) / 29));
          flex[index] = freedom * freedom * (3 - 2 * freedom);
          continue;
        }

        // Hold the lip that covers the photograph while the outer metal flexes.
        const pinned = 16, free = 68;
        let nearest = free * free;
        for (const segment of segments) {
          const vx = x - segment.x, vy = y - segment.y;
          const along = Math.max(0, Math.min(1, (vx * segment.dx + vy * segment.dy) * segment.inverseLengthSquared));
          const dx = vx - along * segment.dx, dy = vy - along * segment.dy;
          nearest = Math.min(nearest, dx * dx + dy * dy);
          if (nearest <= pinned * pinned) break;
        }
        const freedom = Math.max(0, (Math.sqrt(nearest) - pinned) / (free - pinned));
        flex[index] = freedom * freedom * (3 - 2 * freedom);
      }

      geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(points.length), 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(normals.length), 3));
      geometry.setAttribute("frameFlex", new THREE.Float32BufferAttribute(flex, 1));
      if (openingRect) {
        // Broaden the highlights on the thin strands to reduce shimmer as they turn.
        material.normalScale.multiplyScalar(.6);
        material.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `
            #include <roughnessmap_fragment>
            roughnessFactor = max(roughnessFactor, 0.26);
          `);
        };
      } else material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader.replace("#include <common>", `
          #include <common>
          attribute float frameFlex;
          uniform float frameTime;
          uniform float frameMotion;
          uniform float frameSideMotion;
          uniform float frameSidePhase;
          uniform vec2 frameSize;
          uniform vec2 framePointer;
        `).replace("#include <beginnormal_vertex>", `
          #include <beginnormal_vertex>
          vec2 frameUV = position.xy / frameSize;
          vec2 fromPointer = frameUV - framePointer;
          float focus = 0.58 + 0.42 / (1.0 + 12.0 * dot(fromPointer, fromPointer));
          float amount = frameFlex * frameMotion * focus;
          vec2 across = vec2(16.0, 5.0);
          vec2 around = vec2(-7.0, 15.0);
          float phaseA = dot(frameUV, across) - frameTime * 2.1;
          float phaseB = dot(frameUV, around) + frameTime * 1.34 + 0.43 * sin(frameTime * 0.71);
          float sinA = sin(phaseA), cosA = cos(phaseA);
          float sinB = sin(phaseB), cosB = cos(phaseB);
          vec3 frameBend = amount * vec3(9.0 * sinA + 4.0 * sinB, 9.0 * cosB + 4.0 * cosA, 12.0 * cosA + 11.0 * sinB);
          vec2 frameSlope = amount * (-12.0 * sinA * across + 11.0 * cosB * around) / frameSize;
          objectNormal = normalize(vec3(objectNormal.xy - objectNormal.z * frameSlope, objectNormal.z));
        `).replace("#include <begin_vertex>", `
          #include <begin_vertex>
          transformed += frameBend;
          if (frameSideMotion > 0.0) {
            vec2 edge = 2.0 * frameUV;
            vec2 taper = 1.0 - edge * edge;
            vec2 phase = ${stageWave.frequency.toFixed(1)} * frameUV.yx + vec2(edge.x, -edge.y)
              + vec2(frameSidePhase, -frameSidePhase);
            transformed.xy += frameSideMotion * edge * taper.yx * taper.yx * sin(phase);
          }
        `);
      };
      mesh = new THREE.Mesh(geometry, material);
      metalness = material.metalness;
      scene.add(mesh);
    }

    function fitModel() {
      if (!mesh || unavailable) return;
      fitted = false;
      const frameStyle = getComputedStyle(photo, "::after");
      const canvasStyle = getComputedStyle(canvas);
      const cap = parseFloat(frameStyle.borderTopWidth);
      const padding = parseFloat(frameStyle.getPropertyValue("--cover-frame-padding"));
      canvasWidth = parseFloat(canvasStyle.width);
      canvasHeight = parseFloat(canvasStyle.height);
      const width = canvasWidth - 2 * padding, height = canvasHeight - 2 * padding;
      if (!photo.clientWidth || !photo.clientHeight) {
        photo.removeAttribute("data-cover-frame-live");
        return;
      }
      if (!(cap > 0 && width > 2 * cap && height > 2 * cap)) {
        showFallback(photo);
        return;
      }

      const position = mesh.geometry.getAttribute("position");
      const normal = mesh.geometry.getAttribute("normal");
      const edgeScale = cap / slice;
      const centerX = (width - 2 * cap) / (1 - 2 * slice);
      const centerY = (height - 2 * cap) / (1 - 2 * slice);
      const lower = sourceSize * slice, upper = sourceSize - lower;
      const fitStrands = artwork.railCenter ? fitFrameStrands(photo, width, height, cap, artwork) : null;
      const strand = new Float64Array([0, 0, 1, 1]);
      for (let index = 0; index < position.count; index++) {
        const offset = index * 3;
        const x = points[offset], y = points[offset + 1];
        strand[0] = frameCoordinate(x, width, cap);
        strand[1] = frameCoordinate(y, height, cap);
        fitStrands?.(strand[0], strand[1], strand);
        position.setXYZ(index, strand[0] - width / 2, height / 2 - strand[1], points[offset + 2] * edgeScale);
        const nx = normals[offset] / ((x < lower || x > upper ? edgeScale : centerX) * strand[2]);
        const ny = normals[offset + 1] / ((y < lower || y > upper ? edgeScale : centerY) * strand[3]);
        const nz = normals[offset + 2] / edgeScale;
        const length = Math.hypot(nx, ny, nz) || 1;
        normal.setXYZ(index, nx / length, ny / length, nz / length);
      }
      position.needsUpdate = true;
      normal.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();

      if (openingRect) {
        weave = createFrameTwist(mesh.geometry, width, height, cap, artwork.railCenter);
      } else {
        const left = parseFloat(canvasStyle.left) + padding, top = parseFloat(canvasStyle.top) + padding;
        paintOpening = fitFrameOpening(photo, artwork.opening, width, height, cap, left, top, fitStrands);
      }

      // Orthographic projection keeps the model and the photo outline aligned as the metal bends in depth.
      camera.left = -canvasWidth / 2;
      camera.right = canvasWidth / 2;
      camera.top = canvasHeight / 2;
      camera.bottom = -canvasHeight / 2;
      camera.updateProjectionMatrix();
      gpuNeedsFit = true;
      previous = 0;
      uniforms.frameSize.value.set(width, height);
      capScale = cap / 108;
      fitted = true;
      schedule();
    }

    function lightModel() {
      reflections?.dispose();
      reflections = undefined;
      scene.environment = null;
      if (renderer.extensions.has("EXT_color_buffer_float")) {
        try {
          reflections = makeSigilReflections(renderer);
          scene.environment = reflections.texture;
          scene.environmentIntensity = .95;
        } catch {
          renderer.setRenderTarget(null);
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.autoClear = true;
        }
      }
      mesh.material.metalness = reflections ? metalness : Math.min(metalness, .3);
      if (openingRect) {
        const anisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
        const { map, normalMap, roughnessMap } = mesh.material;
        for (const texture of [map, normalMap, roughnessMap]) {
          if (texture) texture.anisotropy = anisotropy;
        }
      }
      mesh.material.needsUpdate = true;
    }

    function initRenderer() {
      try {
        const context = canvas.getContext("webgl2", { alpha: true, antialias: true })
          || canvas.getContext("webgl2", { alpha: true, antialias: false });
        if (!context) return;
        renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
        renderer.debug.onShaderError = (gl, program) => {
          throw new Error(gl.getProgramInfoLog(program) || "Не удалось скомпилировать шейдер рамки.");
        };
        renderer.setClearColor(0, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.13;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      } catch (error) {
        gpuFailed = true;
        console.warn("Не удалось запустить WebGL для рамки.", error);
      }
    }

    async function loadModel() {
      let model;
      try {
        const url = source.dataset.coverFrameModel;
        const backup = url.replace(/\.glb(?=[?#]|$)/, "-data.js");
        ({ scene: model } = await loadSigilGLB(url, backup, signal));
        if (signal.aborted) { disposeSigilGeometry(model); return; }

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
        camera.position.z = 400;
        const key = new THREE.DirectionalLight(0xffffff, 1.55);
        const fill = new THREE.DirectionalLight(0xdce7ff, .95);
        key.position.set(-3, 4, 5);
        fill.position.set(4, -2, 3);
        scene.add(key, fill);
        prepareModel(model);
        initRenderer();
        fitModel();
      } catch (error) {
        disposeSigilGeometry(model);
        mesh?.removeFromParent();
        mesh = undefined;
        unavailable = true;
        if (!signal.aborted) {
          showFallback(photo);
          console.warn("Не удалось загрузить 3D-рамку.", error);
        }
      }
    }

    function schedule() {
      if (!frame && fitted && visible && !unavailable && !document.hidden && !signal.aborted) {
        frame = requestAnimationFrame(draw);
      }
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = previous = 0;
    }

    function draw(stamp) {
      frame = 0;
      if (!fitted || !visible || unavailable || document.hidden || signal.aborted) return;
      let useSoftware = !renderer || contextLost || gpuFailed;
      if ((useSoftware || weave || isOverlay || (autoplay && !hovered)) && previous && stamp - previous < 30) {
        schedule();
        return;
      }
      const dt = previous ? Math.min(.05, (stamp - previous) / 1000) : 1 / 60;
      const calm = reduced.matches;
      const idle = autoplay && photo === source ? .7 : 0;
      let target = hovered || weave ? 1 : idle;
      if (isOverlay) target = hovered ? 1.15 : .85;
      if (calm) target *= .8;
      const difference = target - strength;
      strength = Math.abs(difference) < .003
        ? target : strength + difference * (1 - Math.exp(-7 * dt));
      uniforms.frameMotion.value = weave ? 0 : strength * capScale;
      uniforms.framePointer.value.lerp(pointer, 1 - Math.exp(-12 * dt));
      if (strength) uniforms.frameTime.value += dt * (calm ? .56 : 1) * motionRate;
      uniforms.frameSideMotion.value = ripples ? stageWave.amplitude * strength * capScale : 0;
      uniforms.frameSidePhase.value = stageWave.rate * uniforms.frameTime.value;
      weave?.(uniforms.frameTime.value, strength);

      if (!useSoftware) {
        try {
          if (gpuNeedsLight) {
            lightModel();
            gpuNeedsLight = false;
          }
          if (gpuNeedsFit) {
            const deviceRatio = window.devicePixelRatio || 1;
            const longSide = Math.max(canvasWidth, canvasHeight);
            const ratio = openingRect ? Math.min(Math.max(2, deviceRatio * 1.25), 3, 2304 / longSide)
              : Math.min(deviceRatio, 2, 1600 / longSide);
            renderer.setPixelRatio(ratio);
            renderer.setSize(canvasWidth, canvasHeight, false);
            gpuNeedsFit = false;
          }
          renderer.render(scene, camera);
        } catch (error) {
          gpuFailed = useSoftware = true;
          console.warn("Не удалось отрисовать рамку через WebGL.", error);
        }
      }
      try {
        if (useSoftware) {
          if (!softwareCanvas) {
            softwareCanvas = document.createElement("canvas");
            softwareCanvas.className = "cover-frame-canvas cover-frame-cpu";
            softwareCanvas.setAttribute("aria-hidden", "true");
            photo.append(softwareCanvas);
            drawSoftware = createSoftwareFrame(softwareCanvas, mesh, uniforms, Boolean(openingRect));
          }
          drawSoftware(canvasWidth, canvasHeight);
        }
        paintOpening?.(uniforms.frameSidePhase.value, uniforms.frameSideMotion.value);
        photo.removeAttribute("data-cover-frame-fallback");
        photo.removeAttribute("data-cover-frame-software");
        photo.toggleAttribute("data-cover-frame-cpu", useSoftware);
        photo.toggleAttribute("data-cover-frame-live", true);
      } catch (error) {
        unavailable = true;
        showFallback(photo);
        console.warn("Не удалось отрисовать 3D-рамку.", error);
      }
      previous = strength ? stamp : 0;
      if (strength) schedule();
    }

    const hoverTarget = () => photo === source ? trigger : photo;
    function follow(event) {
      if (event.currentTarget !== hoverTarget() || (event.pointerType !== "mouse" && event.pointerType !== "pen")) return;
      const bounds = photo.getBoundingClientRect();
      if (!(bounds.width && bounds.height)) return;
      pointer.set(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)) - .5,
        .5 - Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)));
      hovered = true;
      schedule();
    }
    function leave(event) {
      if (event.currentTarget !== hoverTarget()) return;
      hovered = false;
      if (strength) schedule();
    }

    for (const target of [trigger, viewerPhoto]) {
      if (!target) continue;
      target.addEventListener("pointerenter", follow, { signal });
      target.addEventListener("pointermove", follow, { passive: true, signal });
      target.addEventListener("pointerleave", leave, { signal });
    }
    reduced.addEventListener("change", schedule, { signal });
    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      contextLost = true;
      previous = 0;
      schedule();
    }, { signal });
    canvas.addEventListener("webglcontextrestored", () => {
      contextLost = false;
      gpuFailed = false;
      gpuNeedsLight = gpuNeedsFit = true;
      schedule();
    }, { signal });
    const sizing = new ResizeObserver(fitModel);
    sizing.observe(canvas);
    const visibility = new IntersectionObserver(entries => {
      const entry = entries.find(entry => entry.target === photo);
      if (!entry) return;
      visible = entry.isIntersecting;
      if (visible) {
        if (isOverlay && !started) {
          started = true;
          void loadModel();
        }
        schedule();
      } else { hovered = false; stop(); }
    }, isOverlay ? { rootMargin: "120px 0px" } : undefined);
    visibility.observe(photo);
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : schedule(), { signal });
    window.addEventListener("pageshow", schedule, { signal });
    window.addEventListener("pagehide", event => {
      stop();
      if (event.persisted) return;
      events.abort();
      sizing.disconnect();
      visibility.disconnect();
      disposeSigilGeometry(mesh);
      reflections?.dispose();
      renderer?.dispose();
    }, { signal });

    if (!isOverlay) void loadModel();
    return function placeFrame(next = source) {
      if (next === photo) return;
      stop();
      visibility.unobserve(photo);
      photo = next;
      photo.append(canvas);
      if (softwareCanvas) photo.append(softwareCanvas);
      hovered = false;
      visible = true;
      fitted = false;
      visibility.observe(photo);
      if (unavailable) showFallback(photo);
      else fitModel();
    };
  }

  const viewer = document.getElementById("photo-viewer");
  const viewerPhoto = viewer?.querySelector(".lightbox-photo");
  const frames = new Map();
  const supportsModel = typeof THREE !== "undefined" && THREE.GLTFLoader && THREE.OrthographicCamera
    && THREE.Vector2 && typeof loadSigilGLB === "function";
  for (const photo of document.querySelectorAll("[data-cover-frame-model]")) {
    const artwork = frameArt[photo.dataset.mediaFrame];
    if (supportsModel && artwork) frames.set(photo, mountFrame(photo, artwork, artwork.openingRect ? undefined : viewerPhoto));
    else showFallback(photo);
  }

  if (!viewerPhoto) return;
  let placeFrame;
  function restoreFrame() {
    if (!viewerPhoto.hasAttribute("data-media-frame")) return;
    placeFrame?.();
    placeFrame = undefined;
    viewerPhoto.removeAttribute("data-media-frame");
    viewerPhoto.removeAttribute("data-cover-frame-model");
    viewerPhoto.removeAttribute("data-cover-frame-live");
    viewerPhoto.removeAttribute("data-cover-frame-cpu");
    viewerPhoto.removeAttribute("data-cover-frame-fallback");
    viewerPhoto.removeAttribute("data-cover-frame-software");
    viewerPhoto.style.removeProperty("--frame-photo-clip");
    viewerPhoto.style.removeProperty("--frame-photo-scale");
  }

  viewer.addEventListener("photo-viewer-open", ({ detail: source }) => {
    restoreFrame();
    const { mediaFrame, coverFrameModel } = source.dataset;
    if (!coverFrameModel || !frameArt[mediaFrame]) return;
    viewerPhoto.dataset.mediaFrame = mediaFrame;
    viewerPhoto.dataset.coverFrameModel = coverFrameModel;
    placeFrame = frames.get(source);
    if (placeFrame) placeFrame(viewerPhoto);
    else showFallback(viewerPhoto);
  });
  viewer.addEventListener("beforetoggle", event => {
    if (event.newState === "closed") restoreFrame();
  });
  viewer.addEventListener("close", () => {
    if (!viewer.open) restoreFrame();
  });
})();
