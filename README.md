# MyWealth — Personal Financial Dashboard

## Running the app
```bash
python -m http.server 8080
```
Then open http://localhost:8080

## Running tests
```bash
npm test
```

## Notes
- Data is stored in browser localStorage only — nothing is sent to any server.
- Market data features require an internet connection (Yahoo Finance / TASE via allorigins.win proxy).
