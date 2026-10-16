# yes this just wraps npm. muscle memory.
.PHONY: all dev build test lint check clean preview

all: build

node_modules: package.json
	npm ci
	@touch node_modules

dev: node_modules
	npm run dev

build: node_modules
	npm run build

preview: build
	npm run preview

test: node_modules
	npm test

lint: node_modules
	npm run lint

check: lint test
	npm run typecheck

clean:
	npm run clean
