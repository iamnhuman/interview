"use strict";

const sigilBlades = (() => {
  // Centre-line points are [x, y, z, half-width, twist in radians].
  const wings = [
    [
      [.12, -2.51, .12, .006, -.1], [.50, -1.53, .40, .17, -.3],
      [.46, -.78, .57, .28, -.2], [.95, -.25, .69, .33, .18],
      [1.51, .15, .49, .40, .42], [1.94, .88, .09, .27, .32],
      [2.31, 1.12, -.04, .13, .22], [2.92, 1.56, -.14, .007, .1],
    ],
    [
      [.75, -.46, .21, .10, .15], [1.15, .24, .22, .23, -.1],
      [1.18, .95, .34, .27, -.2], [1.30, 1.62, .23, .17, .15],
      [1.78, 2.17, .09, .13, .45], [2.39, 2.64, -.06, .006, .35],
    ],
    [
      [.98, -.19, .31, .12, -.2], [1.49, -.18, .32, .18, -.1],
      [1.92, -.55, .09, .22, .1], [2.14, -.99, -.16, .12, .25],
      [2.57, -1.40, -.27, .006, .35],
    ],
    [
      [.22, -.28, -.05, .07, .15], [.48, .13, -.15, .14, -.2],
      [.67, .78, -.10, .10, -.36], [.41, 1.39, .08, .085, -.2],
      [.42, 1.90, .12, .05, -.15], [.76, 2.30, .03, .006, .1],
    ],
  ];

  const spine = [
    [0, -2.81, .38, .006, 0], [0, -1.61, .58, .115, 0],
    [0, -.90, .49, .09, 0], [0, -.23, .22, .29, 0],
    [0, .15, .32, .32, 0], [0, .66, .33, .16, 0],
    [0, 1.38, .10, .10, 0], [0, 2.77, -.03, .006, 0],
  ];

  const inlay = [
    [0, -.76, .70, .004, 0], [0, -.22, .66, .115, 0],
    [0, .07, .66, .185, 0], [0, .32, .59, .105, 0],
    [0, .72, .53, .004, 0],
  ];

  const section = [
    [-1, 0], [-.64, .31], [0, .65], [.64, .31],
    [1, 0], [.62, -.24], [0, -.40], [-.62, -.24],
  ];

  function sample(pointA, pointB, pointC, pointD, fraction) {
    const squared = fraction * fraction;
    const cubed = squared * fraction;
    return pointB.map((b, coordinate) => {
      const a = pointA[coordinate], c = pointC[coordinate], d = pointD[coordinate];
      return .5 * (2 * b + (c - a) * fraction
        + (2 * a - 5 * b + 4 * c - d) * squared + (3 * b - a - 3 * c + d) * cubed);
    });
  }

  function blade(path, mirror = 1, finish = "chrome") {
    const points = [];
    const samplesPerSegment = 9;
    for (let i = 0; i < path.length - 1; i++) {
      const before = path[Math.max(0, i - 1)];
      const after = path[Math.min(path.length - 1, i + 2)];
      for (let j = 0; j < samplesPerSegment; j++) {
        points.push(sample(before, path[i], path[i + 1], after, j / samplesPerSegment));
      }
    }
    points.push(path.at(-1));

    const positions = [];
    const indices = [];
    const sides = section.length;
    for (let ring = 0; ring < points.length; ring++) {
      const [x, y, z, width, twist] = points[ring];
      const before = points[Math.max(0, ring - 1)];
      const after = points[Math.min(points.length - 1, ring + 1)];
      const dx = mirror * (after[0] - before[0]);
      const dy = after[1] - before[1], dz = after[2] - before[2];
      const plane = Math.hypot(dx, dy);
      const length = Math.hypot(plane, dz);
      const sx = -dy / plane, sy = dx / plane;
      const nx = -dz * sy / length, ny = dz * sx / length, nz = plane / length;
      const size = Math.max(.004, width);
      const cos = Math.cos(twist * mirror), sin = Math.sin(twist * mirror);
      for (let side = 0; side < sides; side++) {
        const [offset, bevel] = section[side];
        const lateral = size * (offset * cos - bevel * sin);
        const depth = size * (offset * sin + bevel * cos);
        positions.push(mirror * x + sx * lateral + nx * depth, y + sy * lateral + ny * depth, z + nz * depth);
        if (ring === 0) continue;
        const current = ring * sides + side;
        const next = ring * sides + (side + 1) % sides;
        indices.push(current - sides, current, next, current - sides, next, next - sides);
      }
    }

    const last = (points.length - 1) * sides;
    for (let i = 1; i < sides - 1; i++) indices.push(0, i, i + 1, last, last + i + 1, last + i);
    return { positions, indices, finish };
  }

  return [...wings.flatMap((path) => [blade(path), blade(path, -1)]), blade(spine), blade(inlay, 1, "inlay")];
})();
