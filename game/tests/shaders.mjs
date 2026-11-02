import { Renderer } from "../src/renderer.js";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = mkdtempSync(join(tmpdir(), "adventure-shaders-"));
const vertex = `#version 300 es
out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
class ShaderCheck extends Renderer {
  program(source) {
    const path = join(
      directory,
      `shader-${(this.number = (this.number || 0) + 1)}.frag`,
    );
    writeFileSync(
      path,
      source.startsWith("#version") ? source : "#version 300 es\n" + source,
    );
    const result = spawnSync("glslangValidator", ["-S", "frag", path], {
      encoding: "utf8",
    });
    if (result.status !== 0) throw new Error(result.stdout + result.stderr);
    return {};
  }
  texture() {
    return {};
  }
  target() {
    return {};
  }
}
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
new ShaderCheck({
  getContext: () => ({ bindVertexArray() {}, createVertexArray() {} }),
});
const path = join(directory, "screen.vert");
writeFileSync(path, vertex);
const result = spawnSync("glslangValidator", ["-S", "vert", path], {
  encoding: "utf8",
});
if (result.status !== 0) throw new Error(result.stdout + result.stderr);
console.log("All fragment shaders and full-screen vertex shader compile.");
