# Third-party notices

| Component | Where | License |
|---|---|---|
| [sa2-nx-installer](https://github.com/ChanseyIsTheBest/sa2-nx-installer) by ChanseyIsTheBest (commit `bb4fc2f`): this page as it was before the Shank 2 changes (the deko3d shader chain in the page, the STFS reader, the asset pack writer, the tests) | everything | GPL-3.0 |
| [nfsmw-nx-installer](https://github.com/StevensND/nfsmw-nx-installer) by StevensND (commit `e7ec1b65`): the page's structure and style, the service worker (`sw.js`), the worker's download stream, the XEX reader (`lib/xex.js`), the zip writer (`lib/zip.js`), the language picker and its flags | `sw.js`, `worker.js`, `app.js`, `index.html`, `lib/` | GPL-3.0 |
| [DirectXShaderCompiler](https://github.com/microsoft/DirectXShaderCompiler) v2025.1 (commit `75a029d95`), unmodified, with its bundled SPIRV-Tools and SPIRV-Headers, and the `dxc_web.cpp` wrapper, as built by nfsmw-nx-installer | `wasm/dxc_web.*` | University of Illinois/NCSA Open Source License (LLVM); SPIRV-Tools: Apache-2.0; SPIRV-Headers: MIT; the wrapper: GPL-3.0 |
| Renut's shader translator: XenosRecomp as [reNut](https://github.com/masterspike52/reNut) by masterspike52 carries it (reblue-XenosRecomp), through banjo-nx, with the changes of banjo-nx, peggle2-nx and sa2-nx, and peggle2-nx's `renut_hlsl_frontend.cpp` | `wasm/renut_hlsl.*`, `renut_shader_common.h` | MIT (XenosRecomp); the front end: GPL-3.0 |
| [SPIRV-Cross](https://github.com/KhronosGroup/SPIRV-Cross) by the Khronos Group (commit `22b22f56`), unmodified, as built by peggle2-nx-installer | `wasm/spirv_cross.*` | Apache-2.0 |
| The deko3d GLSL conversion and passes (sa2-nx's and banjo-nx's `tools/deko3d_glsl.py`, `tools/deko3d_glsl_opt.py`) in JavaScript, and the package writer, from [peggle2-nx-installer](https://github.com/ChanseyIsTheBest/peggle2-nx-installer) | `lib/deko3d_glsl.js`, `lib/deko3d_package.js` | GPL-3.0 |
| [libmspack](https://www.cabextract.org.uk/libmspack/) by Stuart Caie (LZX decoder) | `wasm/lzx.*` | LGPL-2.1 |
| [xxHash](https://github.com/Cyan4973/xxHash) by Yann Collet | `wasm/renut_hlsl.*` | BSD-2-Clause |
| [Emscripten](https://emscripten.org) runtime | `wasm/*.mjs` | MIT and the University of Illinois/NCSA Open Source License |

`wasm/lzx.*` is built from the sa2-nx repository with `shaders/wasm/build_wasm_tools.sh` (Emscripten 6.0.11).
libmspack is covered by the GNU Lesser General Public License 2.1: `wasm/lzx.wasm` is built from the unmodified
libmspack sources (`lzxd.c` and `system.c`, at the commit pinned by ReXGlue SDK v0.10.0, in `sdk/thirdparty/libmspack`
of sa2-nx) and `shaders/wasm/sa2_lzx.cpp` of sa2-nx. With those sources it can be rebuilt and replaced by a modified
version. `lib/zipread.js` (reading the shaders out of the game's archive) is new for Shank 2.

The licenses of the software in the package (the NRO and its libraries) are in [release/LICENSES.txt](release/LICENSES.txt),
and the source code with its license is at https://github.com/zhtipu/shank2-nx.

The icon is based on Shank 2's artwork; Shank and Shank 2 are trademarks of Klei Entertainment.
