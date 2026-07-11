# dotagents lint ゲート — CI が回すのと同一コマンド（正典: docs/04_ci.md）。
# 依存: shellcheck（`brew install shellcheck` / ubuntu-latest は同梱）・node/npx。
# markdownlint-cli2 は再現性のためバージョン固定。
SHELL := /bin/bash
MDLINT := npx --yes markdownlint-cli2@0.23.0

.PHONY: lint lint-sh lint-py lint-md lint-constitution help

lint: lint-sh lint-py lint-md lint-constitution ## shell + python + markdown + 共通憲法一致（CI と同一）

lint-sh: ## shellcheck: install.sh + bin/ の shell スクリプト（python hook は lint-py へ）
	shellcheck install.sh $$(grep -lE '^#!.*sh$$' bin/*.sh)

lint-py: ## bin/ の python hook を構文チェック（ast.parse・依存なし）
	@for f in $$(grep -lE '^#!.*python' bin/*.sh); do python3 -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "$$f" && echo "py-syntax OK: $$f"; done

lint-md: ## markdownlint（緩い設定・生きた正典のみ / .markdownlint-cli2.jsonc）
	$(MDLINT)

lint-constitution: ## CLAUDE.md / AGENTS.md のツール非依存な共通章を照合
	./bin/verify-constitution-parity.sh

help: ## タスク一覧
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  %-10s %s\n", $$1, $$2}'
