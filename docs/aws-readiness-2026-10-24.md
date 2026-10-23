# AWS readiness — 2026-10-24 JST

専用プロファイル `alexa-thought-map` の認証は成功した。東京の候補プロファイルも存在するが、Haiku 5.5 の agreement は `NOT_AVAILABLE`。次のゲートは利用者／管理者による Anthropic 利用準備・契約状態の確認であり、現時点では有料接続テストへ進めない。

## 確認範囲と方法

- 2026-10-24 01:53–01:57 JST の読み取り専用確認。AWS CLI `2.34.29`、Node.js `v26.0.0`。
- AWS 操作は専用プロファイルを明示し、東京 `ap-northeast-1` に限定。子プロセスから継承した `AWS_*` を除去して専用プロファイルを指定し、別の環境認証情報の混入を避けた。プロファイルの参照関係だけを内部確認し、禁止された既存プロファイルは使用していない。
- STS 応答はメモリ内で成功と主体の種類だけに変換。モデル ARN もメモリ内でリージョンと基盤モデル ID だけに変換した。アカウント ID、ARN、ロール名、キー、トークン、認証設定の内容は記録していない。
- 最初の sandbox 内 STS は endpoint 接続失敗だった。ネットワーク許可後の読み取り専用 STS は成功したため、初回失敗を認証拒否とは扱わない。AWS CLI は `AWS_MAX_ATTEMPTS=1`、接続10秒／読み取り15秒の上限で実行した。
- 実行した AWS API は STS `GetCallerIdentity`、Bedrock `ListInferenceProfiles`、`GetFoundationModelAvailability` のみ。Converse／InvokeModel、有料推論、契約・購読・用途フォーム送信、IAM／設定／認証情報変更、SSO ログインは実施していない。

## サニタイズ済み実測結果

STS: **success = true / identity type = assumed-role**。これは認証成功の証拠であり、期待する法人アカウントへの一致確認や全 Bedrock 操作の許可を証明するものではない。

`ListInferenceProfiles` は `SYSTEM_DEFINED` を指定し、次の3 ID に完全一致する結果だけを抽出した。

| 東京から見える推論プロファイル ID | 状態 | 返された基盤モデル ID | 配送先リージョン |
|---|---|---|---|
| `jp.anthropic.claude-haiku-5-5` | `ACTIVE` | `anthropic.claude-haiku-5-5` | `ap-northeast-1`, `ap-northeast-3` |
| `jp.anthropic.claude-sonnet-4-6` | `ACTIVE` | `anthropic.claude-sonnet-4-6` | `ap-northeast-1`, `ap-northeast-3` |
| `apac.amazon.nova-micro-v1:0` | `ACTIVE` | `amazon.nova-micro-v1:0` | `ap-northeast-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-south-1`, `ap-southeast-1`, `ap-southeast-2` |

CLI の `get-foundation-model-availability` 対応をローカル skeleton で確認した後、Haiku プロファイルのモデル ARN から得た **`anthropic.claude-haiku-5-5`** を使い、東京で1回だけ実行した。推測した日付付きモデル ID や推論プロファイル ID はこの API に渡していない。

```json
{
  "modelId": "anthropic.claude-haiku-5-5",
  "region": "ap-northeast-1",
  "agreementAvailability": { "status": "NOT_AVAILABLE" },
  "authorizationStatus": "AUTHORIZED",
  "entitlementAvailability": "AVAILABLE",
  "regionAvailability": "AVAILABLE"
}
```

