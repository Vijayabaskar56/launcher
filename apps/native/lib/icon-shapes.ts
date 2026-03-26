import type { IconShape } from "@/types/settings";

const circlePath = (size: number): string => {
  const r = size / 2;
  return [
    `M ${r} 0`,
    `A ${r} ${r} 0 1 1 ${r} ${size}`,
    `A ${r} ${r} 0 1 1 ${r} 0`,
    "Z",
  ].join(" ");
};

const squarePath = (size: number): string => `M 0 0 H ${size} V ${size} H 0 Z`;

const roundedRectPath = (size: number, radius: number): string => {
  const r = Math.min(radius, size / 2);
  const s = size;
  return [
    `M ${r} 0`,
    `H ${s - r}`,
    `A ${r} ${r} 0 0 1 ${s} ${r}`,
    `V ${s - r}`,
    `A ${r} ${r} 0 0 1 ${s - r} ${s}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${s - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
};

/**
 * Superellipse (squircle) path — iOS-style continuous corners.
 * Uses cubic bezier approximation of |x|^4 + |y|^4 = r^4.
 */
const squirclePath = (size: number): string => {
  const s = size;
  const h = s / 2;
  // Control point offset for squircle approximation (~0.85 of radius)
  const k = h * 0.85;

  return [
    `M ${h} 0`,
    `C ${h + k} 0, ${s} ${h - k}, ${s} ${h}`,
    `C ${s} ${h + k}, ${h + k} ${s}, ${h} ${s}`,
    `C ${h - k} ${s}, 0 ${h + k}, 0 ${h}`,
    `C 0 ${h - k}, ${h - k} 0, ${h} 0`,
    "Z",
  ].join(" ");
};

/**
 * Teardrop shape — rounded on 3 corners, pointed top-right.
 */
const teardropPath = (size: number): string => {
  const s = size;
  // corner radius for rounded corners
  const r = s * 0.35;

  return [
    // Start at top-left (rounded)
    `M ${r} 0`,
    // Top edge to top-right corner (sharp point)
    `L ${s} 0`,
    // Right edge down (no rounding at top-right)
    `V ${s - r}`,
    // Bottom-right corner (rounded)
    `A ${r} ${r} 0 0 1 ${s - r} ${s}`,
    // Bottom edge
    `H ${r}`,
    // Bottom-left corner (rounded)
    `A ${r} ${r} 0 0 1 0 ${s - r}`,
    // Left edge up
    `V ${r}`,
    // Top-left corner (rounded)
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
};

/**
 * Regular hexagon inscribed in the given size.
 */
const hexagonPath = (size: number): string => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = ((i * 60 - 90) * Math.PI) / 180;
    return `${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`;
  });

  return `M ${points[0]} ${points
    .slice(1)
    .map((p) => `L ${p}`)
    .join(" ")} Z`;
};

/**
 * Returns an SVG path string for the given icon shape and size.
 * Pure function — no React dependencies.
 */
export const getIconClipPath = (shape: IconShape, size: number): string => {
  switch (shape) {
    case "circle": {
      return circlePath(size);
    }
    case "square": {
      return squarePath(size);
    }
    case "rounded-square": {
      return roundedRectPath(size, size * 0.2);
    }
    case "squircle": {
      return squirclePath(size);
    }
    case "teardrop": {
      return teardropPath(size);
    }
    case "hexagon": {
      return hexagonPath(size);
    }
    default: {
      return circlePath(size);
    }
  }
};
