CACHED_FILES = dist/www/index.html \
               dist/www/app.css \
               dist/www/app.js \
               dist/www/assets/fonts/open-sans/open-sans-latin-400-normal.woff2 \
               dist/www/assets/fonts/open-sans/open-sans-math-400-normal.woff2

WEB_FILES = dist/www/index.html dist/www/app.js dist/www/app.css dist/www/service-worker.js

DIRECTORIES = dist/www

.PHONY: web_package all clean

web_package: $(WEB_FILES)
all: web_package

clean:
	rm -rf dist/

dist/www/service-worker.js: src/service-worker.js $(CACHED_FILES)
	# Compute a hash of all the files that need to be cached.
	# and inject it in the service worker, in order to trigger updates.
	h=$$(tar -cf - $(CACHED_FILES) | sha1sum | cut -d ' ' -f1); \
	sed -e "s/__VERSION_HASH__/$$h/g" $< > $@

dist/www/index.html: src/app.html src/service-worker-registration.html
	sed -e '/SERVICE_WORKER_REGISTRATION/r src/service-worker-registration.html' -e '/SERVICE_WORKER_REGISTRATION/d' -e 's|../dist/www/|./|g' $< > $@

ESBUILD_SOURCE_FILES := $(shell find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) ! -name "*.test.ts" | sort)

dist/www/app.css dist/www/app.js: $(ESBUILD_SOURCE_FILES)
	node esbuild.ts

$(shell mkdir -p $(DIRECTORIES))
