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

# Build the motion map of an animated cover, e.g. just motion-map src/assets/images/posts/16-yadm/dotfiles-home-threads.webp
motion-map cover *args:
    docker build -q -t paolomainardi/motion-map scripts/motion-map >/dev/null
    docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/site paolomainardi/motion-map {{cover}} {{args}}
