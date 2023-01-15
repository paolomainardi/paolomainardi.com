#!/usr/bin/env bash
docker run -v "$PWD"/src/static/images:/imgs --entrypoint bash dpokidov/imagemagick:7.1.0-55-ubuntu -c "mogrify -format webp /imgs/posts/**/*.png"
