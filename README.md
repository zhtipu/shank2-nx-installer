<div align=center>

<img width="616" height="353" alt="capsule_616x353" src="https://github.com/user-attachments/assets/3b4a92a2-df88-4775-a116-905eff507ec2" />

</div>
<h1 align=center>shank2-nx installer</h1>

The installer page of [shank2-nx](https://github.com/zhtipu/shank2-nx), the native Nintendo Switch port of Shank 2:
**https://zhtipu.github.io/shank2-nx-installer/**

You give it your own copy of the Xbox Live Arcade game (its content package, or a folder you extracted it into) and it
gives you a zip ready to extract into `sdmc:/switch/`. Everything runs in your browser: the game files never leave
your computer.

## What it does 


1. Finds the game in what you chose: its content package (from `Content/0000000000000000/5841120C/000D0000/`, read in
   place, nothing is extracted to disk), the `5841120C` folder of an Xbox 360's `Content` folder, or an extracted game
   with its `default.xex`.
2. Identifies the game by the SHA-256 of `default.xex` (or of its decompressed image, for an executable another tool
   rebuilt) and picks its build from `release/manifest.json`.
3. Downloads that build's NRO and checks its SHA-256.
4. Makes the game's shaders from its own files: the shader containers of the effect files in
   `data-360/data-360.zip` (`shaders/*.fxc`, read with `lib/zipread.js`), translated to HLSL by Renut's translator
   (`wasm/renut_hlsl`), compiled to SPIR-V by DXC, turned into GLSL by SPIRV-Cross (`wasm/spirv_cross`), converted
   and optimised for deko3d (`lib/deko3d_glsl.js`, the build's passes) and packed (`lib/deko3d_package.js`) into
   `deko3d_glsl.bin`. The package must match the build's SHA-256, or nothing is written.
5. Packs the game files into `game_root.nxpack` + `game_root.nxidx` (the SDK's asset pack, `lib/nxpack.js`) and
   streams `shank2-nx.zip` to disk through the service worker, so the 1.3 GB package never has to fit in memory.

The update zip (`shank2-nx-update.zip`) holds only `shank2.nro`, its licenses and the shaders.

## What goes on the SD card - <img width="50" height="50" alt="gflzte2SEjFWHIDZij" src="https://github.com/user-attachments/assets/dc5c65b6-c729-490c-bfed-c45d8b57840e" />

```text
/switch/shank2-nx/
  shank2.nro
  LICENSES.txt
  deko3d_glsl.bin           (the game's shaders, made from your copy)
  deko3d_shaders.bin        (the shaders compiled for the console; written as you play)
  game_root.nxpack          (the files of your game, in one file)
  game_root.nxidx
  shank2.toml               (optional settings)
```

Start it with the NSP from the [shank2-nx releases](https://github.com/zhtipu/shank2-nx/releases) (it holds only
the program and reads everything else from this folder), from the Homebrew Menu in title takeover mode, or with a
39-bit forwarder.

## Publishing a new build

1. Publish a release of shank2-nx with `shank2.nro` as an asset.
2. Update `release/manifest.json` with the page's own code (copy the NRO to `release/` first):

   ```text
   node test/release_node.mjs <game package or folder> release/shank2.nro <tested deko3d_glsl.bin> --version x.y.z --write
   ```

   The tested `deko3d_glsl.bin` is shank2-nx's `port/out/renut_switch_release/sd/deko3d_glsl.bin`: it names the
   shaders the NRO knows.
3. Push: the workflow downloads the NRO from the latest release, checks it against the manifest and deploys the page.

`node test/package_node.mjs <out.zip> <game>` builds the whole zip in Node with the same code, and
`node test/shank2_compare_node.mjs <dump> <glsl_opt>` compares the page's shaders with the native chain's.

## License

GPL-3.0 (`LICENSE`). Third-party parts: `NOTICES.md`.

Shank and Shank 2 are trademarks of Klei Entertainment. This project is not affiliated with or endorsed by Klei
Entertainment, Nintendo or Microsoft, and it does not host or distribute any game data.
