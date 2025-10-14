zeno@MacBook-Pro-4 collabcanvas % pnpm dev

> collabcanvas@0.0.0 dev /Users/zeno/Projects/collabcanvas
> vite


  VITE v7.1.9  ready in 229 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help

node:internal/event_target:1101
  process.nextTick(() => { throw err; });
                           ^
Error: Invalid Options:
- Unknown options: extensions, ignorePath, reportUnusedDisableDirectives, resolvePluginsRelativeTo, rulePaths, useEslintrc
- 'extensions' has been removed.
- 'resolvePluginsRelativeTo' has been removed.
- 'ignorePath' has been removed.
- 'rulePaths' has been removed. Please define your rules using plugins.
- 'reportUnusedDisableDirectives' has been removed. Please use the 'overrideConfig.linterOptions.reportUnusedDisableDirectives' option instead.
    at processOptions (/Users/zeno/Projects/collabcanvas/node_modules/.pnpm/eslint@9.37.0_jiti@2.6.1/node_modules/eslint/lib/eslint/eslint-helpers.js:980:9)
    at new ESLint (/Users/zeno/Projects/collabcanvas/node_modules/.pnpm/eslint@9.37.0_jiti@2.6.1/node_modules/eslint/lib/eslint/eslint.js:704:28)
    at Object.configureServer (file:///Users/zeno/Projects/collabcanvas/node_modules/.pnpm/vite-plugin-checker@0.11.0_eslint@9.37.0_jiti@2.6.1__optionator@0.9.4_typescript@5.9.3_vite@7_ab4edpx2wkvvtjjah5gxtje5lm/node_modules/vite-plugin-checker/dist/checkers/eslint/main.js:77:18)
    at MessagePort.<anonymous> (file:///Users/zeno/Projects/collabcanvas/node_modules/.pnpm/vite-plugin-checker@0.11.0_eslint@9.37.0_jiti@2.6.1__optionator@0.9.4_typescript@5.9.3_vite@7_ab4edpx2wkvvtjjah5gxtje5lm/node_modules/vite-plugin-checker/dist/worker.js:61:26)
    at [nodejs.internal.kHybridDispatch] (node:internal/event_target:827:20)
    at MessagePort.<anonymous> (node:internal/per_context/messageport:23:28) {
  code: 'ESLINT_INVALID_OPTIONS'
}

Node.js v23.9.0
 ELIFECYCLE  Command failed with exit code 1.