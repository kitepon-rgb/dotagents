# dotagents の静的 lint と完全 CI ゲート（正典: docs/04_ci.md）。
# 依存: shellcheck（`brew install shellcheck` / ubuntu-latest は同梱）・node/npx・python3。
# `make ci` の clean HOME test は Codex CLI 0.144.1 を完全 TOML parser として使う。
# markdownlint-cli2 は再現性のためバージョン固定。
SHELL := /bin/bash
MDLINT := npx --yes markdownlint-cli2@0.23.0

.PHONY: lint lint-sh lint-py lint-js lint-md lint-constitution lint-skills lint-hooks test-constitution test-install test-observer-hook-config test-observer-package test-update test-oracle test-factory-core test-factory-reporter test-factory-scan test-orchestrate ci help

lint: lint-sh lint-py lint-js lint-md lint-constitution lint-skills lint-hooks ## 静的 lint + skill/hook smoke

lint-sh: ## shellcheck: install.sh + bin/ と tests/ の shell スクリプト（python は lint-py へ）
	shellcheck install.sh $$(grep -lE '^#!.*sh$$' bin/*.sh tests/**/*.sh)

lint-py: ## bin/ と lib/orchestrate/ の Python script を構文チェック（py_compile・依存なし）
	@for f in $$(grep -lE '^#!.*python' bin/*.sh) lib/orchestrate/*.py; do python3 -m py_compile "$$f" && echo "py-syntax OK: $$f"; done

lint-js: ## bin/ と lib/orchestrate/ の Node.js script を構文チェック
	@for f in bin/*.mjs lib/orchestrate/*.mjs; do node --check "$$f"; done

lint-md: ## markdownlint（緩い設定・生きた正典のみ / .markdownlint-cli2.jsonc）
	$(MDLINT)

lint-constitution: ## 共通憲法＋host deltaと生成物の完全一致を照合
	./bin/verify-constitution-parity.sh

lint-skills: ## Codex skill の frontmatter と安全契約を静的検証
	bash tests/skills/smoke.sh

lint-hooks: ## Claude / Codex hook の空打ち smoke
	bash tests/hooks/smoke.sh
	bash tests/hooks/codex-smoke.sh

test-constitution: ## 共通憲法generatorの冪等性とdrift拒否
	node --test tests/constitution/generation.test.mjs

test-install: ## 隔離 HOME の install/profile/config apply 検証
	bash tests/install/clean-home.sh

test-observer-hook-config: ## 隔離 HOME のObserver parent Stop hook transaction検証
	bash tests/install/observer-hook-config.sh

test-observer-package: ## sibling Observerの隔離install/reinstall/verify/rollback検証
	bash tests/install/observer-package.sh

test-update: ## cron 最小 PATH で NVM 配下の npm を解決できることを検証
	bash tests/update/cron-env.sh

test-oracle: ## Oracle wrapper のOS非依存な入口選択を検証
	bash tests/oracle/wrappers.sh

test-factory-core: ## Caveat / Throughline / Spotter の外部コア受入契約を検証
	bash tests/factory-core/smoke.sh

test-factory-reporter: ## BugHub factory reporter のprivacy/outbox/retry/scheduler契約を検証
	node --test tests/factory-reporter/*.test.mjs

test-factory-scan: ## 工場9製品scanの公開CLI・privacy・platform契約を検証
	node --test tests/factory-scan/*.test.mjs

test-orchestrate: ## orchestration control record の契約を検証
	node --test tests/orchestrate/*.test.mjs

ci: lint test-constitution test-install test-observer-hook-config test-update test-oracle test-factory-core test-factory-reporter test-factory-scan test-orchestrate ## ローカル/CI 共通の全ゲート

help: ## タスク一覧
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  %-10s %s\n", $$1, $$2}'
