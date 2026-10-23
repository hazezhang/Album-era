# Unified translation experience

## Routes and architecture

- `/` and `/demo` show the same upload workspace. Portrait and Album Artwork use the existing `POST /api/generate` request, response validation, retry and browser image-load checks. Source selection and the generated result share one component.
- Materials links to `/material-study`, the existing deterministic material composition and printable receipt prototype. It is labelled as a prototype and never represented as a live AI result.
- `/album-studio` preserves the earlier album artwork analysis/render/QA and fresh/preserved workflow as an archive route.
- Four pre-existing album examples appear in the homepage collection. They are marked as curated studies, independent of the uploaded-image result.
- The result shows the model's returned description and generation instruction as a provisional brief. These fields do not assert a final product interpretation or an independently verified explanation.

## Visual direction

The shared shell uses navy, cobalt, paper, cool blue and a restrained warm accent, with editorial serif headings and compact monospace metadata. The homepage leads through source selection, image upload, result, curated collection and the material receipt study. Upload, provider and browser display errors remain distinct.

## Verification and limits

Run `node --test tests/*.test.mjs`, `npx tsc --noEmit --incremental false`, and `npm run build`. Local browser preview can verify the upload, source switching, material prototype, archive routing and unconfigured-server error. Its server lacks a production API key, so local preview cannot establish a successful live generation. Production deployment and a production browser end-to-end run are separate gates. This frontend branch should remain a Draft PR and should not be deployed automatically.
