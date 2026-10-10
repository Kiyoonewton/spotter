.PHONY: install lint format test quality dev

install:
	pip install -r requirements-dev.txt

lint:
	ruff check .

format:
	ruff format .

test:
	python manage.py test

# Run before pushing: lint, format check, tests.
quality:
	ruff check .
	ruff format --check .
	python manage.py test

dev:
	python manage.py migrate && python manage.py runserver 0.0.0.0:8000
