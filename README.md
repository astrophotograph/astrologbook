# astrologbook

Astronomy Observation Log.  Tracks and organizes imaging sessions.

NOTE: this is a work in progress. It is written as a
separate module so it can be used standalone, in addition
to hopefully integrating it eventually with SeestarALP.


- ui - frontend in React
- server - simple Python API
- cli - majority of CLI code for scanning, loading, and managing images


# Configuration file

Everything is driven by a configuration file.

Format:

```
include = *.fit
exclude = ._Light*
```

# CLI

For the latest usage: 

```shell
uv run alog.py --help
```

# Web server

By default the web service usings a sqlite3 database.

*IF YOU RUN THIS WAY MAKE SURE YOU BACK UP THE DATABASE*

```shell
uv run fastapi dev main.py
```

