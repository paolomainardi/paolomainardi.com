# paolomainardi.com - development tasks

# Show available recipes
default:
    @just --list

# Build and start dev environment
all: up

# Build Docker images
build:
    docker-compose build

# Build and start dev environment
up: build
    docker-compose up -d

# Open bash shell in hugo container
cli:
    docker-compose run --rm --entrypoint bash hugo

# Build production site
hugo-build: build
    docker-compose run --rm hugo mkdir -p app/src/static
    docker-compose run --rm hugo rm -rf /output/*
    docker-compose run --rm hugo hugo --minify -d /output --baseUrl=https://www.paolomainardi.com

# Build site for local development
build-loc:
    docker-compose run --rm hugo hugo --baseUrl=http://paolomainardi.loc

# Tail logs from the hugo container
logs:
    docker-compose logs -f hugo

# Open local site in browser
open:
    $BROWSER http://paolomainardi.loc:1313
