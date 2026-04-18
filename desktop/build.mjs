import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["electron"],
  outfile: "dist/main.cjs",
  sourcemap: true,
  logLevel: "info"
};

if (isWatch) {
  const watchContext = await context(options);
  await watchContext.watch();
  console.log("Watching desktop main process bundle...");
} else {
  await build(options);
}
