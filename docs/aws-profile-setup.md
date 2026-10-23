# AWS CLI プロファイル設定（Alexa Thought Map）

既存の `metsa-deployer` は再利用・変更せず、Bedrock 検証用に `alexa-thought-map` という別プロファイルを作る。AWS CLI v2 はインストール済み。ここに記載した設定操作は利用者自身の端末で行う。

## 1. 認証方式を選ぶ

- AWS IAM Identity Center（SSO）を利用できる場合は **SSOを推奨**。組織の管理者から開始URL、SSOリージョン、対象アカウントとBedrock権限を持つロールを確認する。
- SSOがない場合は、管理者が発行した専用IAMユーザーのアクセスキーを使用する。rootユーザーのキーや `metsa-deployer` のキーは使わず、キーをチャットやリポジトリへ貼らない。

## 2. SSOの場合（推奨）

```sh
aws configure sso
```

画面の質問に答える。法人共通のセッション名は例として `company-sso` を使う。この法人のIAM Identity Centerは東京で有効化済みなので、SSO regionは `ap-northeast-1`、SSO start URLは東京のアクセスポータルURLとする。ブラウザーが開いたらSSOユーザーでサインインし、開発用アカウントと割り当て済みロールを選ぶ。CLIの既定リージョンも `ap-northeast-1`、出力形式は `json`、profile名は `alexa-thought-map` とする。SSOセッションとCLIプロファイルは別の設定で、既定リージョンはプロファイルごとに指定できる。

現在のアプリは `src/bedrock.js` で `us-east-1` を明示しているため、CLIの既定リージョンを東京にしても推論先は変わらない。東京への変更案は6節を参照。

続けてサインインし、認証主体を確認する。

```sh
aws sso login --profile alexa-thought-map
aws sts get-caller-identity --profile alexa-thought-map
aws configure list-profiles
```

`get-caller-identity` の結果が想定したAWSアカウント/ロールか確認する。出力のアカウントIDやARNは公開しない。これは認証確認だけで、Bedrockモデルを呼び出さず、推論料金も発生しない。

## 3. SSOがない場合（専用IAMアクセスキー）

管理者が、この検証専用のIAMユーザーと最小権限ポリシーを用意し、アクセスキーを安全な経路で発行する。ユーザー自身がIAM権限を持っていなければ、AWSコンソールでIAMユーザーやキーを作ろうとせず管理者へ依頼する。

```sh
aws configure --profile alexa-thought-map
```

プロンプトに専用キーID、専用シークレット、リージョン `us-east-1`、出力形式 `json` を入力する。キーは通常 `~/.aws/credentials` に保存される。値は画面共有・ログ・チャットに出さない。

```sh
aws sts get-caller-identity --profile alexa-thought-map
aws configure list --profile alexa-thought-map
```

期待した主体か確認する。`configure list` もキー値を表示しないようマスクするが、その出力を共有しない。不要になったキーはIAM管理者に無効化・削除を依頼する。

## 4. アプリから使う

AWS SDKは環境変数 `AWS_PROFILE` でプロファイルを選べる。既存のプロファイルやシェル設定を変えないよう、プロジェクトの起動時だけ指定する。

```sh
AWS_PROFILE=alexa-thought-map npm start
```

Node.jsプロセスが環境変数を継承する。常時のシェル設定に追加する必要はない。

## 5. Bedrock利用権限とモデル準備

プロファイル作成・STS確認だけではBedrock利用権限やモデル利用準備は完了しない。アカウント管理者に、対象モデルへの `bedrock:InvokeModel`（ストリーミングを使うなら `bedrock:InvokeModelWithResponseStream`）を対象リソースに限定して許可するよう依頼する。Claude Sonnet 4.6のUS推論プロファイルを使う場合、推論プロファイルと、ルーティング先の基盤モデルARNに対する許可が必要で、USの候補先は `us-east-1`、`us-east-2`、`us-west-2`。SCP等でこのいずれかが拒否されていても呼び出しが失敗する。Nova MicroのUS推論プロファイルIDは `us.amazon.nova-micro-v1:0`。

