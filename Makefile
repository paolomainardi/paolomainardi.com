all: up

build:
	git submodule update --init
	docker-compose build

update-submodules:
	git submodule update --remote --merge

up: build hugo-lyra-rebuild-dev
	docker-compose up -d

cli:
	docker-compose run --rm --entrypoint bash hugo

hugo-lyra-rebuild-dev:
	docker-compose run --rm hugo hugo-lyra --content /app/src/content/posts --indexFormat json --indexFilePath /app/src/static/search

hugo-build: build
	docker-compose run --rm hugo rm -rf /output/*
	docker-compose run --rm hugo hugo --minify --theme hugo-coder -d /output --baseUrl=https://www.paolomainardi.com
	docker-compose run --rm hugo mkdir -p /output/search
	docker-compose run --rm hugo hugo-lyra --content /app/content/posts --indexFormat json --indexFilePath /output/search

build-loc:
	docker-compose run --rm hugo hugo --baseUrl=http://paolomainardi.loc

open:
	xdg-open http://paolomainardi.loc:1313