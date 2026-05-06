# Vendor folder — third-party LISP / source we depend on

This folder mirrors a thin set of carefully-chosen upstream sources we
re-use through wrappers in `scripts/utilities/` and `scripts/templates/`.

**Nothing in here is authored by this office. Don't edit the vendored
files; only edit our wrappers.**

---

## How to populate (manual — each upstream has its own license)

### 1. `vendor/lee-mac/Steal.lsp`

> Lee Mac's import-from-DWG routine. Free-to-use but the author asks
> users to download from the official site, not redistribute.

```
1. Open https://www.lee-mac.com/steal.html in a browser.
2. Download the .zip.
3. Extract Steal.lsp (and Steal.fas if present) into:
   scripts/vendor/lee-mac/
4. Add other Lee Mac files only if a wrapper requests them.
```

The wrapper `scripts/utilities/steal-from-template.lsp` will automatically
detect the file and load it on first call.

`scripts/vendor/lee-mac/` is git-ignored to respect the author's wishes.

### 2. `vendor/autocad-lisp-toolkit/`

> Open-source urban-planning routines.

```
git clone https://github.com/vjspab/autocad-lisp-toolkit \
    scripts/vendor/autocad-lisp-toolkit
```

License: MIT. We can copy individual routines into our own
`scripts/templates/` with proper attribution headers.

### 3. (Optional) `vendor/finalcad-cleanandfix/`

> .NET plugin source — only needed when porting cleanup commands into
> our `autocad-plugin/`.

```
git clone https://github.com/FinalCAD/FINALCAD-CleanAndFix \
    scripts/vendor/finalcad-cleanandfix
```

License: MIT.

### 4. (Optional) `vendor/ezdxf-examples/`

> Reference scripts from `mozman/ezdxf` we sometimes adapt.

```
git clone https://github.com/mozman/ezdxf scripts/vendor/ezdxf-examples
```

License: MIT.

---

## .gitignore policy

Add the following block to the project `.gitignore` to keep the
vendored Lee Mac files out of the repository:

```
scripts/vendor/lee-mac/
```

Other vendor folders are MIT-compatible; you can commit them, or keep
them ignored if you'd rather pin via submodules.

---

## House rule

If a wrapper script depends on a vendored file, the wrapper **must**
fail with a clear "missing vendor file" message that points back to
this README — never with a cryptic LISP error.
