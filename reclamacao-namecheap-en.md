# Complaint — Namecheap Hosting (domain ulmeiro.org)

## Summary of the problem

Over the course of several hours, I tried to update static files (HTML and JavaScript) for the site ulmeiro.org through the cPanel File Manager. Even though each upload was confirmed as successful — with the file's "last modified" timestamp on the server correctly reflecting the upload time — the content served to site visitors kept matching the old version, with no visible update whatsoever.

## What was tried, without success

- Directly overwriting the files via upload (multiple times).
- Deleting the old file before uploading the new one (delete + upload, instead of overwrite).
- Forcing an update on the browser side: hard refresh (Ctrl+Shift+R), fully closing and reopening the browser tab, testing in a brand-new tab.
- Adding no-cache HTTP headers (`Cache-Control`, `Pragma`, `Expires`) via `.htaccess` for `.html` and `.js` files.
- Checking the file directly on the server (opened via direct URL, e.g. `ulmeiro.org/dados.js`) — even here, the content shown did not match the most recently uploaded file.

None of these actions consistently resolved the issue. The pattern observed — file correctly updated on the server (confirmed by the modification timestamp), but old content continuously served to visitors — is typical of a server-side caching layer (e.g. LiteSpeed Cache) that is not being properly invalidated after file changes, and that is not respecting the `Cache-Control` headers set via `.htaccess`.

## What I'm asking for

1. Confirmation of what type of cache (LiteSpeed, Varnish, CDN, or other) is active on this hosting plan for the domain ulmeiro.org.
2. An immediate purge of all server-side cache for this domain.
3. Clear instructions on how to permanently disable this cache for this site — this is a site with frequent content updates (several times a week), where any delay in propagating changes is unacceptable.
4. An explanation of why the `Cache-Control: no-cache, no-store, must-revalidate` headers set in `.htaccess` did not prevent this behaviour.

This issue has already cost several hours of wasted work trying to diagnose something that should be simple: updating a static file on a static site. I'm asking for a definitive fix, not a temporary workaround.