`ACTIVE` はプロファイルの存在・状態だけを示す。今回は Haiku の entitlement も `AVAILABLE` と実測できたが、agreement は別項目であり未充足。[AWS のモデル利用準備資料](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html#model-access-sdk)では、agreement の `NOT_AVAILABLE` はアクセスが存在しない状態を示す。この応答だけでは、用途フォーム未提出・契約未作成等のどれが原因かまでは断定できない。

Sonnet／Nova の entitlement・agreement、アカウントの期待値との照合、配送先を含む実効 IAM／SCP、推論クォータ、実推論の成功・品質・速度・費用は未確認。Haiku の `AUTHORIZED` も、JP プロファイル経由の実呼び出し全体の成功を保証しない。[availability API の項目定義](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GetFoundationModelAvailability.html)

## 次のゲート

1. 利用者／管理者が対象アカウントと東京の Haiku を確認し、Anthropic の用途フォーム・利用条件／EULA・Marketplace agreement・支払い準備のどれが未充足か調べ、必要な操作を自身の権限と承認で行う。今回の worker はこれらを送信・同意しない。
2. 同じ読み取り専用 availability 確認で agreement が `AVAILABLE` になったことを確認する。`PENDING`／`NOT_AVAILABLE`／`ERROR` なら推論せず状態を報告する。
3. JP 推論プロファイルと東京・大阪の配送先モデルに対する `bedrock:InvokeModel` の実効許可／SCP、および推論クォータを管理者と確認する。ポリシー変更は別途承認が必要。
4. 採用モデルを確定して下記の最小互換修正とオフライン検証を実施する。通常の可逆的な修正・検証は既存の自律進行指示の範囲で、改めて承認を求めない。有料テストは既存の承認範囲と照合し、モデル・送信先・試行回数・契約について新たな判断が必要な部分だけを確認する。

初回の第三者モデル推論は購読開始や EULA 同意を伴い得るため、単なる接続確認として先に呼び出さない。[AWS の初回利用・契約要件](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)

## 現コードとの不一致と最小修正案（未実装）

| 対象 | 現状 | 東京 Haiku 暫定案に必要な最小差分 |
|---|---|---|
| `src/bedrock.js` の3定数 | `us-east-1`、US Sonnet、直接 Nova Micro | リージョンを `ap-northeast-1`、両モデル定数を `jp.anthropic.claude-haiku-5-5` にする |
| 共通 `request()` | `inferenceConfig: { maxTokens: 4096, temperature: 0 }` | `temperature` を除き、`additionalModelRequestFields: { thinking: { type: 'disabled' } }` を追加する |
| 応答検証 | `end_turn` と全ブロックが text であることを要求、JSON を解析 | thinking 無効化と組み合わせて維持する。拒否・打切り・非text・不正JSONを成功にしない |
| `src/verify-live.js` | provider から `{ source, infer }` だけ渡すため、根の分析1呼び出し。モデルとリージョンは共通 provider に従う | 単発契約を維持し、全 provider を渡さない。接続先修正のためのスクリプト変更は不要 |
| 既存テスト | `tests/enrichment.test.js` が `temperature: 0`、US provenance、Nova 名を前提にする | Haiku 名・東京 provenance・sampling 省略・thinking 無効を確認する形に更新。`tests/analysis.test.js` の fake client でも同じリクエスト形と単発上限を確認する |
| 呼び出し元／説明 | `src/server.js` は通常3工程、README はUS固定を説明 | API形は維持。採用時にUS前提の現行説明だけを整合し、過去の検証記録を保持する |

`AWS_PROFILE` や CLI の既定リージョンだけを変えても、現在のハードコードされた推論先は変わらない。`verify-live.js` を今のまま実行すれば東京 Haiku の検証にはならない。

Haiku は sampling パラメーターを省略する必要があり、既定では adaptive thinking が有効なので、モデル ID だけの差替えは不十分。[公式移行ガイド](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide)と[thinking 無効化仕様](https://platform.claude.com/docs/en/build-with-claude/thinking)を確認した。Bedrock のモデルカードも thinking の無効化と Converse 対応を示し、モデル固有の項目は Converse の `additionalModelRequestFields` に渡せる。[AWS モデルカード](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html)、[Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)

新しい依存、モデル切替機構、thinking ブロックの複雑なパーサーは不要。上記はコードレビューに基づく提案で、コード・テスト・README・設定ガイドは変更していない。

## 最初の有料テスト案（未承認・未実行）

前提は上記4ゲートの通過。対象は **東京／JP Haiku 5.5、既存 `tests/fixtures/section8.json` の合成16発言、根の分析だけ1回**。属性・優先度、他モデル比較、サーバー起動は含めない。

- 既存の入力上限24,000 UTF-8 bytes、出力 `maxTokens: 4096`、`maxAttempts: 1`、60秒 abort を維持。アプリから送る Converse は最大1回とし、失敗・打切り・タイムアウト時も手動／自動再試行しない。
- Haiku 向けの仮見積もり枠は **1試行 USD 0.01**。料金は今回再取得しておらず、実施前に最新料金と固定入力で再計算する。これは従来の単発 USD 0.20 枠を変更する承認でも、クラウド側のドル建て強制停止設定でもない。
- 互換修正後に限り、継承する AWS 認証選択を除いた子プロセスで以下を1回実行する。コマンドの全体時間を記録するため、計測値は純粋なモデル応答時間とは区別する。

```sh
# PROPOSED ONLY: onboarding、互換修正、予算／データ承認後に1回だけ実行
python3 - <<'PY'
import os, subprocess, time
env = {k: v for k, v in os.environ.items() if not k.startswith('AWS_')}
env.update(AWS_PROFILE='alexa-thought-map', AWS_MAX_ATTEMPTS='1',
           AWS_EC2_METADATA_DISABLED='true', BEDROCK_ENABLED='1')
started = time.monotonic()
result = subprocess.run(['node', 'src/verify-live.js'], env=env)
print({'command_elapsed_seconds': round(time.monotonic() - started, 3)})
raise SystemExit(result.returncode)
PY
```

成功判定は正しい東京 Haiku provenance、`ready`、スキーマ／発言 ID の整合、usage 保存。既存の `crossesTopics` は参考指標であり、人が共通の解消条件・欲求の保持・根拠のない事情／診断の追加を確認するまで意味の品質合格とはしない。失敗時も試行数、結果、返った usage と費用を記録し、usage 不明のタイムアウトを無課金と断定しない。

この1回で証明できるのは根の分析経路だけ。3工程全体・各工程の採用モデル・比較品質・Alexa／Echo の実機動作は別ゲートとして残る。
