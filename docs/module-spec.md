# module-spec

## サーバーモジュール
- `config.ts`: 環境変数検証
- `fileService.ts`: ファイル読書きとパス検証
- `imageService.ts`: 添付保存、重複排除、GC
- `gitService.ts`: 自動コミット/リベース/Push のエラーハンドリング
- `snapshotService.ts`: 世代管理スナップショット
- `syncService.ts`: WebSocket 二段階認証
- `logService.ts`: サーバー/クライアントログ保存

## クライアントモジュール
- `configStore.ts`: 設定同期
- `main.ts`: モジュールの `init`/`destroy` ライフサイクル制御
- `preview.ts`, `presence.ts`, `offline.ts`: 動的切替対象
- `settingsUI.ts`: 設定トグルUI

## ライフサイクル
1. 起動時に `ConfigStore` から設定復元
2. 有効機能のみ `init`
3. 設定変更時は差分判定
4. OFF化対象を `destroy`、ON化対象を `init`
