# npm Publishing access一括変更の不採用

- 日付: 2026-07-21
- 対象: `fm-0631`
- 結論: npmアカウント全体の2FA／token禁止を本campaignでは変更しない。

この項目は旧文書で「任意・推奨」として持ち越されたもので、対象package、現在のtrusted publishing、
automation token、release workflow、rollbackが定義されていない。アカウント全体のPublishing accessを
先に変更すると、工場コア製品の正規publishを停止させる可能性がある。

設定画面、credential、token、2FA状態には触れていない。将来hardeningする場合は、packageごとの
公開経路とCIを棚卸しし、目的・影響・rollbackを示した独立security waveとしてH承認を得る。
