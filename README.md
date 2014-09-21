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


So, let's go, first totally without styling:

1. Download the example twkb-file "hedmark.twkb" http://sandbox.jordogskog.no/offlineMap/twkbFiles/hedmark.twkb
2. Go to http://sandbox.jordogskog.no/offlineMap
3. Choose hedmark.twkb in the file selector in the top
4. press "Go"

What will happen now is that a spatial index is created. When that is finnished the map will be drawn by reading the geoemtries from the twkb-file

Next step to do the styling. The attributes that gives the styling is stored in Indexeddb. I have struggled a lot with that beast and some problems is still there.

But to try it do:

1.  Close the page with the map, otherwise the indexeddb will ba blocked and cannot be written too
2.  Download the attribute data: http://sandbox.jordogskog.no/offlineMap/twkbFiles/hedmark.csv
3.  Go to http://sandbox.jordogskog.no/offlineMap/load_attributes.htm
4.  Choose hedmark.csv and the loading will start. It is very slow, maybe 15 seconds

Now the data is loaded and you will get some simple styling on the map. But for some reason I get trouble if I go directly to the map or reload the load_attribute page. Then something goes crayzy and I have to close the page.




