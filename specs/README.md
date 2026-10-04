# Feature specifications

Keep implementation context in this repository so future agents can resume work
without the original conversation or other repository checkouts.

Use the [workflow](../.specify/README.md) and its templates. Create a folder such
as `001-document-search/` for actual feature work, then replace the empty index
below with relative links. A feature folder contains `spec.md`, `plan.md`,
`tasks.md`, and `handoff.md`; add supporting research/contracts only when useful.

| Feature | Status | Spec | Plan | Tasks | Handoff |
| --- | --- | --- | --- | --- | --- |
| 001 Asset uploader API | Superseded storage boundary by 002 | [Spec](001-asset-uploader/spec.md) | [Plan](001-asset-uploader/plan.md) | [Tasks](001-asset-uploader/tasks.md) | [Handoff](001-asset-uploader/handoff.md) |
| 002 Spaces storage | Implemented; live integration pending | [Spec](002-spaces-storage/spec.md) | [Plan](002-spaces-storage/plan.md) | [Tasks](002-spaces-storage/tasks.md) | [Handoff](002-spaces-storage/handoff.md) |
| 003 HTML video upload validation | Superseded by 005 | [Spec](003-html-video-upload-validation/spec.md) | [Plan](003-html-video-upload-validation/plan.md) | [Tasks](003-html-video-upload-validation/tasks.md) | [Handoff](003-html-video-upload-validation/handoff.md) |
| 004 Upload filename normalization | Implemented; integration pending | [Spec](004-upload-filename-normalization/spec.md) | [Plan](004-upload-filename-normalization/plan.md) | [Tasks](004-upload-filename-normalization/tasks.md) | [Handoff](004-upload-filename-normalization/handoff.md) |
| 005 Browser asset upload formats | Implemented; integration pending | [Spec](005-browser-asset-upload-formats/spec.md) | [Plan](005-browser-asset-upload-formats/plan.md) | [Tasks](005-browser-asset-upload-formats/tasks.md) | [Handoff](005-browser-asset-upload-formats/handoff.md) |
| 006 Asset folders and duplicate prevention | Implemented; deployment integration pending | [Spec](006-asset-folders/spec.md) | [Plan](006-asset-folders/plan.md) | [Tasks](006-asset-folders/tasks.md) | [Handoff](006-asset-folders/handoff.md) |
| 007 Auth-client global guards | Complete | [Spec](007-auth-client-global-guards/spec.md) | [Plan](007-auth-client-global-guards/plan.md) | [Tasks](007-auth-client-global-guards/tasks.md) | [Handoff](007-auth-client-global-guards/handoff.md) |

Keep one row per feature, retain completed records for rationale, and update
status when work changes. Select work from the user's request and this index;
the largest folder number is not automatically the active feature.
