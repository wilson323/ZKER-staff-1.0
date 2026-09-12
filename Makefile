PYTHON ?= python3
.PHONY: entry verify verify-product eval

entry:
	$(PYTHON) validation/development_workflow.py entry

verify:
	$(PYTHON) validation/development_workflow.py verify

verify-product:
	$(PYTHON) validation/development_workflow.py product

eval:
	$(PYTHON) -m unittest discover -s validation -p 'test_development_workflow.py' -v
