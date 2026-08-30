# api-spec

## REST API
- `GET /api/health`: 稼働状態・機能フラグ・Git同期状態を返す
- `GET /api/files?path=...`: `workspace/` 内の対象ファイル内容を取得
- `POST /api/upload` (multipart): 画像保存して相対パスを返す
- `POST /api/attachments/gc`: 未参照添付ファイルを削除
- `POST /api/logs/client`: クライアントログを保存

## WebSocket
- `GET /ws?token=...` で接続
- 接続後5秒以内に `{ "type": "auth", "token": "..." }` が必要
- 認証失敗時は Close Code `4003`

## セキュリティ検証
- `.env` は起動時に Zod で検証
- ファイル操作前に必ず `validateAndResolvePath` でパス正規化と境界チェック
- 全レスポンスに `Referrer-Policy: no-referrer`
