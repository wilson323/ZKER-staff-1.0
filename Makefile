PYTHON ?= python3
PNPM ?= pnpm

.PHONY: entry verify verify-product eval install build test ci dev-api dev-web

entry:
	$(PYTHON) validation/development_workflow.py entry

verify:
	$(PYTHON) validation/development_workflow.py verify

verify-product:
	$(PYTHON) validation/development_workflow.py product

eval:
	$(PYTHON) -m unittest discover -s validation -p 'test_development_workflow.py' -v

## M0 工程门禁（NestJS + Vue3）
install:
	$(PNPM) install

build:
	$(PNPM) -r run build

test:
	$(PNPM) -r run test

ci: install build test

dev-api:
	$(PNPM) --filter @zker/api start:dev

dev-web:
	$(PNPM) --filter @zker/web dev
