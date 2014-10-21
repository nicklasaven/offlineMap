offlineMap
==========

Some code to help creating a true offline map

here is a collection of scripts to handle large files of twkb in the client through File API.

It is still a lot of bottlenecks that can be removed and some memory issues that limits possible file sizes when memory is a limit.

## How to use it

Those scripts is served from http://sandbox.jordogskog.no/offlineMap<br>
So it possible to test what it is about from there.

Those scripts is in a "testing ideas" status. That means that there is quite a lot of things that doesn't really make sense and a lot of things that only works if you do it in the right order. So, to test it you better follow the instructions.


It is also only tested in Chrome.


So, let's go, first totally without styling:

1. Download the example twkb-file "hedmark.twkb" ~46mb http://sandbox.jordogskog.no/offlineMap/twkbFiles/hedmark.twkb
   There is also am example file with all roads in Norway http://sandbox.jordogskog.no/offlineMap/twkbFiles/n50roads.twkb
2. Go to http://sandbox.jordogskog.no/offlineMap
3. Choose hedmark.twkb in the file selector in the top
4. press "Go"

What will happen now is that a spatial index is created. When that is finnished the map will be drawn by reading the geoemtries from the twkb-file

1.  Close the page with the map, otherwise the indexeddb will ba blocked and cannot be written too
2.  Download the attribute data: http://sandbox.jordogskog.no/offlineMap/twkbFiles/hedmark.csv
3.  Go to http://sandbox.jordogskog.no/offlineMap/load_attributes.htm
4.  Choose hedmark.csv and the loading will start. It is very slow

Now the data is loaded and you will get some simple styling on the map next time you open it (and loads the index again)

## To Create TWKB-files

Install the latest PostGIS trunk version. It must be at least r12908.
Then modifie the php-script in 
https://github.com/nicklasaven/offlineMap/blob/master/twkbCreate/writeTWKB.php





