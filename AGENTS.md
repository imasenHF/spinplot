# SpinPlot maintenance

Read `PROJECT_CONTEXT.md` and `docs/DEVELOPMENT_CONTEXT.md` before changes.

Every application update requires a new MAJOR.MINOR.PATCH version in both
`package.json` and `package-lock.json`, plus a dated entry in `CHANGELOG.md`.
Use PATCH for compatible fixes and small display changes, MINOR for new feature
sets, and MAJOR for incompatible changes. Never reuse or move a published tag.
Documentation-only corrections can retain the application version.

Run `npm run check` and the relevant browser regressions before merging. Publish
the matching tag and GitHub Release only after Pages and the production HTTP
check succeed. Application and project/config format versions are independent.
Update the project records with the actual tested and deployed state.

Experimental conditions are display metadata. Keep the original acquisition
metadata, separate time constant/conversion time/sweep time, and never infer
sample names from filenames. Vendor units are documented in
`docs/EXPERIMENTAL_CONDITIONS.md`.
