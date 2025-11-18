import { TransformMath } from "@vertex-link/engine";

const output = document.getElementById("output")!;

async function runTransformDemo() {
  output.innerHTML = '<div>Loading ztransform module...</div>';

  try {
    // Initialize the transform math module
    const math = await TransformMath.create();

    let html = '<h2>Zig Transform Math Module</h2>';
    html += '<div class="status">✓ Module loaded and ready</div>';

    // ========================================================================
    // Vector Operations
    // ========================================================================
    html += '<h3>Vector Operations</h3>';

    const v1 = math.vec3(1, 2, 3);
    const v2 = math.vec3(4, 5, 6);
    html += `<div><strong>v1</strong> = [${Array.from(v1).join(", ")}]</div>`;
    html += `<div><strong>v2</strong> = [${Array.from(v2).join(", ")}]</div>`;

    const vAdd = math.vec3Add(v1, v2);
    html += `<div><code>add(v1, v2)</code> = [${Array.from(vAdd).map(n => n.toFixed(2)).join(", ")}]</div>`;

    const vSub = math.vec3Sub(v2, v1);
    html += `<div><code>sub(v2, v1)</code> = [${Array.from(vSub).map(n => n.toFixed(2)).join(", ")}]</div>`;

    const vCross = math.vec3Cross(v1, v2);
    html += `<div><code>cross(v1, v2)</code> = [${Array.from(vCross).map(n => n.toFixed(2)).join(", ")}]</div>`;

    const vDot = math.vec3Dot(v1, v2);
    html += `<div><code>dot(v1, v2)</code> = ${vDot.toFixed(2)}</div>`;

    const vLen = math.vec3Length(v1);
    html += `<div><code>length(v1)</code> = ${vLen.toFixed(2)}</div>`;

    const vNorm = math.vec3Normalize(v1);
    html += `<div><code>normalize(v1)</code> = [${Array.from(vNorm).map(n => n.toFixed(4)).join(", ")}]</div>`;

    const vDist = math.vec3Distance(v1, v2);
    html += `<div><code>distance(v1, v2)</code> = ${vDist.toFixed(2)}</div>`;

    // ========================================================================
    // Matrix Transformations
    // ========================================================================
    html += '<h3>Matrix Transformations</h3>';

    const identity = math.mat4Identity();
    html += '<div><strong>Identity Matrix:</strong></div>';
    html += formatMatrix(identity);

    const translated = math.mat4Translate(identity, 5, 10, 15);
    html += '<div><strong>Translated (5, 10, 15):</strong></div>';
    html += formatMatrix(translated);

    const scaled = math.mat4Scale(identity, 2, 3, 4);
    html += '<div><strong>Scaled (2, 3, 4):</strong></div>';
    html += formatMatrix(scaled);

    const rotated = math.mat4RotateY(identity, math.degToRad(45));
    html += '<div><strong>Rotated 45° around Y axis:</strong></div>';
    html += formatMatrix(rotated);

    // Combined transformation
    let transform = math.mat4Identity();
    transform = math.mat4Translate(transform, 10, 0, 0);
    transform = math.mat4RotateY(transform, math.degToRad(90));
    transform = math.mat4Scale(transform, 2, 2, 2);
    html += '<div><strong>Combined (Translate → Rotate → Scale):</strong></div>';
    html += formatMatrix(transform);

    // ========================================================================
    // Camera Matrices
    // ========================================================================
    html += '<h3>Camera Matrices</h3>';

    const projection = math.mat4Perspective(
      math.degToRad(60),  // 60° FOV
      16 / 9,             // Aspect ratio
      0.1,                // Near plane
      100                 // Far plane
    );
    html += '<div><strong>Perspective (60° FOV, 16:9, near=0.1, far=100):</strong></div>';
    html += formatMatrix(projection);

    const view = math.mat4LookAt(
      math.vec3(0, 5, 10),  // Eye position
      math.vec3(0, 0, 0),   // Look at target
      math.vec3(0, 1, 0)    // Up vector
    );
    html += '<div><strong>View (lookAt from [0,5,10] to origin):</strong></div>';
    html += formatMatrix(view);

    const ortho = math.mat4Ortho(-10, 10, -10, 10, 0.1, 100);
    html += '<div><strong>Orthographic (-10 to 10, near=0.1, far=100):</strong></div>';
    html += formatMatrix(ortho);

    // ========================================================================
    // Quaternions
    // ========================================================================
    html += '<h3>Quaternion Operations</h3>';

    const quatIdentity = math.quatIdentity();
    html += `<div><strong>Identity Quat:</strong> [${Array.from(quatIdentity).map(n => n.toFixed(4)).join(", ")}]</div>`;

    const axis = math.vec3Normalize(math.vec3(1, 1, 0));
    const quat = math.quatFromAxisAngle(axis, math.degToRad(90));
    html += `<div><strong>Quat from axis [${Array.from(axis).map(n => n.toFixed(4)).join(", ")}], 90°:</strong></div>`;
    html += `<div>[${Array.from(quat).map(n => n.toFixed(4)).join(", ")}]</div>`;

    const quatMat = math.quatToMat4(quat);
    html += '<div><strong>Quat to Matrix:</strong></div>';
    html += formatMatrix(quatMat);

    // Quaternion interpolation
    const q1 = math.quatFromAxisAngle(math.vec3(0, 1, 0), 0);
    const q2 = math.quatFromAxisAngle(math.vec3(0, 1, 0), math.degToRad(180));
    const qInterp = math.quatSlerp(q1, q2, 0.5);
    html += `<div><strong>Slerp (0° to 180°, t=0.5):</strong></div>`;
    html += `<div>[${Array.from(qInterp).map(n => n.toFixed(4)).join(", ")}]</div>`;

    // ========================================================================
    // Matrix Inverse
    // ========================================================================
    html += '<h3>Matrix Inversion</h3>';

    const testMatrix = math.mat4Translate(identity, 5, 10, 15);
    const inverted = math.mat4Invert(testMatrix);
    if (inverted) {
      html += '<div><strong>Original Matrix:</strong></div>';
      html += formatMatrix(testMatrix);
      html += '<div><strong>Inverted Matrix:</strong></div>';
      html += formatMatrix(inverted);

      // Verify: M * M^-1 = I
      const verify = math.mat4Multiply(testMatrix, inverted);
      html += '<div><strong>Verification (M × M⁻¹ ≈ I):</strong></div>';
      html += formatMatrix(verify);
    } else {
      html += '<div class="error">Matrix inversion failed (singular matrix)</div>';
    }

    // ========================================================================
    // Utility Functions
    // ========================================================================
    html += '<h3>Utility Functions</h3>';

    html += `<div><code>degToRad(180)</code> = ${math.degToRad(180).toFixed(4)} (π)</div>`;
    html += `<div><code>radToDeg(π)</code> = ${math.radToDeg(Math.PI).toFixed(2)}°</div>`;
    html += `<div><code>clamp(15, 0, 10)</code> = ${math.clamp(15, 0, 10)}</div>`;
    html += `<div><code>lerp(0, 100, 0.5)</code> = ${math.lerp(0, 100, 0.5)}</div>`;

    // ========================================================================
    // Performance Benchmark
    // ========================================================================
    html += '<h3>Performance Benchmark</h3>';

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      let m = math.mat4Identity();
      m = math.mat4Translate(m, i, i, i);
      m = math.mat4RotateY(m, i * 0.01);
      m = math.mat4Scale(m, 2, 2, 2);
    }

    const end = performance.now();
    const duration = end - start;
    const opsPerSecond = (iterations / duration * 1000).toFixed(0);

    html += `<div><strong>${iterations.toLocaleString()} operations</strong> in ${duration.toFixed(2)}ms</div>`;
    html += `<div><strong>~${Number(opsPerSecond).toLocaleString()} ops/sec</strong></div>`;
    html += `<div><strong>${(duration / iterations * 1000).toFixed(2)} µs/operation</strong></div>`;

    output.innerHTML = html;
  } catch (error) {
    output.innerHTML = `<div class="error">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
    console.error("Transform demo error:", error);
  }
}

function formatMatrix(mat: Float32Array): string {
  const values = Array.from(mat).map(n => n.toFixed(2).padStart(8));
  let html = '<div class="matrix">';
  for (let row = 0; row < 4; row++) {
    html += '<div class="matrix-row">';
    for (let col = 0; col < 4; col++) {
      const index = col * 4 + row; // Column-major
      html += `<span>${values[index]}</span>`;
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

// Add some basic styling
const style = document.createElement('style');
style.textContent = `
  #output {
    font-family: 'Courier New', monospace;
    padding: 20px;
    max-width: 900px;
  }

  #output h2 {
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
  }

  #output h3 {
    color: #34495e;
    margin-top: 30px;
    margin-bottom: 15px;
    border-bottom: 1px solid #bdc3c7;
    padding-bottom: 5px;
  }

  #output > div {
    margin: 5px 0;
    line-height: 1.6;
  }

  #output code {
    background: #ecf0f1;
    padding: 2px 6px;
    border-radius: 3px;
    color: #e74c3c;
  }

  #output strong {
    color: #2c3e50;
  }

  .status {
    color: #27ae60;
    font-weight: bold;
    margin: 10px 0;
  }

  .error {
    color: #e74c3c;
    font-weight: bold;
    background: #fadbd8;
    padding: 10px;
    border-radius: 5px;
    margin: 10px 0;
  }

  .matrix {
    font-family: 'Courier New', monospace;
    margin: 10px 0;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 5px;
    display: inline-block;
  }

  .matrix-row {
    display: flex;
    gap: 4px;
  }

  .matrix-row span {
    display: inline-block;
    text-align: right;
    font-size: 12px;
    color: #495057;
  }
`;
document.head.appendChild(style);

runTransformDemo();
