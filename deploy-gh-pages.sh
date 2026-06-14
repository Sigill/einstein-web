#!/usr/bin/env bash

set -x

git -C ../einstein-web-gh-pages/ rm -r docs/
# cp -r ./dist/www/* ../einstein-web-gh-pages/
rsync -av --exclude '*.map' ./dist/www/ ../einstein-web-gh-pages/docs/
git -C ../einstein-web-gh-pages/ add .
git -C ../einstein-web-gh-pages/ commit -m $(git rev-parse --short HEAD)
