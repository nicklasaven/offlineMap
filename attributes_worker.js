
const dbName = "the_db";
var db;
var dbName;
function add_attributes(the_name, the_data)
{
	var attributeStore = db.transaction([the_name], "readwrite").objectStore(the_name);
	var n=0,i=0;
	var len=the_data.length;
	/*Warning, here comes an ugly hack. It seems like it can't handle putting all rows in que for writing to indexeDB. But is also gets extreamly slow to only start a new writing process on previous onsucess event. In this way 3 writing processs is in the que.
	 That is much easier to handle for the database than 300000 but aslo kicks a lot better than one by one.
	 IndexedDB is not an easy animal to get to know.*/
	putNext();
	putNext();
	putNext();
	    
	function putNext() 
	{
		if (i<len) 
		{
			n++;
			attributeStore.put(the_data[i++]).onsuccess = putNext;
			if(n>=20000)
			{
				postMessage({"type":"finnished","msg":i+" rows are loaded of "+len+ " , still working ...."});
				n=0;
			}
		} 
		else 
		{   // complete
			postMessage({"type":"finnished","msg":"Finnished loading "+i+" rows"});
		}
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
	var the_files = e.data.the_files;
	var next_version = e.data.next_version;
	var layers=[];
	dbName=e.data.dbName;
 
	var dbrequest = indexedDB.open(dbName,next_version++);
	postMessage({"type":"version","next_version":next_version});
	dbrequest.onerror = function(event) 
	{
		postMessage({"type":"error","msg":"Problems opening data base: " + event.target.errorCode});
	};
	dbrequest.onblocked = function(event) {
		postMessage({"type":"error","msg":"The database is blocked. Close the map if it is open"});
	};

	dbrequest.onupgradeneeded = function(event) {
		db = event.target.result;

		for (var f=0,len=the_files.length;f<len;f++)
		{
			var the_name = the_files[f].name.split(".")[0];
			layers.push({"the_name":the_name, "the_file":the_files[f]});
			if(db.objectStoreNames.contains(the_name)) 
			{
				postMessage({"type":"messege","msg":"Deleting old dataset for '"+the_name+"'"});
				db.deleteObjectStore(the_name);
			}
				
			var objectStore = db.createObjectStore(the_name, { keyPath: "gid" });  
				objectStore.transaction.oncomplete=function (e) {		
				console.log("Ok, we are here");
				}
		}	
	}
  
  	dbrequest.onsuccess = function(event) {
		for (var f=0,len=layers.length;f<len;f++)
		{
			
			  var reader = new FileReaderSync();
			theBlob=reader.readAsText(layers[f].the_file)
			processData(theBlob,layers[f].the_name);
			theBlob.delete;
			

		}
		
	};
	
	
	self.close;
	 
}, false);
