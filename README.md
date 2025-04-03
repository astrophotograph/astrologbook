# astrologbook

Astronomy Observation Log.  Tracks and organizes imaging sessions.

NOTE: this is a work in progress. It is written as a
separate module so it can be used standalone, in addition
to hopefully integrating it eventually with SeestarALP.

# Script

```shell
uv run alog.py --help
```

# Web server

By default the web service usings a sqlite3 database.

*IF YOU RUN THIS WAY MAKE SURE YOU BACK UP THE DATABASE*

```shell
uv run fastapi dev main.py
```