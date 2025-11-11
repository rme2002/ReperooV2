# ===== config =====
API_SERVICE := api
WEB_DIR := apps/web
MOBILE_DIR := apps/mobile
API_PORT := 8080
WEB_PORT := 3000

DEV_WEB ?= true
DEV_MOBILE ?= true

# ===== targets =====
.PHONY: dev dev-web dev-mobile dev-run api-up api-down api-logs web mobile-ios mobile-android stop

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
