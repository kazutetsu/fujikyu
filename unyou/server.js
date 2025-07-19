const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database('./schedule.db', (err) => {
  if (err) {
    console.error('データベース接続エラー:', err);
  } else {
    console.log('✅ データベース接続成功');

    // ✅ DB接続後にテーブルを作成
    db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        date TEXT,
        label TEXT,
        car_number TEXT,
        note TEXT,
        PRIMARY KEY (date, label)
      )
    `, (err) => {
      if (err) {
        console.error('テーブル作成エラー:', err);
      } else {
        console.log('✅ テーブル作成完了');
      }
    });
  }
});

// ✅ データ取得API（日付指定）
app.get('/api/schedules', (req, res) => {
  const date = req.query.date;
  if (!date) {
    return res.status(400).json({ error: 'dateが必要です' });
  }

  db.all("SELECT * FROM schedules WHERE date = ?", [date], (err, rows) => {
    if (err) {
      console.error('データ取得失敗:', err);
      return res.status(500).json({ error: 'データ取得失敗' });
    }
    res.json(rows);
  });
});

// ✅ データ保存API
app.post('/api/schedules', (req, res) => {
  const { date, label, car_number, note } = req.body;
  if (!date || !label) {
    return res.status(400).json({ error: 'dateとlabelが必要です' });
  }
  const created_at = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  console.log(`受信: 日付=${date} / ダイヤ=${label} / 車両番号=${car_number} / 備考=${note} /時刻=${created_at}`);

  const stmt = db.prepare(`
    INSERT INTO schedules (date, label, car_number, note)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date, label) DO UPDATE SET
      car_number = excluded.car_number,
      note = excluded.note
  `);

  stmt.run(date, label, car_number, note, function (err) {
    if (err) {
      console.error('保存失敗:', err);
      return res.status(500).json({ error: '保存失敗' });
    }
    res.json({ message: '保存成功' });
  });
});

// ✅ 毎日23:50にその日のデータを削除
cron.schedule('50 23 * * *', () => {
  const today = new Date().toISOString().split('T')[0];
  console.log(`🧹 ${today} のスケジュールを削除`);
  db.run("DELETE FROM schedules WHERE date = ?", [today], (err) => {
    if (err) console.error('削除失敗:', err);
    else console.log('✅ 本日のスケジュールを削除');
  });
});

// ✅ サーバー起動
app.listen(port, () => {
  console.log(`🚀 サーバー起動: http://localhost:${port}`);
});
