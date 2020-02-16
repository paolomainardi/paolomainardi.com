all: up

build:
	git submodule update --init
	docker-compose build

up: build
	docker-compose up -d

cli:
	docker-compose run --rm hugo ash

hugo-build: build
	docker-compose run --rm hugo hugo --theme hugo-coder -d /output --baseUrl=${BASE_URL}

build-loc:
	docker-compose run --rm hugo hugo --baseUrl=http://paolomainardi.loc

open:
	xdg-open http://paolomainardi.loc:1313