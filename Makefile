.PHONY: setup preview stop status build lint

setup:
	npm install

run:
	./scripts/preview.sh start

down:
	./scripts/preview.sh stop

status:
	./scripts/preview.sh status

build:
	npm run build

lint:
	npm run lint
