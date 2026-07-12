# dotagents の静的 lint と完全 CI ゲート（正典: docs/04_ci.md）。
# 依存: shellcheck（`brew install shellcheck` / ubuntu-latest は同梱）・node/npx・python3。
# `make ci` の clean HOME test は Codex CLI 0.144.1 を完全 TOML parser として使う。
# markdownlint-cli2 は再現性のためバージョン固定。
SHELL := /bin/bash
MDLINT := npx --yes markdownlint-cli2@0.23.0

.PHONY: lint lint-sh lint-py lint-md lint-constitution lint-skills lint-hooks test-install test-update ci help

lint: lint-sh lint-py lint-md lint-constitution lint-skills lint-hooks ## 静的 lint + skill/hook smoke

lint-sh: ## shellcheck: install.sh + bin/ と tests/ の shell スクリプト（python は lint-py へ）
	shellcheck install.sh $$(grep -lE '^#!.*sh$$' bin/*.sh tests/**/*.sh)

lint-py: ## bin/ の python script を構文チェック（ast.parse・依存なし）
	@for f in $$(grep -lE '^#!.*python' bin/*.sh); do python3 -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "$$f" && echo "py-syntax OK: $$f"; done

lint-md: ## markdownlint（緩い設定・生きた正典のみ / .markdownlint-cli2.jsonc）
	$(MDLINT)

lint-constitution: ## CLAUDE.md / AGENTS.md のツール非依存な共通章を照合
	./bin/verify-constitution-parity.sh

lint-skills: ## Codex skill の frontmatter と安全契約を静的検証
	bash tests/skills/smoke.sh

lint-hooks: ## Claude / Codex hook の空打ち smoke
	bash tests/hooks/smoke.sh
	bash tests/hooks/codex-smoke.sh

test-install: ## 隔離 HOME の install/profile/config apply 検証
	bash tests/install/clean-home.sh

test-update: ## cron 最小 PATH で NVM 配下の npm を解決できることを検証
	bash tests/update/cron-env.sh

ci: lint test-install test-update ## ローカル/CI 共通の全ゲート

help: ## タスク一覧
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  %-10s %s\n", $$1, $$2}'
