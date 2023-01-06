all: up

build:
	git submodule update --init
	docker-compose build

update-submodules:
	git submodule update --remote --merge

up: build
	docker-compose up -d

cli:
	docker-compose run --rm hugo ash

hugo-build: build
	docker-compose run --rm hugo rm -rf /output/*
	docker-compose run --rm hugo hugo --minify --theme hugo-coder -d /output --baseUrl=https://www.paolomainardi.com
	docker-compose run --rm hugo mkdir -p /output/search
	docker-compose run --rm hugo npx --yes hugo-lyra@beta --content /content/posts --indexFormat json --indexFilePath /output/search

build-loc:
	docker-compose run --rm hugo hugo --baseUrl=http://paolomainardi.loc

open:
	xdg-open http://paolomainardi.loc:1313