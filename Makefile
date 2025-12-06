# ===== config =====
API_SERVICE := api
WEB_DIR := apps/web
MOBILE_DIR := apps/mobile
API_PORT := 8080
WEB_PORT := 3000

DEV_WEB ?= true
DEV_MOBILE ?= true

# ===== targets =====
.PHONY: setup clean setup-clean lint lint-fix dev dev-web dev-mobile dev-run api-up api-down api-logs web mobile-ios mobile-android stop generate-api release

## Bootstrap dependencies (uv + npm installs)
setup:
	@echo "[API] 📦 uv sync"
	@cd apps/api && uv sync
	@echo "[WEB] 📦 npm install"
	@npm install --prefix $(WEB_DIR)
	@echo "[MOBILE] 📦 npm install"
	@npm install --prefix $(MOBILE_DIR)
	@echo "✅ Dependencies installed."

clean:
	@echo "[API] 🧹 uv clean"
	@cd apps/api && uv clean
	@echo "[WEB] 🧽 removing node_modules"
	@rm -rf $(WEB_DIR)/node_modules
	@echo "[MOBILE] 🧽 removing node_modules"
	@rm -rf $(MOBILE_DIR)/node_modules
	@echo "✅ Clean complete. Run 'make setup' to reinstall."

setup-clean: clean setup

## Start API (Docker) + Web + Mobile
dev:
	@$(MAKE) DEV_WEB=true DEV_MOBILE=true dev-run

## Start API (Docker) + Web only
dev-web:
	@$(MAKE) DEV_WEB=true DEV_MOBILE=false dev-run

## Start API (Docker) + Mobile only
dev-mobile:
	@$(MAKE) DEV_WEB=false DEV_MOBILE=true dev-run

## Shared launcher (respects DEV_WEB/DEV_MOBILE flags)
dev-run: api-up
	@DEV_WEB=$(DEV_WEB) DEV_MOBILE=$(DEV_MOBILE) \
	WEB_DIR=$(WEB_DIR) MOBILE_DIR=$(MOBILE_DIR) WEB_PORT=$(WEB_PORT) \
	API_SERVICE=$(API_SERVICE) \
	bash scripts/dev-run.sh

## API up via docker compose
api-up:
	@echo "🐳 [CMD] docker compose up -d --build $(API_SERVICE)"
	docker compose up -d --build $(API_SERVICE) 2>&1 | sed -e 's/^/[API] /'
	@echo "✅ [API] Ready on http://localhost:$(API_PORT)"

api-logs:
	docker compose logs -f $(API_SERVICE) | sed -e 's/^/[API] /'

api-down:
	@echo "🧹 docker compose down"
	docker compose down

web:
	npm run dev --prefix $(WEB_DIR)

mobile-ios:
	npm run ios --prefix $(MOBILE_DIR)

mobile-android:
	npm run android --prefix $(MOBILE_DIR)

stop:
	-@pkill -f "next dev" >/dev/null 2>&1 || true
	-@pkill -f "expo start" >/dev/null 2>&1 || true
	$(MAKE) api-down
	@echo "🛑 All services stopped."
lint:
	@echo "[API] 🧹 uvx ruff check ."
	@cd apps/api && uvx ruff check .
	@echo "[WEB] 🧼 npm run lint"
	@npm run lint --prefix $(WEB_DIR)
	@echo "[MOBILE] 🧼 npm run lint"
	@npm run lint --prefix $(MOBILE_DIR)
	@echo "✅ Lint checks completed."

lint-fix:
	@echo "[API] 🧹 uvx ruff check . --fix"
	@cd apps/api && uvx ruff check . --fix && uvx ruff format .
	@echo "[WEB] 🧼 npm run lint:fix"
	@npm run lint:fix --prefix $(WEB_DIR)
	@echo "[MOBILE] 🧼 npm run lint:fix"
	@npm run lint:fix --prefix $(MOBILE_DIR)
	@echo "✅ Lint fixes applied."

generate-api:
	@echo "[API] 🧬 datamodel-codegen"
	@cd apps/api && uv run datamodel-codegen --input ../../packages/openapi/api.yaml --input-file-type openapi --output src/models/model.py --output-model-type pydantic_v2.BaseModel --target-python-version 3.13
	@echo "[WEB] 🧾 orval"
	@npm run generate-api --prefix $(WEB_DIR)
	@echo "[MOBILE] 📱 orval"
	@npm run generate-api --prefix $(MOBILE_DIR)
	@echo "✅ Contract + clients refreshed."

release:
	@scripts/release.sh
