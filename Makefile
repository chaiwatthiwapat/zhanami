.PHONY: setup preview stop status build lint

setup:
	npm install

preview:
	./scripts/preview.sh start

stop:
	./scripts/preview.sh stop

status:
	./scripts/preview.sh status

build:
	npm run build

lint:
	npm run lint
