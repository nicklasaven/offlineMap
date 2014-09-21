
const dbName = "the_db";
var db;

function add_attributes(the_name, the_data)
{
var n=0;
	    // Store values in the newly created objectStore.
	    var attributeStore = db.transaction([the_name], "readwrite").objectStore(the_name);
	    for (var i=0,len =the_data.length;i<len;i++)
	    {
	      attributeStore.put(the_data[i]).onsuccess=function(e){if (++n==len) postMessage({"n":n});};
	    }
}




function processData(csv,the_name) {
	var allTextLines = csv.split(/\r\n|\n/);
	delete csv;
	var lines = [];
	var n= 0;
	var headers = allTextLines[0].split(';');
	
	for (var i=1,len=allTextLines.length; i<len; i++) 
	{
	  var data = allTextLines[i].split(';');
	      var tarr = {};
	      for (var j=0; j<data.length; j++) {
		      tarr[headers[j]]=data[j];
	      }
	      lines.push(tarr);
	}
	add_attributes(the_name,lines);
//	console.log("antal="+i);
	return ;
}





self.addEventListener('message', function(e) {
  var the_file = e.data.the_file;
  var the_name = e.data.the_name;
var dbrequest = indexedDB.open(dbName);
	dbrequest.onsuccess=function(e){
	 db = e.target.result;
	 
  // Read each file synchronously as an ArrayBuffer and
  // stash it in a global array to return to the main app.
				
   var reader = new FileReaderSync();
 processData(reader.readAsText(the_file),the_name);
		
		
	self.close;
	 }
}, false);
