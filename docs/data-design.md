# data-design

## データ構造
- `workspace/note.md`: 共同編集対象 Markdown
- `workspace/attachments/*.webp`: SHA-256 先頭12桁のハッシュ命名
- `temp/logs/{server,client}/YYYY-MM-DD.log`: JSON Lines / テキストログ
- `temp/snapshots/<timestamp>/`: 世代管理付きバックアップ

## 状態管理
- クライアント設定 `UserConfig` を `localStorage`・URLハッシュ・BroadcastChannel で同期
- 動的モジュールの有効/無効を `preview/presence/offline` の3軸で管理
- Git同期状態は `healthy/degraded` を `/api/health` に反映

## 永続化戦略
- DBは使用せず、ファイルシステム + Git 履歴を唯一の永続層とする
- 添付画像は重複時に再保存せず既存ファイルを再利用
- GC で未参照ハッシュ画像を削除
