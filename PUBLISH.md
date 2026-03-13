# Step-by-Step: Publish MCP Cheatsheet to npm

Follow these steps to publish your package to npm with your name as owner.

---

## Step 0: Replace Placeholders

Before publishing, replace these in your files:

| File | Replace | With |
|------|---------|------|
| `package.json` | `@YOUR_NPM_USERNAME` | Your npm username (e.g. `johndoe`) |
| `package.json` | `YOUR_NAME <your.email@example.com>` | Your name and email |
| `package.json` | `YOUR_GITHUB_USERNAME` | Your GitHub username |
| `README.md` | `@YOUR_NPM_USERNAME` | Your npm username (3 places) |
| `README.md` | `Your Name` | Your name |
| `README.md` | `YOUR_GITHUB_USERNAME` | Your GitHub username |

---

## Step 1: Create an npm Account

1. Go to [https://www.npmjs.com/signup](https://www.npmjs.com/signup)
2. Sign up with email (or GitHub)
3. **Verify your email** (required before publishing)
4. (Recommended) Enable **2FA** in Account Settings → Two-Factor Authentication

---

## Step 2: Login via Terminal

```bash
npm login
```

Enter your npm username, password, and email when prompted.

---

## Step 3: Choose Your Package Name

**Option A: Scoped (recommended)** – Your username guarantees uniqueness:
- Name: `@YOUR_NPM_USERNAME/mcp-cheatsheet`
- Example: `@johndoe/mcp-cheatsheet`
- Install: `npm install @johndoe/mcp-cheatsheet`

**Option B: Unscoped** – Must be globally unique:
- Check: [https://www.npmjs.com/package/mcp-cheatsheet](https://www.npmjs.com/package/mcp-cheatsheet)
- If taken, try: `mcp-cheatsheet-db-api`, `cursor-mcp-debug-tools`, etc.

Update `package.json` → `"name"` with your choice.

---

## Step 4: Update package.json

Edit `package.json` and set:

- `"name"`: `@YOUR_USERNAME/mcp-cheatsheet` (or your chosen name)
- `"author"`: `"Your Name <your.email@example.com>"`
- `"license"`: `"MIT"`
- Remove `"private": true` (or set to `false`)
- Add `"repository"`, `"keywords"`, `"bugs"`, `"homepage"` (see template below)

---

## Step 5: Create GitHub Repo (Optional but Recommended)

1. Create a new repo on GitHub (e.g. `mcp-cheatsheet`)
2. **Do NOT** commit `.env` or `node_modules`
3. Add to `.gitignore`: `.env`, `node_modules/`
4. Push your code

---

## Step 6: Dry Run (Test Before Publish)

```bash
cd .mcp-cheatsheet
npm pack --dry-run
```

This shows which files will be included. Ensure `.env` is NOT in the list.

---

## Step 7: Publish

```bash
cd .mcp-cheatsheet
npm publish --access public
```

- For **scoped** packages (`@username/...`): `--access public` is required (default is private)
- For **unscoped** packages: `npm publish` is enough

---

## Step 8: Verify

1. Visit `https://www.npmjs.com/package/@YOUR_USERNAME/mcp-cheatsheet`
2. Test install: `npm install @YOUR_USERNAME/mcp-cheatsheet`

---

## Publishing Updates Later

```bash
npm version patch   # 1.0.0 → 1.0.1
npm publish
```

Or `npm version minor` (1.0.0 → 1.1.0) or `npm version major` (1.0.0 → 2.0.0).

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `402 Payment Required` | Scoped package is private; use `npm publish --access public` |
| `403 Forbidden` | Package name taken; choose another or use scoped name |
| `404 Not Found` | Not logged in; run `npm login` |
| `Email not verified` | Verify email in npm account settings |