Bedrockコンソールで対象モデルの利用条件やMarketplace上の利用準備を確認する。Claudeは初回利用前に用途フォームが必要な場合があり、Bedrockからの初回利用時に第三者モデルの利用条件への同意や有効な支払方法が必要となる場合もある。これらはプロファイル作成とは別で、このガイドでは同意やモデル呼び出しを実行しない。モデル呼び出しはトークン課金が発生し得る。

## 6. コンペと法人運用に合わせたリージョン提案

2026-10-23 JST。法人の主拠点は日本で、将来は複数の世界向けサービスを運営する。IAM Identity Centerは東京で有効化済みで、利用者は開発アカウントへのSSOログインとCLIのcaller表示まで完了したと報告している。

### 公式規定の確認

[コンペ公式規定4節](https://amazonappdev2026.devpost.com/rules)と[公式FAQ](https://amazonappdev2026.devpost.com/details/faqs)には、Alexa+部門のAWSリージョンを米国に指定する条件は見当たらない。動作するAgent Skill／MCPサーバー、または独自Webシミュレーターで応募できる。FAQは実機不要、参加者向けAlexa+プレビューツールへのアクセス不可、ローカル実行可能な公開リポジトリとデモ動画でよく継続ホスティング不要と説明している。米国のAlexa+環境に合わせてBedrockを米国へ置く必要はない、というのがこれらの条件からの判断である。開催地・参加資格の国条件と、クラウドの配置先は別に扱う。

### 東京とバージニア北部の比較

`alexa-thought-map` プロファイルで、東京とバージニア北部に対して `bedrock list-inference-profiles --type-equals SYSTEM_DEFINED` を実行した。2026-10-23の一覧結果は以下のとおり。アカウントID・認証情報は記録していない。

| 呼び出し元 | モデル | プロファイルID | 一覧上の状態 | 返された推論先 |
|---|---|---|---|---|
| 東京 `ap-northeast-1` | Sonnet 4.6 | `jp.anthropic.claude-sonnet-4-6` | `ACTIVE` | 東京、大阪 |
| 東京 `ap-northeast-1` | Nova Micro | `apac.amazon.nova-micro-v1:0` | `ACTIVE` | 東京、大阪、ソウル、ムンバイ、シンガポール、シドニー |
| バージニア北部 `us-east-1` | Sonnet 4.6 | `us.anthropic.claude-sonnet-4-6` | `ACTIVE` | バージニア北部、オハイオ、オレゴン |
| バージニア北部 `us-east-1` | Nova Micro | `us.amazon.nova-micro-v1:0` | `ACTIVE` | バージニア北部、オハイオ、オレゴン |

東京の再確認コマンドは次のとおり。これは一覧取得で、モデル推論・利用契約の開始は行わない。

```sh
aws bedrock list-inference-profiles \
  --type-equals SYSTEM_DEFINED \
  --region ap-northeast-1 \
  --profile alexa-thought-map \
  --query "inferenceProfileSummaries[?contains(inferenceProfileId, 'nova-micro') || contains(inferenceProfileId, 'claude-sonnet-4-6')].{id:inferenceProfileId,state:status,models:models[*].modelArn}" \
  --output json --no-cli-pager
```

[Sonnet公式モデルカード](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html)もJPプロファイルと東京・大阪を明記している。[Nova Micro公式モデルカード](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-micro.html)は東京のGeo対応を示す一方、詳細にはAPACのID・配送先が掲載されていないため、上表のNova APAC詳細は実際の一覧応答を根拠とする。`ACTIVE` は推論プロファイルの存在・状態であり、モデルの契約・利用権限・クォータ充足や推論成功の確認ではない。

### 推奨する構成

会社のSSOとCLIの既定リージョンは東京を維持し、今回のBedrock呼び出し元も東京へ揃える案を推奨する。日本を主拠点とする開発・管理と整合し、コンペ規定も米国を求めていないためである。モデルを含めた暫定案は7節のHaiku 5.5構成とし、接続後の比較テストで再評価する。利用者の回線からの速度・モデル品質・総費用の比較測定はしておらず、最安・最速を保証する提案ではない。

| 項目 | 現在のコード | 提案 |
|---|---|---|
| Bedrockリージョン | `us-east-1` | `ap-northeast-1` |
| 根の分析モデル | `us.anthropic.claude-sonnet-4-6` | `jp.anthropic.claude-haiku-5-5` |
| 属性・優先度モデル | `amazon.nova-micro-v1:0` | `jp.anthropic.claude-haiku-5-5` |

東京への窓口統一だけでは日本国内だけでの推論を意味しない。比較したNova Microは上表のAPAC内で処理される。今回選んだHaikuのJPプロファイルは東京・大阪に推論先を限定できる。世界向け提供ではサービスごとに顧客・データ要件を評価し、全サービスを東京やGlobal推論へ固定しない。Globalプロファイルは世界向け配信そのものの要件ではなく、推論の配送範囲を広げる選択肢である。[推論方式の違い](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html)

東京案を採用する場合は、コード定数に加えて7節のAPI互換対応、IAMの対象プロファイル／配送先モデル、テストのモデル指定、README等のUS前提の説明と検証記録を整合させ、初回利用準備後に実モデル検証を行う。過去のUS向け検証履歴は書き換えない。今回は調査と提案の記録のみで、アプリ・AWS設定・契約を変更せず、有料推論も実行していない。

## 7. 用途・費用に合わせたモデル選定

2026-10-23 JST時点の推奨は、東京のBedrock Runtime / Converseから **`jp.anthropic.claude-haiku-5-5` を3工程で利用する構成**。初回の評価ではthinkingを明示的に無効化する。まず1モデルで検証し、根の分析が下記の品質条件を満たさない場合のみ、その工程を `jp.anthropic.claude-sonnet-4-6` へ変更する。実行時の自動切替や複数モデルの投票は導入しない。

### 用途との対応

| 工程 | 必要な能力 | 初期選定 |
|---|---|---|
| 属性付与 | 日本語から話題・欲求／義務等・相対的強度を抽出する | Haiku 5.5 |
| 根の分析 | 話題が異なる発言を、共通する解消条件からまとめる | Haiku 5.5。Sonnet 4.6を比較基準にする |
| 行動可能性の判定 | 与えられた根を変えず、今できる小さな行動をJSONにする | Haiku 5.5 |

現在の `src/enrichment.js` と `skills/infer-thought-roots/SKILL.md` に基づく。最終的に注目する根の選択はコードの決定的な計算であり、モデルに順位を決めさせる用途ではない。画像・音声モデル、大規模な知識検索や長時間の自律実行向けモデルを選ぶ必要はない。

[メーカーの説明](https://platform.claude.com/docs/en/models/haiku-5-5/overview)はHaiku 5.5を分類・抽出等の用途に位置づけている。ただし、これは本アプリの日本語での根の分析品質を証明するものではない。[AWSモデルカード](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html)はConverseとJPプロファイルへの対応を示す。実アカウントの東京向け `list-inference-profiles` でもJP Haiku 5.5が `ACTIVE` で、東京・大阪のモデルARNを返すことを確認した。利用準備・クォータ・実推論の成功は未確認。

### 費用と候補の比較

標準オンデマンド、USD、100万課金トークン当たり。キャッシュ・Batch・契約割引・税を含めない。Haikuは入力10万トークン以下の料金。JP Claude料金はメーカーの基準単価に、Bedrockの地理限定推論の10%加算を適用した見積もりである。[Claude公式料金とBedrock加算](https://platform.claude.com/docs/en/about-claude/pricing)

| 候補・推論範囲 | 入力 | 出力 | 判断 |
|---|---:|---:|---|
| **Haiku 5.5 / JP** | **$0.11** | **$0.55** | 初期採用。国内推論と低費用を両立 |
| Nova Micro / APAC | $0.042 | $0.168 | 単価はさらに低いが、今回の規模での差額は小さい。日本語の根の分析品質は未検証 |
| Nova 2 Lite / JP | $0.396 | $3.311 | 国内推論の別候補。Haikuより高く、今回これを優先する実測根拠はない |
| Sonnet 4.6 / JP | $3.30 | $16.50 | 根の分析の比較基準。品質不足時の変更先 |
| Sonnet 5.5 / Global | $2.00 | $10.00 | 4.6 JPより低単価だが、東京から使う場合は世界への推論配送を伴う |

Novaの数値は東京のAWS Price List API `AmazonBedrock` カタログから、通常のRuntime向け入出力項目を抽出した。取得日2026-10-23、カタログ版 `20261016210806`、公開日時 `2026-10-16T21:08:06Z`。Nova 2 LiteはGlobalではなく地理限定の通常料金を使用。再取得は以下で行う。

```sh
aws pricing get-products --service-code AmazonBedrock \
  --filters Type=TERM_MATCH,Field=regionCode,Value=ap-northeast-1 \
  --region us-east-1 --profile alexa-thought-map \
  --output json --no-cli-pager
```

参考として、東京から利用できるGPT-6 Lunaも比較した。[AWSモデルカード](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-luna.html)上の短い入力向けGlobal単価は入力$0.10・出力$0.50。Haiku JPと近い費用だが、東京のRuntimeではGlobal推論となる。Haiku JPを上回る本アプリでの品質実測はなく、今回は採用しない。これはメーカー間の一般的な性能順位を意味しない。

**試算**：1回のマップ分析を属性・根・行動可能性の計3呼び出しとし、合計で入力10,000・出力2,800課金トークンと仮定すると、全工程Haiku JPは **$0.00264/回、1,000回で$2.64**。同じ課金トークン数で根に入力4,000・出力1,500を割り当て、Sonnet 4.6 JP＋残りNova Microにした場合は **$0.0384204/回、1,000回で約$38.42**。計算はDecimalによるassertで確認した。実測トークン数ではなく、再分析・再試行・thinking・インフラ等の追加費用を含めない。トークナイザーがモデル間で異なるため、同じ文章に対する実際の料金比とも区別する。

### 導入前に確認すること

- API互換：現コードは `temperature: 0` を送るが、Haiku 5.5ではtemperature等を省略する必要がある。thinkingは既定で有効なので明示的に無効化する。将来thinkingを有効化する場合、現コードは非textブロックをすべて拒否するため、推論ブロックの扱い・出力上限・費用も検証する。[公式移行ガイド](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide)
- 品質：既存の16発言の合成fixtureを使い、話題別分類に戻らず共通の解消条件を拾うこと、欲求を残すこと、根拠のない事情や診断を足さないこと、発言ID・JSONが有効なことを確認する。日本語の根の分析はSonnet JPとも比較し、人が意味を確認する。固定の根数や特定の表現への一致だけで合格にしない。
- 運用：各工程のusage、全3工程の応答時間、失敗率を記録する。モデルの宣伝上の速度は、このアプリの3工程全体の測定値としない。

この選定は導入候補の決定であり、実測による品質合格ではない。モデル呼び出し・Marketplace同意・契約・コード変更は行っていない。

### 接続後のモデル再評価予定（2026-10-24合意）

利用者の方針により、現在のモデル選定は暫定とし、Bedrock接続確認後のテストで再評価する。以下は未実施の予定。合成データを使い、予算・試行回数を限定して比較する。

- [ ] 接続確認後、その時点で利用可能なClaude・Amazon Nova・OpenAI等から比較候補を絞る。日本国内での推論は必須条件として扱わず、推論先・料金・API対応も判断材料にする。
- [ ] 同じ日本語の発言セットと出力スキーマで、属性付与・根の分析・行動可能性の判定を比較する。モデル固有のthinking設定・出力上限等の条件も記録する。
- [ ] 根の分析を重点的に、人が意味を評価する。共通の解消条件、欲求の保持、根拠のない事情の追加、発言ID・JSONの妥当性を確認する。
- [ ] 各工程と3工程全体の応答時間、失敗率、実際のトークン使用量・分析1回当たりの費用を記録する。再試行分の費用も区別して含める。
- [ ] 品質・速度・実費を合わせて工程ごとの採用モデルを決め直し、このガイドと実装設定を更新する。

## 公式資料

- [AWS CLI: IAM Identity Center (SSO) の設定](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [AWS CLI: 名前付きプロファイルと認証情報ファイル](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [Bedrock: Claude Sonnet 4.6](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html)
- [Bedrock: Nova Micro](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-micro.html)
- [Bedrock: 推論プロファイルの権限要件](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-prereq.html)
- [Bedrock: モデル利用要件](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- [コンペ公式規定](https://amazonappdev2026.devpost.com/rules)
- [コンペ公式FAQ](https://amazonappdev2026.devpost.com/details/faqs)
- [Bedrock: 推論プロファイル一覧の取得](https://docs.aws.amazon.com/cli/latest/reference/bedrock/list-inference-profiles.html)
