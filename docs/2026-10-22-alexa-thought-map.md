# Alexa+ 聞き役マップ（仮称）基本設計

Amazon Developer Hackathon「Build, Ship, Shape」Alexa+ 部門への応募案。アイデアと基本設計は Claude Code と利用者が決め、実装と検証は Codex が担う。この1ファイルで引き継ぐ。

## 0. Codex への作業の決まり

- 9章のタスクを上から順に進める。各タスクの完了条件を満たしたら次へ進む。
- 1〜8章の内容は利用者と合意済み。変える必要があると判断したら、変えずに 11章「Codex からの質問」に書いて止まる。
- 実装の中で決めること（リポジトリ、置き場所、認証、ライブラリ、使う Bedrock のモデル名など）は、この設計書に書いていない。実装時に決め、決めたことは 11章の下に追記する。
- 10章の課題のうち「Codex が確かめる」とあるものは、該当タスクの中で確かめ、結果を追記する。
- 締切：2026-10-23 12:00 PT（日本時間 10-24 04:00）。動画・説明文・フィードバックの作業を見込み、実装は日本時間 10-23 の夜までに区切る。

## 0.1 規約の要点（Alexa+ 部門）

- 提出物：Agent Skill か、自前でホストする MCP サーバー（MCP 仕様 2025-11-25 以降、Streamable HTTP）。Alexa+ を模したシミュレーションでの提出も可。
- MCP・Agent Skill はコードで実際に読み込み・呼び出していること（README に書くだけは不可）。
- 提出：GitHub リポジトリ（公開ならオープンソースのライセンス）、起動手順、3分未満のデモ動画（YouTube か Vimeo）、説明文、使ったツールごとの製品フィードバック。英語か、英訳付き。
- 加点：Friction Log（つまずきの記録）で最大10%。
- 審査：4基準が同じ重み（Tech Implementation／Design／Potential Impact／Quality of the Idea）。
- 規約の原文：[[Build, Ship, Shape Amazon Developer Hackathon Build across Amazon Devices and shape what's next.]]

## 1. アイデア（1枚紙）

### 困りごと

今の AI は一言ごとに返事をして、解決しようとする。そのたびに思考が途切れ、頭の中を吐き出して整理するのに向かない。文字起こしは混沌を文字にしただけで、要約は大事なところまで薄める。

### 体験

- Alexa は聞き役に徹し、短い相づちだけを返す。
- 利用者が「見せて」と言ったときだけ、整理した結果を画面に出す。
- 整理は3段階で見せる。
  1. **減る**：ばらばらの言葉が、少数の話題の塊になる。
  2. **名前が付く**：塊を根っこで組み替える。別々の言葉が、実は同じ根から来ていたと分かる。根っこは分類名ではなく、一文で言い当てる。
  3. **一つに絞られる**：いちばん効く根っこだけを前に出し、根の一文と次の一手を示す。
- 吐き出しは日をまたいで貯まる。

### 一言

文字起こしでも要約でもなく、頭の中の地図。

### 動画の流れ（3分未満）

1. 困りごと：AI に話すと毎回返事をされて、考えが途切れる（20秒）
2. 吐き出し：Alexa は相づちだけ。取りとめなく話す（40秒）
3. 「見せて」→ 3段階が動く（60秒）
4. 比較：同じ吐き出しを、文字起こし／要約／地図で並べる（30秒）
5. 日をまたいで貯まる、仕組みの説明（20秒）

### 審査基準との対応

| 基準 | 根拠 |
|---|---|
| Tech Implementation | MCP サーバー（Streamable HTTP、仕様 2025-11-25）、裏の推論（Bedrock）、MCP Apps、Agent Skill |
| Design | 声で吐き出し、画面で見る。聞くときは黙り、求めたときだけ見せる |
| Potential Impact | 考えがまとまらない人、抱えすぎた人、自己紹介や企画を準備する人 |
| Quality of the Idea | 「返事をしない AI」の逆張り。規約の「創造的」の例のうち、セッションをまたぐ状態、MCP Apps、Agent Skills に当たる |

## 2. 構成

```
利用者 ─ 声 ─ Alexa+（またはシミュレーター）
              │ MCP（Streamable HTTP）
              ▼
         MCP サーバー ── 保存（発言・分析結果）
              │ 裏の処理（非同期）
              ▼
         分析：①属性付け → ②根っこの推論 → ③優先づけ（Bedrock）
```

- MCP サーバーは、発言の受け取りと結果の返却だけを同期で行う。推論はすべて裏で行う。
- 推論の手順は Agent Skill（`SKILL.md`）にまとめ、サーバーはそれを読み込んで推論の指示に使う。同じ手順を、Agent Skills に対応した他のエージェントでも使える。

## 3. MCP ツール

| ツール | いつ呼ばれるか | 返すもの |
|---|---|---|
| `capture_thought` | 利用者が考えを話したとき（「見せて」以外の発言） | 相づち用の最小データ（受け取ったこと、未分析の件数）。文章は返さない |
| `show_map` | 「見せて」「整理して」と言われたとき | 分析が終わっていれば結果のデータと画面（MCP Apps）。終わっていなければ「少し待って」に当たる状態 |
| `focus_root` | 画面で根っこをタップしたとき（画面から呼ぶ） | その根の言葉の一覧と、根の一文、次の一手 |

- ツールの説明には、`capture_thought` に発言を原文のまま渡すよう書く。
- 返り値はデータ構造で返す。Alexa はそこから応答を作る。音声だけの端末でも中身が伝わるよう、`show_map` の結果には「根の一文」と「次の一手」の欄を持たせる。

## 4. データ

### 発言（Fragment）

| 項目 | 内容 |
|---|---|
| 本文 | 届いた発言の原文 |
| 時刻 | 受け取った時刻 |
| 話題 | ①で付ける |
| 向き | ①で付ける。やりたい／やらねば／避けたい／迷い／不安 |
| 強さ | ①で付ける。その文脈の中での強さ |
| 解消条件 | ②で付ける。この気がかりは何が解決すれば消えるか |

### 分析結果（Analysis）

| 項目 | 内容 |
|---|---|
| 版 | 分析した発言の範囲。新しい発言が来たら古くなる |
| 状態 | 分析中／完了 |
| 話題の塊 | 1段目。話題名と、属する発言 |
| 根っこ | 2段目。根の一文、属する発言、てこの大きさ（その根が解決すると消える発言の数） |
| 焦点 | 3段目。前に出す根、その理由、次の一手 |
| すぐ片づくもの | 根に属さない小さな未処理（任意） |

## 5. 推論の流れ

1. **属性付け（軽量モデル）**：発言ごとに、話題・向き・強さを付ける。直前の数件とその回の主題を一緒に渡す。向きは1発言だけでは決まらないため。
2. **根っこの推論（強いモデル）**：全発言と属性をまとめて渡す。手順は次のとおり。
   1. 各発言に「何が解決すれば消えるか」を一文で書く。
   2. 解消条件が同じものに依存する発言を、同じ根にまとめる。
   3. 根を分類名ではなく、状態を言い当てる一文で名づける（例：「時間」ではなく「案が一つに決まっていない」）。
   4. 根は3〜5個まで。どこにも属さない発言は無理に入れない。
3. **優先づけ（軽量モデル、jev 型）**：根ごとに、型の決まった短い判定を返す（今すぐ手をつけられるか：はい／一部／いいえ）。焦点は、てこの大きさと判定の組み合わせで決める。言及回数は補助。「やりたい」の根は消さずに残す。

- 分析は、新しい発言が数件たまるたび、または `show_map` のときに裏で走らせる。
- 同じ入力でも結果が揺れるため、デモ用には結果を固定できるようにする。

## 6. 画面（MCP Apps）

| 状態 | 表示 |
|---|---|
| 聞いている | ほぼ何も出さない。受け取った件数が小さく分かる程度 |
| 分析中 | 「少し待って」に当たる表示 |
| 0. 吐き出し | 言葉がばらばらに浮かぶ（灰色） |
| 1. 減る | 話題ごとの塊に寄る |
| 2. 名前が付く | 根で組み替わる。言葉が別の塊へ移る動きを見せる |
| 3. 一つに絞られる | 焦点の根だけを残して他を薄くし、根の一文と次の一手を出す |

- 画面は 768×480 の基準で作る（Echo Show 8/15 で 1.667 倍）。泡の字は基準 12〜14px、根の名前は 20〜24px。
- 3段目は文章の欄を並べるので、全画面表示を前提にする。
- 泡の配置はサーバー側で先に計算し、端末では計算済みの位置へ動かすだけにする。
- 公式の制約：タップの的は 48×48px 以上。コントラストは 17px 以下で 4.5:1。点滅は1秒に3回まで。明暗両方の表示に対応する。

## 7. シミュレーター

本物の Alexa+ では確かめられないため、審査では Alexa+ を模したシミュレーターで見せる。

- Echo Show 風の枠の中に MCP Apps の画面を表示する。
- 発言を受け、MCP ツールを呼び分ける役を担う。ツールは少ないので、「見せて」系の発言かどうかで呼び分ける単純な振り分けで足りる。
- 本物の Alexa+ との違い（相づちを完全には制御できない等）は、説明文に正直に書く。

## 8. 事前検証：根っこの推論（2026-10-22、Claude による机上の試行）

### 方法

架空の吐き出し16件に、5章の手順をそのまま当てはめた。例文は試す側（Claude）が作ったので、結果は手順の筋を確かめる程度の意味しかない。本物の検証は、利用者自身の吐き出しで行う必要がある。

### 例文

1. 来週の登壇の自己紹介、何を言えばいいか決まらない
2. 肩書きが多すぎて一言で言えない
3. 請求書まだ出してない
4. ポートフォリオサイト、2年更新してない
5. 新しい案件の見積もり、相場がわからない
6. 最近、絵を描いてない
7. 夜ずっとスマホ見てる
8. あの人に返信してない
9. 本当は音楽の仕事をもっと増やしたい
10. 頼まれると断れない
11. 見積もり、安くしすぎた気がする
12. 疲れが抜けない
13. 来月の予定がもう埋まってる
14. 自分の強みって何だろう
15. SNS の投稿、止まってる
16. なんかずっと焦ってる

### 結果

- **1段目（話題）**：仕事の事務（3、5、11）、発信（1、2、4、14、15）、生活と体（7、12）、創作（6、9）、人間関係（8、10）、予定（13）、気分（16）。分類しただけで、新しい気づきはない。
- **2段目（根っこ）**：解消条件で組み替えると、次の3つにまとまった。
  - **自分を一言で言えると決めていない**（1、2、4、5、9、11、14、15）：てこ 8。話題の段では「発信」と「仕事の事務」に分かれていた「肩書き」と「見積もり」が、同じ根に入った。何者として売るかが決まれば相場も決まる、という依存関係。この組み替えが「おっ」の瞬間になりうる。
  - **断れずに余白がない**（6、7、10、12、13）：てこ 5。「絵を描いてない」が創作ではなく、余白の問題に移った。
  - **すぐ片づく未処理**（3、8）：根ではなく、すぐ片づくものとして別に出す。
  - 16（焦り）はどの根にも属さず、全体の気分として扱う。
- **3段目（焦点）**：「自分を一言で言えると決めていない」。てこが最大で、今夜一文を書くことから手をつけられる。次の一手：「肩書きを一つに絞った自己紹介を一文で書く」。

### 分かったこと

- 「何が解決すれば消えるか」の問いは、話題の分類とは違う組み替えを生む。手順として筋は通る。
- 根の名前を状態の一文にすると、分類の見出しより「言い当てられた」感が出る。
- 不確かな点：一つの発言が複数の根に効く場合（11 は余白の問題でもある）の扱い。今回は最も強い一つに寄せた。
- 本物の検証には、利用者自身の実際の吐き出しが要る。Bedrock のモデルで同じ質が出るかも未確認。

## 9. 実装タスク（Codex 向け）

順番は上から。完了条件を満たしたら次へ進む。

| # | タスク | 完了条件 |
|---|---|---|
| 1 | MCP サーバーの骨組み：`capture_thought` と `show_map`、発言の保存 | MCP Inspector から両ツールを呼べる。発言が保存され、再起動しても残る |
| 2 | Agent Skill：推論の手順（5章の2）を `SKILL.md` にまとめる | 規約の Agent Skill として読める形。サーバーがこれを推論の指示として読み込む |
| 3 | 根っこの推論：裏の処理で 5章の2 を実行し、分析結果を保存 | 8章の例文で、話題の段と違う組み替えが出る。`show_map` が分析中なら分析中を返す |
| 4 | 優先づけ：根ごとの判定と焦点の決定 | 焦点・理由・次の一手が分析結果に入る |
| 5 | 属性付け：発言ごとの話題・向き・強さ | 分析結果の塊と向きに反映される。時間が足りなければ後回しにしてよい |
| 6 | MCP Apps の画面：6章の状態と3段階の動き | Echo Show 8 相当の大きさで、3段階を順に表示できる。明暗両方で読める |
| 7 | シミュレーター：7章 | 発言から相づち、「見せて」から画面表示まで通しで動く |
| 8 | デモ用の固定データと結果の固定 | 同じ入力で毎回同じ画面になり、動画を撮り直せる |
| 9 | 提出物の材料：README の起動手順、製品フィードバック、Friction Log の記録 | 規約の提出要件を満たす下書きがある |

## 10. 課題とリスク

| # | 内容 | 影響 | 扱い |
|---|---|---|---|
| 1 | 作るものが膨らみ、締切までに仕上がらない | 提出できない | 9章の順で進め、5（属性付け）は後回しにできる。2段目（根っこ）に力を集中する |
| 2 | 本物の Alexa+ で確かめられない（開発環境は米国中心、日本未提供） | 審査はシミュレーターと動画で見られる | シミュレーターで見せ、本物との違いを説明文に書く |
| 3 | Alexa+ は話しかけるたびに返事をする。完全に黙らせる手段は公式文書にない | 核の体験（黙って聞く）が本物では相づち止まり | 相づちは最小データで返し、応答を短くする。動画と説明文で正直に区別する |
| 4 | 根っこの推論の質が、デモの成否を決める | 分類しただけの図になる | 8章の手順で実装し、利用者自身の吐き出しで試す。Codex が確かめる（タスク3） |
| 5 | 発言が Alexa+ から原文で届かず、言い換え・要約される恐れ | 入口で「薄まる」 | ツールの説明で原文を促す。本物では未確認のまま説明文に書く |
| 6 | Follow Up Mode（呼びかけなしで約8秒話し続けられる）が add-on で効くか不明。公式ヘルプは「スキルでは動かない」 | 毎回の呼びかけで流れが途切れる | 本物では未確認のまま説明文に書く |
| 7 | MCP Toolkit は往復 500ms 未満が要件。LLM の推論は数秒かかる | 要件違反 | 推論はすべて裏で行い、ツールは保存と計算済み結果の返却だけにする |
| 8 | LLM の結果が毎回揺れる | 動画を撮り直せない | デモ用に結果を固定する（タスク8） |
| 9 | 提出は英語か英訳付き。Alexa+ の開発例は en-US のみ | 言語の決め方で例文・画面の字が変わる | デモの言語は未決定。利用者が決める |
| 10 | 似た「頭の中を整理する AI」アプリとの差を調べていない | 「ありきたり」と見られる | 未着手。説明文を書く前に確かめる |
| 11 | 共有の端末で私的な内容を話すことへの抵抗 | Design で突かれる | 未対応。説明文で使う場面（一人の時間、書斎など）を示す案 |
| 12 | 一つの発言が複数の根に効く場合の扱い | 根の組み替えが不自然になる | 当面は最も強い一つに寄せる。Codex が確かめる（タスク3） |
| 13 | Echo Show 5 とスマホの縦画面での見え方 | 小さい画面で字が読めない | デモは Echo Show 8/15 相当で見せる |

## 11. 経緯と決めたこと

### 経緯の要約

- 当初は家族・家事、仕事・学習・店舗などの案を出したが、どれも既存品や他の応募と重なるか、利用者の実感が伴わず、採らなかった。
- 利用者の案（ジャーナリング・習慣記録、グラフィックレコーディング、声で指すチェス、タブラの Bol からの演奏再生）もレビューした。ジャーナリングとチェスは既存品が多く、グラフィックレコーディングは Alexa+ が常時は聞かない仕組みと合わず、タブラは利用者の層が狭い。
- 方向性として、大規模な実装を避け、一言で伝わるアイデアを小さく作ると決めた。出発点は利用者自身の困りごととした。
- 利用者の困りごと（AI がいちいち返事をするので頭の中を吐き出せない）から、この案になった。

### 決めたこと

- 整理の見せ方の骨格は3段階（減る → 名前が付く → 一つに絞られる）。
- 文字起こしや要約は作らない。欲しいのは組み替え。
- 推論にはサーバー側で AWS Bedrock を使う。
- 相づちはすぐ返し、推論は裏で行う。終わっていなければ「少し待って」に当たる応答を返す。
- 根っこは強いモデルでしっかり推論する。優先づけは jev 型（TypeSafe AI の System One Models の考え方：型の決まった短い判定を返す）を、Bedrock の軽量モデル（Amazon Nova Micro など）で実現する。TypeSafe の jev そのものは使わない。
- Alexa にはデータ構造で返す。
- 「感情」は声の調子ではなく、文脈に対する意思や情動の向き（やりたい／やらねば／避けたい／迷い／不安）。

### 未決定

- 製品名
- デモの言語
- 図の最終的な形（塊マップを主役にするか）

### Codex からの質問

（Codex はここに書いて止まる）

### 実装時に決めたこと

#### 2026-10-22：タスク1の実装と検証状況

- 既存のローカルリポジトリを使った。コミット、リモート、GitHub の変更はしていない。
- Node.js 26、ES Modules の JavaScript とし、公式 MCP SDK `@modelcontextprotocol/sdk` 1.29.0 と `zod` 4.6.5 を固定した（`package.json`、`package-lock.json`）。
- `src/server.js` に `capture_thought` と `show_map` を実装した。`127.0.0.1` の `/mcp` で、ステートレスな Streamable HTTP と JSON 応答を使う。ローカルの Host と Origin を検証し、Inspector の既定 UI（localhost／127.0.0.1 の 6274 番）を許可する。外部サービスの設定は使わない。
- `src/storage.js` は Node.js 組み込み SQLite を WAL モードで使い、発言の原文と受信時刻を保存する。既定の保存先は `data/thought-map.sqlite`。`.gitignore` で `data/` と `node_modules/` などを除外した。
- `capture_thought` は受信確認と未分析件数だけを返す。`show_map` は現段階では `empty`／`pending` と件数を返し、根の一文・次の一手は null とする。タスク2以降は実装していない。
- 起動と Inspector の手順は `README.md`、保存の検証は `tests/storage.test.js`、MCP の検証は `tests/mcp.test.js` に置いた。

#### 2026-10-23：タスク1の完了確認（JST）

**タスク1の完了条件を満たした。タスク2には着手していない。**

- 以前の `ENOTFOUND registry.npmjs.org` は今回も sandbox 内で再現した。正式な権限昇格後、`npm install --save-dev --save-exact @modelcontextprotocol/inspector@2.12.0 --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` が成功（228 packages）。SDK 1.29.0、zod 4.6.5 を維持し、Inspector 2.12.0 を devDependencies と lockfile に固定した。
- Node.js 26.0.0／npm 11.12.1 で `npm test` は **2 tests / 2 pass / 0 fail**。仕様 `2025-11-25` の実ハンドシェイク、両ツール、入力・Host・Origin の検証、原文・時刻の保存、別プロセスへの再起動を確認した。ローカル listen も sandbox の制約を受けるため、ネットワークテストは正式な権限昇格後に実行した。
- 実装の修正は起動時の1点のみ。Express の listen callback は失敗時にも呼ばれるため、error がある場合は address を参照せず、既存のエラーハンドラで終了するようにした。使用中ポートでの起動失敗を回帰検証に追加した。
- Host テストは Node の fetch が Host を置換するため `node:http` の request に変更。実際に不正 Host を送って 403 になることを確認した。

Inspector CLI の実行形式（URL は各プロセスが割り当てたもの）：

```sh
npx --no-install @modelcontextprotocol/inspector --cli http://127.0.0.1:63740/mcp --transport http --method tools/call --tool-name show_map
npx --no-install @modelcontextprotocol/inspector --cli http://127.0.0.1:63740/mcp --transport http --method tools/call --tool-name capture_thought --tool-arg 'text=Inspector task1 ctx_a9653153b0a2 2026-10-23 原文保存 🎵'
# 同じ DB_PATH でサーバーを停止・再起動した後
npx --no-install @modelcontextprotocol/inspector --cli http://127.0.0.1:64630/mcp --transport http --method tools/call --tool-name show_map
```

| 実行 | Inspector の structuredContent（全呼び出し exit 0） |
|---|---|
| 新規 DB の show_map | `{"status":"empty","pending_count":0,"root_sentence":null,"next_action":null}` |
| 固有の発言を capture_thought | `{"received":true,"pending_count":1}` |
| 再起動前の show_map | `{"status":"pending","pending_count":1,"root_sentence":null,"next_action":null}` |
| SIGTERM → 終了コード0 → 別プロセスで再起動 → show_map | `{"status":"pending","pending_count":1,"root_sentence":null,"next_action":null}` |

一時 DB `/tmp/thought-map-inspector-AteuLY/thoughts.sqlite` を使用し、既定の `data/thought-map.sqlite` は使用していない。再起動後に SQLite を readOnly で開き、行が1件、原文が上記固有文字列と完全一致、`received_at` が `2026-10-22T20:48:08.072Z`（JST 10-23 05:48）であることを assert で確認した。検証用サーバーは両プロセスとも正常終了済み。

未検証：Inspector の GUI、実 Echo／Alexa+、外部ホストへの接続。タスク2以降、Bedrock／有料 API、AWS 認証情報、コミット・push・公開は扱っていない。ローカル単一ユーザー用の骨組みであり、この完了は製品全体や提出要件の充足を意味しない。

#### 2026-10-23：タスク2の実装と検証（JST）

- タスク1の完了確認後、`skills/infer-thought-roots/SKILL.md` に5章の2の手順を英語で記述した。名前・説明の YAML frontmatter と独立して使える本文を持つ。全発言と既存属性、発言ごとの解消条件、共通の依存先による組み替え、状態の一文による命名、3〜5個を目安とする上限5根、無理に所属させない扱いを含む。証拠が足りないときは数合わせをせず、複数の根に合うときは既決の「最も強い一つ」を使う。優先づけや次の一手はこの段階で作らない。
- `src/root-reasoning.js` は module 相対の固定パスで実ファイルを読み、frontmatter を除いた本文を `rootReasoningInstructions` として export する。`src/server.js` の起動時 import で実際に読み込む。ファイル欠落・区切りの欠落・空本文は起動失敗とする。汎用 YAML パーサーや依存追加は行わず、配布する Skill の形式は validator で別途確認した。
- `tests/root-reasoning.test.js` を追加。本文と実ファイルの一致、Skill を欠くコピー環境で実サーバーが exit 1 / ENOENT になること、不正形式・空本文の拒否、別 cwd からの読み込み、CRLF と変更された本文の反映を検証した。コピーと DB は一時ディレクトリのみを使用した。
- `python3 /Users/akibe/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/infer-thought-roots` は **Skill is valid!**。`npm test` は sandbox 内で MCP の listen が拒否され3 pass / 1 fail、正式な権限昇格後は **4 tests / 4 pass / 0 fail**。既存 MCP の原文保存・再起動・入力／Host／Origin 検証に加え、capture の最小応答と show_map の empty／pending を維持できている。
- README に Skill の置き場所、起動時読み込み、配布時に `skills/` が必要なこと、検証範囲を記載した。

タスク2の証拠は形式と実行時読み込みまで。タスク3では export した本文をモデルへの指示として実際に渡す必要がある。推論の実行・非同期処理・分析保存・分析品質・Bedrock／有料 API・実 Alexa は未実施で、分析完了を表す応答も追加していない。コミット・push・公開は行っていない。

#### 2026-10-23：タスク3の実装準備完了・実推論品質は UNVERIFIED（JST）

**非同期推論・永続化の実装とローカル検証は完了。8章の実 Bedrock 推論は未実施なので、タスク3全体を完了／受入済みとはしない。** 1〜8章、タスク4以降、`docs/submission/` は変更していない。

- `src/analysis.js` は `show_map` で1版につき1回、応答後に推論を開始する。`capture_thought` は推論を待たず、従来の原文保存と最小応答を維持する。`rootReasoningInstructions` の実 Skill 本文をモデルの `system` にそのまま渡す。
- SQLite の `analyses` に入力の最終 ID を版として、原文・時刻入りの不変スナップショット、状態、モデル／テスト由来、結果、エラー種別、開始時刻を保存する。新しい入力に対して古い版の結果を ready として返さない。新しい版は古い処理が終わった後の `show_map` で開始する。未分析件数は最後の成功版より後の発言数。
- `show_map` は empty／pending／analyzing／ready を返す。ready は解消条件・根の一文・所属 ID・てこの大きさ・未所属 ID と原文を持つ。焦点の `root_sentence` と `next_action` は null のまま。話題属性・優先づけ・画面は実装していない。
- strict な shape と全 ID の一意な網羅、根は最大5個、leverage と所属件数の一致を検証する。不正 JSON、未完出力、異常 ID、プロバイダー失敗時は分析だけ失敗し、発言を保持する。エラー本文を保存しないため認証情報や私的入力を混入させない。
- 通常のポーリング、SDK、再起動には自動リトライを設けない。失敗／中断済みの現行版だけ `show_map({"retry":true})` で明示的に1回再試行できる。同時要求は1回にまとめ、ready は再試行しない。失敗を再試行して再度失敗しても通常ポーリングで追加課金しない。
- Coordinator のレビュー指摘を反映し、補助 `ThoughtStore` のオープンでは実行中状態を変更しない。中断復旧は単一所有者であるサーバー起動時に明示的に呼ぶ。1 DB に対しサーバーは1プロセスまでで、分散ロックは持たない。
- `@aws-sdk/client-bedrock-runtime` **3.1156.0** を追加・固定した。既定は Bedrock 無効。実サーバーに fake fallback はなく、テストの注入 provider／結果は `test:*` と明示する。SDK の `maxAttempts: 1`、60秒 timeout、入力全体24,000 UTF-8 bytes、出力4,096 tokens の上限を設定。入力超過時は捨てずに pending/error とする（長期蓄積へのセッション選択は未実装）。

公式資料の調査結果と実検証計画：

- [AWS Sonnet 4.6 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html) と [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html) を確認。`us-east-1` の `us.anthropic.claude-sonnet-4-6` を固定採用。US cross-region への送信であり東京内限定ではない。`bedrock:InvokeModel` と対象 profile／配送先モデルへの許可、モデル利用条件の充足が必要。AWS 設定・資格情報は調査も変更もしていない。
- [Anthropic 公式料金](https://platform.claude.com/docs/en/about-claude/pricing) の Sonnet 4.6 $3/$15 per million と Bedrock regional 10% 上乗せから、US は入力 $3.30／出力 $16.50 per million と概算。[AWS 料金表](https://aws.amazon.com/bedrock/pricing/)／アカウント条件を利用前に再確認する。入力3,000 tokens＋出力上限4,096で約 **$0.0775／1回**。入力を保守的に24,000 tokensと見ても約$0.147なので、**1回 $0.20 程度の予算承認**を次に求める。bytes は厳密な token 数でも請求上限でもなく税別概算。失敗／timeoutでも課金される可能性がある。
- 送信データは `tests/fixtures/section8.json` の架空16発言と Skill／schema のみ。topic は比較用ローカル baseline で、モデルに送らない。承認後のコマンドは `AWS_PROFILE=your-approved-profile BEDROCK_ENABLED=1 node src/verify-live.js`。明示有効化なしでは終了し、AWS を呼ばない。1回だけ実推論し、専用一時 SQLite（パスを出力、保持）とモデル／usage／根／原文を確認できる。架空の正解結果をモデルに与えない。
- 実結果で肩書きと見積もりの跨る根、創作から余白への組み替え、全件の解消条件、根を状態の一文で呼ぶこと、未所属を無理に所属させないことを人が確認する。表現の完全一致を合格条件にはしない。コマンドの cross-topic フラグだけでも合格にはしない。その後に本人承認済みの実発言で検証が必要。

検証証拠：

- npm インストールは sandbox の `ENOTFOUND` 後、正式な権限昇格で成功。localhost MCP テストも sandbox では拒否されたため、正式な権限昇格後に `npm test` を実行。
- 最終 **11 tests / 11 pass / 0 fail**。非同期で capture が進むこと、重複起動防止、古い版の非表示、実 Skill の system 一致、別プロセスでの ready 復元、失敗／中断復旧と明示再試行、不正 shape／ID／leverage、Bedrock リクエスト形・出力上限・AbortSignal、live コマンドの無効化 guard、MCP ready の schema と text/structuredContent 一致を確認。従来の protocol／入力／Host／Origin／原文／再起動テストも成功。
- 8章 fixture の手書き fake では話題を跨ぐ所属と未所属の保存・返却を確認したが、これは推論品質の証拠ではない。実推論ゼロ、有料 API ゼロ、AWS mutation ゼロ。Inspector GUI、Echo／Alexa+、実品質と500ms性能 SLA は未検証。コミット・push・公開はしていない。

#### 2026-10-23：タスク3の保存失敗時クラッシュ修正（JST）

- 独立レビューで、結果保存と失敗状態保存の両方が失敗すると未処理の Promise rejection で Node が終了する問題を再現。`src/analysis.js` で最後の保存失敗を捕捉し、私的な例外本文を含まない固定診断を出してジョブを終了する。保存済み `analyzing` 行と原文は維持し、DB の書き込み復旧後に再起動すると `interrupted` へ復旧する。通常ポーリングでは推論を再実行せず、その後の明示 retry だけが再実行する。
- 子プロセスの注入 provider で `PRAGMA query_only = ON` にする回帰テストは修正前に終了コード1で失敗し、修正後に成功。未処理 rejection による終了がないこと、固定診断、原文保持、追加呼び出しなし、次の所有プロセスでの中断復旧と明示 retry を確認した。別の子プロセステストでは Bedrock 無効の実サーバーに fake provider のみを注入し、SIGTERM 時点で未完了の分析を待ち、ready を保存して正常終了することを確認した。
- `BEDROCK_ENABLED=0 npm test` は **13 tests / 13 pass / 0 fail**。有料呼び出し・AWS mutation・コミット・公開はゼロ。実 Bedrock 品質・Echo／Alexa+・Inspector GUI・500ms 性能 SLA は未検証で、タスク3の実品質は引き続き **UNVERIFIED**。`docs/submission/` は変更していない。

#### 2026-10-23：タスク3の承認済み1回検証・認証で停止（JST）

**タスク3の実品質ゲートは未通過（UNVERIFIED）。** 約 USD 0.20・架空16発言・既存 default 設定による1回だけの承認範囲で、`BEDROCK_ENABLED=1 node src/verify-live.js` を正式な権限昇格後に1回実行した。再実行はしていない。

- 事前に `maxAttempts: 1`、入力24,000 bytes／出力4,096 tokens、60秒 timeout、自動再試行なしを確認。実際に構成される入力は4,150 bytes。AWS 設定ファイルは存在するが default section と環境変数の認証情報はなく、SDK の read-only 認証解決は `CredentialsProviderError`。秘密値を表示せず、AWS 設定は変更していない。
- 06:51 JST の実行は `analyzing`／16件から `pending`／16件／`analysis_failed` となり exit 1。専用一時 SQLite の原文16件・スナップショット一致と分析1行（failed、result null）を read-only assert で確認した。モデル出力と token usage は得られておらず、話題を跨ぐ根・状態の一文・所属と未所属の品質は判定できない。実結果のデモ証拠は作成していない。
- 詳細は [task3-live-verification.md](task3-live-verification.md)。次の blocker は default chain で使える認証情報、または明示承認された既存 profile の指定。その後の1回は coordinator の追加指示が必要。モデルアクセス／IAM は未確認であり、課金記録も調査していない。marketplace・規約同意・IAM 変更、追加推論、`docs/submission/` の変更、commit／push／公開は行っていない。
- Coordinator の追加指示で profile metadata のみを調査。AWS CLI と SDK の両方で既存候補は **`metsa-deployer` 1つ**。credentials に access key／secret key の設定項目、config に region／output の項目があることだけを確認した。Node／SDK とも HOME は `/Users/akibe`、参照先は同じ `.aws/credentials` と `.aws/config` で、SDK が選ぶのは存在しない `default`。次に必要なのは `metsa-deployer` が意図した利用先であることの確認と、その profile を明示選択する追加1回の承認（別アカウントが意図なら default chain の準備）。候補の有効性・権限は未検証。今回の1回は認証解決で止まったコマンド実行であり、実モデル推論の成功や課金の証拠ではない。

#### 2026-10-23：タスク4・5のローカル実装と契約（JST）

**タスク3〜5の LIVE ACCEPTANCE は引き続き未完了。** 利用者の自律継続指示を受けた coordinator の明示許可により、タスク3の実品質ゲートに先行して可逆なローカル実装を進めた。1〜8章は変更していない。利用者は別の AWS profile を準備すると決めたため、`metsa-deployer` を選択・呼び出してはいけない。今回の worker は AWS 呼び出し・認証選択・AWS mutation を一切行っていない。

- 軽量推論は `us-east-1` の `amazon.nova-micro-v1:0`。2026-10-23 に [公式 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-micro.html) と [Converse 契約](https://docs.aws.amazon.com/nova/latest/userguide/using-converse-api.html) で in-region、system/message text、inferenceConfig を確認した。native structured outputs は非対応なので、JSON を要求しアプリ側の厳密な schema／ID 整合検証で拒否する。TypeSafe jev サービスは使わない。実アカウントの利用可否・品質・課金は未検証。
- タスク4：根ごとに `actionability: yes|partial|no`、理由、次の一手（no の場合は null）を検証し保存する。焦点は `leverage × (yes=2, partial=1, no=0)` の大きい順、同点は leverage、さらに同点は最小所属 ID で決定する。`root_id` は最小所属 ID。全根を残し、want_to の根も削除しない。すべて no／根なしなら focus は null とする。
- タスク5：原文と各発言の直前3件の ID を軽量モデルへまとめて渡す。モデルは snapshot の主題と、`topic`、`direction: want_to|must_do|avoid|uncertain|anxious`、`intensity: low|medium|high` を返す。話題の塊を確定的に組み立て、全属性と原文を実際に読み込んだ既存 Skill 本文とともに強い根推論へ渡す。声の診断やキーワード分類は行わない。現状は1 snapshot を1 session と扱う限界をコード・README に明記した。
- 同期ツール応答を待たせず、属性 → 根 → 優先の順で背景実行する。SQLite の既存 `analyses` に nullable `checkpoint` 列を追加し、成功した各段階の検証済み結果／source／usage を保存する。後段失敗・中断後も根を保持し、明示 retry のみで未完了段階を再開する。通常ポーリングと concurrent retry は追加呼び出しを作らない。途中で新規発言を受けた場合、古い焦点は返さない。失敗は `attributes_failed`／`analysis_failed`／`priority_failed` とし、秘密を含みうる provider エラー本文を保存しない。
- 出力契約は `src/analysis.js` の `mapAnalysisSchema` と README の表。既存 snake_case を維持し、`analysis.fragments` に属性、`topics:[{topic,fragment_ids}]`、`roots` に root_id／actionability／reason／next_action／score、`focus` に選択した根と理由・次の一手、`provenance` に各段階の source／usage を追加した。上位 root_sentence／next_action は focus と一致する。旧 root-only ready データは読み続けられ、未実施段階を捏造しない。
- UI 向け固定契約例は `tests/fixtures/section8-map.json`。全段階を `test:section8-handwritten` と明示した架空・手書き結果であり、Bedrock 出力ではない。サーバーはこの fixture を選ばず、元の `section8.json` は維持した。`src/verify-live.js` は従来のタスク3専用1回のままにし、属性／優先の追加課金が紛れ込まないようにした。通常の BEDROCK_ENABLED サーバーは1版あたり3回となるため、別の全段階向け承認が必要。
- Coordinator の依頼で、並行 UI worker 用に runtime `@modelcontextprotocol/ext-apps@1.7.5` と dev `vite@8.3.5` を exact install した。MCP SDK 1.29.0／zod 4.6.5 を維持した。今回の担当では UI ファイルや server の UI integration は編集していない。
- `BEDROCK_ENABLED=0 npm test` は **27 tests / 27 pass / 0 fail**（既存13、今回追加11、並行 UI worker の layout3）。型／ID／次の一手の不正値、優先同点・全no・want-to保持、直前文脈、根への属性伝達、後段失敗と明示 retry、再起動、由来保持、旧DB migration、stale focus、実 MCP の拡張応答 schema を確認した。モデルはすべて fake injection、DB は一時領域。データの根拠はテストであり、実推論品質・実 Alexa／Echo・500ms SLA・UI visual acceptance ではない。

残り：別 profile の準備と scoped authorization、その後のタスク3〜5の実 Bedrock 結果・usage・人による品質判定。コミット・push・公開は行っていない。`docs/submission/` と UI 計画書はこの worker では変更していない。

#### 2026-10-23：根なし時の不要な優先モデル呼び出しを修正

- 検証済み `roots: []` は優先モデルを呼ばず、全未所属 ID を保持した `ready`／`focus: null` を保存する。未実行の priority provenance／checkpoint は作らない。上記の通常3回は最大3回で、根なしなら属性・根の2回となる。
- 新規実行と既存の失敗／中断 checkpoint からの復旧、ready 後の poll／明示 retry／別プロセス再起動で priority が0回である回帰テストを追加。修正前の3ケース失敗を確認後、`BEDROCK_ENABLED=0 node --test tests/enrichment.test.js tests/analysis.test.js tests/storage.test.js tests/mcp.test.js` は **26 tests / 26 pass**。実 Bedrock は呼んでおらず、LIVE ACCEPTANCE は未完了のまま。

#### 2026-10-23：タスク6〜8のサーバー統合・固定英語デモ

- Apps 1.7.5 の実 helper で `show_map` と `ui://thought-map/map.html` を登録。リソース MIME は `text/html;profile=mcp-app`、listing/content 両方に空の CSP domain lists を付け、ready tool result の `_meta.layout` は既存 `createLayout` で作る。`focus_root` は app-only metadata と現在版の照合を持ち、古い版／未知の根を `isError` にし、保存済みの一文・理由・次の一手・所属原文だけを返す。
- `/simulator` と `/ui-config` は API と同じ loopback origin、`/sandbox.html?hostOrigin=...` は別ポートの loopback origin。公開経路を列挙し、raw repo・秘密ファイル・汎用 static 配信はしない。Host/port・Origin・親 origin を照合し、HTTP CSP と device Permissions-Policy を設定。SIGINT/SIGTERM は両 listener と DB を終了し、sandbox のポート競合時も先に開いた API listener を閉じる。
- `npm run build` は UI worker の既存 build を使い、`npm run demo` は build 後に専用 `--demo` を起動する。`demo/section8-map.en.json` は既存日本語の手書き fixture を英訳し、同じ所属・ID・未所属を保持した合成例。source と全段階を `demo:section8-english-handwritten`、usage を null とし、実モデル結果と称さない。
- デモは毎回新しい一時DBを作り、`DB_PATH` を無視して live DB を触らず、`BEDROCK_ENABLED=1` が残っていても provider を構築しない。固定例以外の capture は一時DBに原文保存し、以後の show_map は pending のまま。再起動で同じ固定例に戻り、正常終了時に一時DBを削除する。
- ブラウザー担当の準備コマンドは `npm run demo`、既定 URL は `http://127.0.0.1:3000/simulator`。別ポートなら `PORT=3100 SANDBOX_PORT=3101 npm run demo`。サーバー統合テストは resource/tool metadata、focus 成功・stale・不正引数、HTML、経路・Origin拒否、デモの別DB／同一結果の再起動、provider null、両 listener 終了と競合復旧を確認する。
- 実行証拠：`BEDROCK_ENABLED=0 npm test` は UI build を含め **38 tests / 38 pass / 0 fail**（subtest 込み）。`BEDROCK_ENABLED=0 PORT=0 SANDBOX_PORT=0 npm run demo` でも build・両 listener 起動・合成表示用モードを確認し、Ctrl-C の正常終了と一時DB削除を確認した。継続中のデモサーバーは残していない。

これはローカル HTTP／MCP 統合の実装・検証であり、別担当の UI 修正後の browser AppBridge／CSP継承／画面・操作受入は未完了。実音声、Alexa/Echo、実 Bedrock 品質・課金も未検証。1〜8章の仕様、`docs/submission/`、UI worker の web/layout/build ソースは変更していない。タスク3〜5の live gate と別 AWS profile 準備・利用承認は従来どおり残る。


#### 2026-10-23：タスク6〜8の独立ブラウザー受入（ローカル範囲）

**固定合成デモと通常モードの中核フローについて、ローカルブラウザー受入は通過。** 詳細・画面・未確認範囲は [browser-acceptance.md](browser-acceptance.md)。1〜8章の仕様は変更していない。

- 実際の `npm run demo` と一時 DB の通常モード（Bedrock 無効）を loopback で起動。実 MCP HTTP resource → 別 origin sandbox → App initialize／tool result → 四段階表示と `focus_root` を確認した。mock AppBridge／単体 HTML fallback は使っていない。
- 768×480 の実 App と、同じ実 host の iframe を 1280×800 に拡大した表示で、ノードの重なり・document overflow なし。light／dark、48px 以上の操作対象、代表文字色 contrast、reduced motion、全文のスクロール、keyboard 操作を確認。Replay は通信0件。
- 日本語・空白・改行・タグ風文字列の原文保存を一時 DB の read-only 照合で確認。保存応答待ちの新しい下書きと、別ダイアログ選択後の遅延 root 応答も保護された。App からの capture／retry は HTTP 前に拒否され、wrong-source と明示的な wrong-origin イベントの境界検査も通過。通信先は loopback のみ。
- 実ブラウザーで見つけた CSP の動的 schema compile による起動阻害と、iframe modal の Tab 脱出を別担当が修正。最終版を独立再検証し、CSP 違反・script 例外なし、Tab／Shift+Tab の閉じ込め、Escape／close と元の操作対象への復帰を確認した。
- デモ再起動で別の一時 DB が作られ、旧 DB が削除され、実 `show_map` の全結果・layout が一致。確認者が起動したサーバー／ブラウザーのみ後片付けし、両モードの計4ポートの停止と一時 DB 削除を確認した。

これは合成データの画面・ローカル通信・操作の受入であり、タスク3〜5の実 Bedrock 品質、実音声、Alexa+/Echo、利用者自身の製品受入、公開・動画・提出の承認ではない。別 AWS profile の準備と scoped authorization は従来どおり必要。`docs/submission/`、AWS、利用者 DB、commit／push／公開は変更していない。
