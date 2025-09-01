# Makefile for paolomainardi.com
#
# Usage:
#   make <target>
#
# Targets:

help: ## Show this help message and exit
	@grep -E '^[a-zA-Z0-9_-]+:.*?##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

all: up ## Build and start dev environment (alias for 'up')

build: ## Build Docker images and update submodules
	git submodule update --init
	docker-compose build

update-submodules: ## Update git submodules to latest
	git submodule update --remote --merge

up: build ## Build and start dev environment
	docker-compose up -d

cli: ## Open bash shell in hugo container
	docker-compose run --rm --entrypoint bash hugo

hugo-build: build ## Build production site and search index
	# Cleans output, builds with minify, and generates search index for production
	docker-compose run --rm hugo mkdir -p app/src/static
	docker-compose run --rm hugo rm -rf /output/*
	docker-compose run --rm hugo hugo --minify --theme hugo-coder -d /output --baseUrl=https://www.paolomainardi.com
	docker-compose run --rm hugo mkdir -p /output/search

build-loc: ## Build site for local development
	docker-compose run --rm hugo hugo --baseUrl=http://paolomainardi.loc

open: ## Open local site in browser
	"$BROWSER" http://paolomainardi.loc:1313