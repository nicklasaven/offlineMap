offlineMap
==========

Some code to help creating a true offline map

here is a collection of scripts to handle large files of twkb in the client through File API.

It is still a lot of bottlenecks that can be removed and some memory issues that limits possible file sizes when mamory is a limit.

## How to use it

Those scripts is served from http://sandbox.jordogskog.no/offlineMap<br>
So it possible to test what it is about from there.

Those scripts is in a "testing ideas" status. That means that there is quite a lot of things that doesn't really make sense and a lot of things that only works if you do it in the right order. So, to test it you better follow the instructions.

Sometimes there is some strange behavior that I think is related to opening the Indexeddb causing one cpu to steal 100%.

It is also only tested in Chrome.


So, let's go:

1. Download the example twkb-file "hedmark.twkb" http://sandbox.jordogskog.no/twkbFiles/hedmark.twkb
2. Download the attribute file (only for styling) http://sandbox.jordogskog.no/twkbFiles/hedmark.csv

Note: It is important that the two files above keep the same name except for the extension

3. Go to 
