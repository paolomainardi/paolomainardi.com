all: up

build:
	docker-compose build

up: build
	docker-compose up -d

cli:
	docker-compose run --rm hugo ash

hugo-build: build
	docker-compose run --rm hugo hugo --theme hugo-code -d /app/output --baseUrl=${BASE_URL}

build-loc:
	docker-compose run --rm hugo hugo --baseUrl=http://paolomainardi.loc
