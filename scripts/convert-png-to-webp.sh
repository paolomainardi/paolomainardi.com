#!/usr/bin/env bash
docker run -v $PWD/src/static/images:/imgs --entrypoint mogrify dpokidov/imagemagick:7.1.0-55-ubuntu -format webp /imgs/posts/**/*.png
