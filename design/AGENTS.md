# fire-design

React 19 + Vite + Tailwind CSS design prototype for Fire, managed with npm.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # type-check with tsc, then build to dist/
npm run preview   # serve the production build
npm run format    # format with oxfmt
```

## Project Structure

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell with page metadata, containing the `#root` element and loading `src/main.tsx`
- `package.json` - Dependencies and the dev, build, preview, and format scripts
- `vite.config.ts` - Vite configuration with React and Tailwind CSS v4 plugins plus the `@` alias for `src`

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This project does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- `npm run build` runs `tsc` first, so type and syntax errors fail the build.
- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings.
- Export components as default exports.
