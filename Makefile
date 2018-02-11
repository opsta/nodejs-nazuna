PWD = $(shell pwd)

all: install run

install:
	docker run --rm -v "$(PWD):/nodejs" --workdir /nodejs node:9.5.0-alpine npm install

run:
	docker-compose up

build:
	docker build -t opsta/nazuna:dev .

clean:
	docker run --rm -v "$(PWD):/nodejs" --workdir /nodejs node:9.5.0-alpine rm -rf node_modules
