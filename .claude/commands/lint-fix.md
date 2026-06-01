# Lint Fix — NestJS Backend

Run ESLint auto-fix across the entire backend, then do a TypeScript build check to confirm zero errors remain.

## Steps

1. Run the linter with auto-fix:
```bash
cd /Users/victormisiko/Desktop/CMS/nestapi-cms && npm run lint 2>&1
```

2. Run a TypeScript build check:
```bash
cd /Users/victormisiko/Desktop/CMS/nestapi-cms && npm run build 2>&1
```

3. Report the results:
   - List every file that was changed by the linter (if any).
   - List every TypeScript error that still exists after the build (if any).
   - For each remaining TypeScript error, explain the root cause and fix it — do not just suppress with `any` or `@ts-ignore` unless there is no other option.
   - Repeat build check until it passes with zero errors.

## Rules
- Never disable `strictNullChecks` or add `// @ts-nocheck` to work around errors.
- If a lint rule is wrong for this codebase, explain why and ask before disabling it.
- Prefer explicit return types on exported functions and service methods to prevent TypeScript widening errors.
