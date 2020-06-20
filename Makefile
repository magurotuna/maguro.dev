.DEFAULT_GOAL := help

.PHONY: serve
serve:
	@./zola serve

.PHONY: build
build:
	@./zola build

.PHONY: help
help:
	@./zola --help
