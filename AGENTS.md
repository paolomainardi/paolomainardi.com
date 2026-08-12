# AGENTS.md

## Project Overview

The source of [paolomainardi.com](https://www.paolomainardi.com), a personal
engineering blog. Long technical posts about containers, Kubernetes, Linux and
hardware builds, published as a static site.

The site root is `src/`, not the repository root. Hugo runs with `src/` as its
project directory, so `src/hugo.toml` is the config, `src/content/` holds the
writing, and `src/layouts/` holds the templates.

The theme is [hugo-coder](https://github.com/luizdepra/hugo-coder), pinned as a
git submodule at `src/themes/hugo-coder`. **Never edit the submodule.** Every
visual change is an override in `src/layouts/` or `src/assets/scss/custom.scss`,
which the theme loads last so it wins ties in the cascade.

The visual system is documented in [DESIGN.md](DESIGN.md), which follows the
[DESIGN.md specification](https://github.com/google-labs-code/design.md). Read it
before changing anything that affects the look of the site.

**Tech stack:** Hugo 0.147.2 extended, SCSS compiled by Hugo, vanilla JavaScript
with no dependencies, a Hugo module for asciinema playback, Firebase Hosting.

## Setup

Everything runs in Docker. No local Hugo, Node or Go required.

```bash
just build      # git submodule update --init, then build the image
just up         # start the dev server
just logs       # follow the container logs
```

The dev server is served by [spark-http-proxy](https://github.com/sparkfabrik/http-proxy)
at `https://paolomainardi.loc`. The proxy terminates TLS on 443, so the Hugo
server is started with an explicit scheme and without an appended port:

```
--baseURL=https://paolomainardi.loc/ --appendPort=false --liveReloadPort=443
```

Dropping any of those three flags produces asset URLs on port 80, which fail
under HTTPS and leave the page unstyled.

Run `just` or `just --list` to see all recipes.

## Key Conventions

- **Docker only.** Never install Hugo, Node or Go on the host. Use `just`, or
  `docker compose run --rm --entrypoint "" hugo <command>` for one-off commands.
- **Never edit `src/themes/hugo-coder`.** Override the file in `src/layouts/`
  using the same relative path instead.
- **Never use `!important`.** Theme rules are outranked by scoping component
  rules under `body:is(.colorscheme-light, .colorscheme-dark, .colorscheme-auto)`,
  which adds one class of specificity and wins ties by load order.
- **Post images live in `src/assets/images/`, not `src/static/images/`.** Hugo
  can measure files under `assets/`, which is how the render hooks emit real
  width and height and avoid layout shift. Site chrome (favicons, the portrait)
  stays in `src/static/images/`.
- **No runtime third party requests for the design layer.** Fonts are self
  hosted in `src/static/fonts/`, styles and scripts are local.
- **Talks are data.** `src/data/talks.yaml` drives `/talks/`. Add a talk by
  adding an entry, never by editing the template.

### Where things live

| Path                              | What                                              |
| :-------------------------------- | :------------------------------------------------ |
| `src/hugo.toml`                   | Site config, params, markup and highlight settings |
| `src/assets/scss/custom.scss`     | The whole design system, sectioned and commented   |
| `src/assets/js/`                  | Copy button, section rail. No dependencies         |
| `src/layouts/`                    | Theme overrides and custom templates               |
| `src/layouts/_default/_markup/`   | Render hooks for code blocks, images and tables    |
| `src/layouts/partials/book/`      | Design specific partials                           |
| `src/data/talks.yaml`             | The talks index                                    |
| `src/content/posts/<n>-<slug>/`   | One directory per post, `index.md` inside          |
| `src/assets/images/posts/`        | Post images, measured at build time                |

## Code Style

- **SCSS**: one file, `src/assets/scss/custom.scss`, kept in numbered sections
  with a table of contents at the top. Keep it readable; it is maintained by
  hand. Add new rules to the section they belong to rather than the end.
- **JavaScript**: ES5 syntax in an IIFE, no dependencies, no browser storage
  APIs. Feature detect rather than assume.
- **Templates**: Hugo templates with a leading comment block explaining what the
  template does and why, when the reason is not obvious.
- **Prose in content and templates**: never use em dashes or en dashes. Rewrite
  with a comma, a period, a colon or parentheses.

There is no linter configured. Verify by building.

### Keep DESIGN.md in step with the CSS

`DESIGN.md` is the design system of record, not a description written once. Any
change to a value it names must land in the same commit as the CSS change:

- the type scale, any font size or line height
- palette values, or what an accent is for
- `--frame`, `--offset`, `--measure`, or a breakpoint
- corner radii, spacing steps
- adding, removing or repurposing a component

After editing it, validate:

```bash
npx @google/design.md lint DESIGN.md
```

It must report 0 errors. The only warnings expected are the `-night` colour
tokens reported as unreferenced, which is by design.

If a decision is reversed, say so in the prose rather than deleting the history.
The drop cap entry in the Typography section is the example: it records that the
device was tried and why it was removed, so nobody adds it back.

## Build and Verify

```bash
# Production build, must be clean before any commit that touches the site
docker compose run --rm --entrypoint "" hugo hugo --gc --minify --theme hugo-coder -d /output

# One off Hugo command inside the container
docker compose run --rm --entrypoint "" hugo hugo <args>
```

When changing anything visual, check the result in a browser at several widths
rather than assuming. The layout has meaningful breakpoints at 560, 640, 768,
900, 1200, 1280, 1560 and 1700 pixels, and both colour schemes must be checked.
`playwright-cli` is available for this.

## Git Workflow

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `ci`,
`perf`, `build`.

Keep the description lowercase, imperative, no period. Reference the issue with
`#<number>` at the end of the subject when one exists.

### Branching

- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefix plus a kebab-case
  description, for example `feat/reading-design`.
- **Never push directly to `main`.** `main` deploys to production on push.
  Always branch and open a pull request.

### Remotes

The repository has two remotes. `origin` is GitHub
(`paolomainardi/paolomainardi.com`) and is the one that deploys. `gitlab` is a
SparkFabrik mirror. Open pull requests against `origin`.

### Rebasing

- Rebase onto `main` before pushing. No merge commits.
- Use `--force-with-lease`, never `--force`.

## CI/CD

GitHub Actions, `.github/workflows/firebase-hosting-merge.yml`.

| Trigger        | What happens                                                        |
| :------------- | :------------------------------------------------------------------ |
| Push to `main` | Checkout with submodules, read `HUGO_VERSION` from `.env`, build with `hugo --minify`, deploy to Firebase Hosting project `cto-space` |

The Hugo version used by CI comes from `.env`, and the Docker image reads the
same file. Change the version in one place.

## Package Management

The repository declares no Node or PHP manifest. Two dependency surfaces exist:

### Hugo modules (Go)

Declared in `src/hugo.toml` under `[[module.imports]]` and locked in
`src/go.mod`. Currently one module, `cj.rs/gohugo-asciinema`.

- Check the latest version: `curl -s "https://proxy.golang.org/<module>/@latest" | jq .`

### Fonts

Self hosted variable fonts taken from the `@fontsource-variable` packages and
committed to `src/static/fonts/`. They are not installed at build time.

- Check the latest version: `curl -s https://registry.npmjs.org/@fontsource-variable/<family>/latest | jq '{version: .version}'`

### Dependency Safety

Before adding or upgrading any dependency:

1. **Never assume you know the latest version.** Training data is outdated.
   Always verify against the live registry first.
2. **Check the live registry** with the commands above.
3. **Use the newest stable major version** compatible with the project runtime.
4. **Avoid releases published within the last 5 days** to reduce supply chain
   attack risk. Check the release date in the registry response.
5. **Regenerate the lockfile** after changing a manifest, then install from it.

## Testing

There is no test suite. Verification is the production build plus a visual pass:

1. `docker compose run --rm --entrypoint "" hugo hugo --gc --minify --theme hugo-coder -d /output` must exit clean.
2. Load the affected pages at several widths in both colour schemes.
3. Check the browser console for errors, and check that
   `document.documentElement.scrollWidth` does not exceed `innerWidth` on any
   page, which catches horizontal overflow.

## Command Safety

### Safe (run autonomously)

- `just`, `just --list`, `just logs`
- `docker compose run --rm --entrypoint "" hugo hugo <args>` for builds
- `git status`, `git log`, `git diff`, `git branch`
- `hugo` reads, `curl` against public registries
- `playwright-cli` navigation and screenshots

### Dangerous (ask first)

- `just up`, `just build`, `docker compose up`, `docker compose build`
- `git push`, `gh pr create`, `gh pr merge`
- `just update-submodules`, which moves the theme to its latest upstream commit
- Anything writing to `firebase`

### Destructive (never run)

- `rm -rf`, `git reset --hard`, `git clean -f`, `git push --force`
- `just hugo-build`, which runs `rm -rf /output/*` inside the container
- `docker compose down -v`, `docker system prune`, `docker volume rm`
- Deleting or rewriting `src/content/` without an explicit instruction

## Important Rules

- Never edit the theme submodule. Override in `src/layouts/` instead.
- Never use `!important` in SCSS. Scope to the colorscheme classes instead.
- Never push to `main`. It deploys to production.
- Never use em dashes or en dashes in any prose.
- Post images belong in `src/assets/images/`, so Hugo can measure them.
- Read `DESIGN.md` before changing anything visual, and update it in the same
  commit whenever a value it names changes. Type scale, palette, layout
  numbers, breakpoints, radii, spacing and components all live there.
- The production build must be clean before committing site changes.
- Verify library versions on the live registry before adding or upgrading.
