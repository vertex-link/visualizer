/**
 * Create a simple procedural checkerboard texture
 * Returns an ImageBitmap that can be used with ImageResource
 */
export async function createCheckerboardTexture(
  size = 256,
  checkSize = 32
): Promise<ImageBitmap> {
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }

  // Draw checkerboard pattern
  const checksPerRow = size / checkSize;

  for (let y = 0; y < checksPerRow; y++) {
    for (let x = 0; x < checksPerRow; x++) {
      const isEven = (x + y) % 2 === 0;
      ctx.fillStyle = isEven ? "#ffffff" : "#ff6b35";
      ctx.fillRect(x * checkSize, y * checkSize, checkSize, checkSize);
    }
  }

  // Convert to ImageBitmap
  return await createImageBitmap(canvas);
}

/**
 * Create a gradient texture
 */
export async function createGradientTexture(
  width = 256,
  height = 256
): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#4facfe");
  gradient.addColorStop(1, "#00f2fe");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return await createImageBitmap(canvas);
}

/**
 * Create a colored grid texture with numbers
 */
export async function createUVTestTexture(size = 512): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }

  // Background
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, 0, size, size);

  // Grid
  const gridSize = size / 8;
  ctx.strokeStyle = "#ecf0f1";
  ctx.lineWidth = 2;

  for (let i = 0; i <= 8; i++) {
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(i * gridSize, 0);
    ctx.lineTo(i * gridSize, size);
    ctx.stroke();

    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize);
    ctx.lineTo(size, i * gridSize);
    ctx.stroke();
  }

  // Add labels
  ctx.fillStyle = "#e74c3c";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const label = `${x},${y}`;
      ctx.fillText(label, (x + 0.5) * gridSize, (y + 0.5) * gridSize);
    }
  }

  return await createImageBitmap(canvas);
}
